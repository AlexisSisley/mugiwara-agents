"""
Parse Claude Code JSONL session files for token usage data.

Scans ~/.claude/projects/ for all project directories.
Extracts type:assistant entries that contain message.usage.
"""
import json
import logging
import time
from datetime import datetime
from pathlib import Path

from .pricing import calculate_cost

logger = logging.getLogger(__name__)


def _derive_project_name(dir_name: str) -> str:
    """
    Derive project name from encoded directory name.
    Example: 'C--Users-alexis-mugiwara-agents' -> 'mugiwara-agents'
    """
    # Replace -- with path separator, then take last segment
    decoded = dir_name.replace('-', '/')
    # Get the last meaningful segment
    parts = [p for p in decoded.split('/') if p]
    return parts[-1] if parts else dir_name


def _parse_session_file(filepath: Path, project_name: str) -> list[dict]:
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

    try:
        for proj_dir in claude_dir.iterdir():
            if not proj_dir.is_dir():
                continue

            project_name = _derive_project_name(proj_dir.name)
            project_count += 1

            for session_file in proj_dir.glob('*.jsonl'):
                # Skip old files if --recent mode
                if cutoff_time:
                    try:
                        mtime = session_file.stat().st_mtime
                        if mtime < cutoff_time:
                            continue
                    except OSError:
                        continue

                file_count += 1
                records = _parse_session_file(session_file, project_name)
                all_records.extend(records)

    except (PermissionError, OSError) as e:
        logger.error('Error scanning claude dir: %s', e)

    logger.info(
        'Scanned %d projects, %d files, found %d token records',
        project_count, file_count, len(all_records),
    )
    return all_records
