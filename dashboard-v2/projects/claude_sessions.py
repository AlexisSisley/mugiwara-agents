"""
Parse Claude Code session data from ~/.claude/projects/.
Provides session history for the project detail page.
"""
import json
from datetime import datetime, timezone
from pathlib import Path
from dataclasses import dataclass, field


@dataclass
class ClaudeSession:
    """A single Claude Code session."""
    session_id: str = ''
    start_time: datetime | None = None
    duration_ms: int = 0
    user_messages: int = 0
    assistant_messages: int = 0
    git_branch: str = ''
    tools_used: list = field(default_factory=list)
    first_user_message: str = ''
    project_name: str = ''
    project_slug: str = ''


def _parse_session_file(filepath: Path) -> ClaudeSession | None:
    """Parse a .jsonl session file and extract session info."""
    session = ClaudeSession(session_id=filepath.stem)
    first_ts = None
    last_ts = None
    tools = set()
    user_count = 0
    assistant_count = 0
    first_user_msg = ''

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

                # Extract timestamp
                ts_str = entry.get('timestamp')
                if ts_str:
                    try:
                        ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                        if first_ts is None or ts < first_ts:
                            first_ts = ts
                        if last_ts is None or ts > last_ts:
                            last_ts = ts
                    except (ValueError, TypeError):
                        pass

                # Count messages
                role = entry.get('role', '')
                msg_type = entry.get('type', '')
                if role in ('human', 'user') or msg_type in ('human', 'user'):
                    user_count += 1
                    if not first_user_msg:
                        msg = entry.get('message', {})
                        content = msg.get('content', '')
                        if isinstance(content, str):
                            first_user_msg = content[:200]
                        elif isinstance(content, list):
                            for block in content:
                                if isinstance(block, dict) and block.get('type') == 'text':
                                    first_user_msg = block.get('text', '')[:200]
                                    break
                elif role == 'assistant' or msg_type == 'assistant':
                    assistant_count += 1

                # Extract tools used (embedded in assistant message content)
                if msg_type == 'assistant':
                    msg = entry.get('message', {})
                    content = msg.get('content', [])
                    if isinstance(content, list):
                        for block in content:
                            if isinstance(block, dict) and block.get('type') == 'tool_use':
                                name = block.get('name', '')
                                if name:
                                    tools.add(name)

                # Extract git branch if available
                if not session.git_branch:
                    cwd = entry.get('cwd', '')
                    if cwd:
                        # Try to get branch from entry
                        branch = entry.get('git_branch', '')
                        if branch:
                            session.git_branch = branch

    except (OSError, PermissionError):
        return None

    if user_count == 0 and assistant_count == 0:
        return None

    session.user_messages = user_count
    session.assistant_messages = assistant_count
    session.tools_used = sorted(tools)[:20]  # Limit to 20
    session.first_user_message = first_user_msg

    if first_ts:
        session.start_time = first_ts
    if first_ts and last_ts:
        session.duration_ms = int((last_ts - first_ts).total_seconds() * 1000)

    return session


def get_claude_sessions(project_name: str, limit: int = 20) -> list[ClaudeSession]:
    """
    Get Claude Code sessions for a project.
    Scans ~/.claude/projects/ for matching directories.
    """
    claude_dir = Path.home() / '.claude' / 'projects'
    if not claude_dir.exists():
        return []

    sessions = []
    try:
        for proj_dir in claude_dir.iterdir():
            if not proj_dir.is_dir():
                continue
            # Match by project name (case-insensitive, partial match)
            if project_name.lower() not in proj_dir.name.lower():
                continue

            # Find all .jsonl files in the project dir
            for session_file in sorted(proj_dir.glob('*.jsonl'), reverse=True):
                session = _parse_session_file(session_file)
                if session:
                    sessions.append(session)
                if len(sessions) >= limit:
                    break

            if len(sessions) >= limit:
                break

    except (PermissionError, OSError):
        pass

    # Sort by start time descending
    sessions.sort(
        key=lambda s: s.start_time or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return sessions[:limit]


def _slug_to_project_name(slug: str) -> str:
    """Derive a readable project name from a .claude/projects slug."""
    parts = slug.split('-')
    # Filter out common path prefixes (drive letters, Users, Documents, etc.)
    skip = {'c', 'd', 'e', 'users', 'documents', 'projet', 'projects', 'home', ''}
    meaningful = [p for p in parts if p.lower() not in skip]
    return meaningful[-1] if meaningful else slug


def get_all_claude_sessions() -> tuple[list[ClaudeSession], list[str]]:
    """
    Get ALL Claude Code sessions across every project in ~/.claude/projects/.
    Returns (sessions sorted by date desc, sorted unique project names).
    """
    claude_dir = Path.home() / '.claude' / 'projects'
    if not claude_dir.exists():
        return [], []

    all_sessions: list[ClaudeSession] = []
    project_names_set: set[str] = set()

    try:
        for proj_dir in claude_dir.iterdir():
            if not proj_dir.is_dir():
                continue

            slug = proj_dir.name
            project_name = _slug_to_project_name(slug)

            for session_file in proj_dir.glob('*.jsonl'):
                # Skip tiny files (< 100 bytes = empty/corrupt)
                try:
                    if session_file.stat().st_size < 100:
                        continue
                except OSError:
                    continue

                session = _parse_session_file(session_file)
                if session:
                    session.project_name = project_name
                    session.project_slug = slug
                    all_sessions.append(session)
                    project_names_set.add(project_name)

    except (PermissionError, OSError):
        pass

    all_sessions.sort(
        key=lambda s: s.start_time or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    return all_sessions, sorted(project_names_set)


def format_duration(ms: int) -> str:
    """Format milliseconds to human-readable duration."""
    if ms <= 0:
        return '-'
    seconds = ms // 1000
    if seconds < 60:
        return f'{seconds}s'
    minutes = seconds // 60
    if minutes < 60:
        return f'{minutes}min'
    hours = minutes // 60
    remaining_min = minutes % 60
    return f'{hours}h{remaining_min:02d}'
