"""
Parse Claude Code JSONL session files for token usage data.

Scans ~/.claude/projects/ for all project directories.
Extracts type:assistant entries that contain message.usage.
"""
import json
import logging
import re
import socket
import time
from datetime import datetime
from pathlib import Path

from .pricing import calculate_cost

logger = logging.getLogger(__name__)


def _encode_name(name: str) -> str:
    """Encode a directory name the same way Claude Code does (non-alnum -> -)."""
    return re.sub(r'[^a-zA-Z0-9]', '-', name)


def _resolve_against_filesystem(
    encoded_parts: list[str],
    base_path: Path,
    project_root: Path | None = None,
) -> str:
    """
    Resolve encoded path parts against the real filesystem.

    Claude Code encodes paths by replacing all non-alphanumeric characters
    with '-'. This makes hyphens, underscores, spaces, and dots all look
    the same. We resolve ambiguity by matching against actual directory
    names on disk.

    Returns a display name like 'flutter/eco_scoring_rse' when the project
    is nested inside an organizational folder (e.g. flutter/, Dev/, etude/).
    """
    if not encoded_parts or not base_path.is_dir():
        return '-'.join(encoded_parts) if encoded_parts else base_path.name

    if project_root is None:
        project_root = base_path

    # List actual child directories and their encoded forms
    try:
        children = sorted(base_path.iterdir())
    except OSError:
        return '-'.join(encoded_parts)

    for child in children:
        if not child.is_dir() or child.name.startswith('.'):
            continue

        encoded_child = _encode_name(child.name)
        child_parts = [p for p in encoded_child.split('-') if p]

        n = len(child_parts)
        if n == 0:
            continue

        # Case-insensitive match of the first N parts
        if (len(encoded_parts) >= n
                and [p.lower() for p in encoded_parts[:n]]
                == [p.lower() for p in child_parts]):
            remaining = encoded_parts[n:]
            if not remaining:
                # Exact match — this child IS the project
                # Include parent folder for nested projects
                try:
                    rel = child.relative_to(project_root)
                    if len(rel.parts) > 1:
                        return str(rel).replace('\\', '/')
                except ValueError:
                    pass
                return child.name
            else:
                # Recurse into the child
                return _resolve_against_filesystem(
                    remaining, child, project_root,
                )

    # No filesystem match — return encoded form as-is
    return '-'.join(encoded_parts)


def _derive_project_name(dir_name: str) -> str:
    """
    Derive human-readable project name from Claude's encoded directory name.

    Claude Code encodes full paths like:
      C:\\Users\\alexis.bourdon\\Documents\\Projet\\flutter\\eco_scoring_rse
    as:
      c--Users-alexis-bourdon-Documents-Projet-flutter-eco-scoring-rse

    We strip the known home prefix, then resolve the remainder against the
    actual filesystem to recover the real directory name.
    """
    # Strip worktree suffix (--claude-worktrees-*)
    wt_idx = dir_name.find('--claude-worktrees')
    if wt_idx > 0:
        dir_name = dir_name[:wt_idx]

    # Encode the home directory to build a prefix to strip
    home = Path.home()
    home_encoded = _encode_name(str(home)).strip('-')

    # Strip drive + home prefix  (case-insensitive)
    # Encoded form starts with e.g. "C--Users-alexis-bourdon"
    lower_name = dir_name.lower()
    lower_home = home_encoded.lower()

    # Find home prefix in the encoded dir name
    idx = lower_name.find(lower_home)
    if idx != -1:
        remainder = dir_name[idx + len(home_encoded):]
        remainder = remainder.lstrip('-')
        base_path = home
    else:
        # Fallback: strip drive letter prefix (X--)
        if len(dir_name) > 2 and dir_name[1:3] == '--':
            remainder = dir_name[3:]
        else:
            remainder = dir_name
        base_path = Path('/')

    if not remainder:
        return home.name

    # Split remainder into parts
    parts = [p for p in remainder.split('-') if p]
    if not parts:
        return dir_name

    # Try to skip known organizational prefixes to set the project root
    # deeper (e.g. Documents/Projet/ instead of home/)
    # This way, nested projects show "flutter/eco_scoring_rse" not
    # "Documents/Projet/flutter/eco_scoring_rse"
    known_prefixes = [
        ['Documents', 'Projet'],
        ['Documents', 'Perso'],
    ]
    project_root = base_path
    remaining_parts = parts

    for prefix_segments in known_prefixes:
        encoded_prefix = []
        for seg in prefix_segments:
            encoded_prefix.extend(
                p for p in _encode_name(seg).split('-') if p
            )
        n = len(encoded_prefix)
        if (len(remaining_parts) > n
                and [p.lower() for p in remaining_parts[:n]]
                == [p.lower() for p in encoded_prefix]):
            # Advance base_path and strip prefix
            for seg in prefix_segments:
                project_root = project_root / seg
            remaining_parts = remaining_parts[n:]
            break

    if not remaining_parts:
        return project_root.name

    return _resolve_against_filesystem(
        remaining_parts, project_root, project_root,
    )


def _detect_subagent_info(filepath: Path) -> tuple[bool, str]:
    """
    Detect if a JSONL file is a subagent log and extract parent session ID.

    Returns:
        (is_subagent, parent_session_id)
    """
    parts = filepath.parts
    # Look for 'subagents' in the path
    # Structure: .../<project>/<session-uuid>/subagents/agent-xxx.jsonl
    try:
        sa_idx = parts.index('subagents')
    except ValueError:
        return False, ''

    # parent_session_id is the directory just before 'subagents'
    if sa_idx > 0:
        return True, parts[sa_idx - 1]
    return False, ''


def _parse_session_file(
    filepath: Path,
    project_name: str,
    *,
    is_subagent: bool = False,
    parent_session_id: str = '',
    machine: str = '',
) -> list[dict]:
    """
    Parse a single .jsonl session file.
    Returns list of dicts ready for TokenUsage model creation.
    """
    records = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                # Only process assistant messages with usage data
                if entry.get('type') != 'assistant':
                    continue

                msg = entry.get('message', {})
                usage = msg.get('usage')
                if not usage:
                    continue

                message_id = msg.get('id', '')
                if not message_id:
                    continue

                session_id = entry.get('sessionId', '')
                model_name = msg.get('model', '')

                # Parse timestamp
                ts_str = entry.get('timestamp', '')
                try:
                    timestamp = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    continue

                input_tokens = usage.get('input_tokens', 0) or 0
                output_tokens = usage.get('output_tokens', 0) or 0
                cache_creation = usage.get('cache_creation_input_tokens', 0) or 0
                cache_read = usage.get('cache_read_input_tokens', 0) or 0

                cost = calculate_cost(
                    model_name,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    cache_creation_tokens=cache_creation,
                    cache_read_tokens=cache_read,
                )

                records.append({
                    'message_id': message_id,
                    'session_id': session_id,
                    'timestamp': timestamp,
                    'model': model_name,
                    'project': project_name,
                    'input_tokens': input_tokens,
                    'output_tokens': output_tokens,
                    'cache_creation_tokens': cache_creation,
                    'cache_read_tokens': cache_read,
                    'cost': cost,
                    'is_subagent': is_subagent,
                    'parent_session_id': parent_session_id,
                    'machine': machine,
                })

    except (OSError, PermissionError) as e:
        logger.warning('Error reading %s: %s', filepath, e)

    return records


def scan_all_sessions(recent_days: int | None = None) -> list[dict]:
    """
    Scan all Claude Code session files and return token usage records.

    Args:
        recent_days: If set, only scan files modified within the last N days.

    Returns:
        List of dicts with keys matching TokenUsage model fields.
    """
    claude_dir = Path.home() / '.claude' / 'projects'
    if not claude_dir.exists():
        logger.info('Claude projects directory not found: %s', claude_dir)
        return []

    cutoff_time = None
    if recent_days:
        cutoff_time = time.time() - (recent_days * 86400)

    all_records = []
    project_count = 0
    file_count = 0
    hostname = socket.gethostname()

    try:
        for proj_dir in claude_dir.iterdir():
            if not proj_dir.is_dir():
                continue

            project_name = _derive_project_name(proj_dir.name)
            project_count += 1

            for session_file in proj_dir.rglob('*.jsonl'):
                # Skip old files if --recent mode
                if cutoff_time:
                    try:
                        mtime = session_file.stat().st_mtime
                        if mtime < cutoff_time:
                            continue
                    except OSError:
                        continue

                file_count += 1
                is_subagent, parent_session_id = _detect_subagent_info(
                    session_file,
                )
                records = _parse_session_file(
                    session_file,
                    project_name,
                    is_subagent=is_subagent,
                    parent_session_id=parent_session_id,
                    machine=hostname,
                )
                all_records.extend(records)

    except (PermissionError, OSError) as e:
        logger.error('Error scanning claude dir: %s', e)

    logger.info(
        'Scanned %d projects, %d files, found %d token records',
        project_count, file_count, len(all_records),
    )
    return all_records
