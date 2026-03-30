#!/usr/bin/env python3
"""
CLI bridge: reads JSON from stdin (or args) and writes to Django ORM / SQLite.
Replaces the Node.js hook-writer.ts for writing hook data.

Usage:
    echo '{"tool_input":{"skill":"chopper","args":"debug"},"session_id":"abc"}' | python hook_writer.py invocation
    echo '{"session_id":"abc","event":"session_start"}' | python hook_writer.py session
"""
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

# Setup Django before importing models
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Add dashboard-v2 to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import django
django.setup()

from core.models import Invocation, Session, Memory, DailyStats


def ingest_invocation(data: dict) -> None:
    """Write an invocation record from hook JSON."""
    tool_input = data.get('tool_input', {})
    session_id = data.get('session_id', '')
    cwd = data.get('cwd', '')

    # Extract agent name from skill or args
    agent = (
        tool_input.get('skill', '') or
        tool_input.get('subagent_type', '') or
        tool_input.get('name', '') or
        'unknown'
    )
    args_preview = tool_input.get('args', '') or tool_input.get('prompt', '')
    if isinstance(args_preview, dict):
        args_preview = json.dumps(args_preview)[:500]
    elif isinstance(args_preview, str):
        args_preview = args_preview[:500]

    # Determine tool type
    tool = data.get('tool_name', 'Skill')

    # Extract project from cwd
    project = ''
    if cwd:
        project = Path(cwd).name

    now = datetime.now(timezone.utc)

    Invocation.objects.get_or_create(
        timestamp=now,
        session_id=session_id,
        event='agent_invocation',
        agent=agent,
        defaults={
            'tool': tool,
            'args_preview': str(args_preview),
            'project': project,
            'trigger_file': cwd,
        },
    )

    # Update daily stats
    _update_daily_stats(now.date())


def ingest_session(data: dict) -> None:
    """Write a session record from hook JSON."""
    session_id = data.get('session_id', '')
    event = data.get('event', 'session_start')

    if not session_id:
        return

    now = datetime.now(timezone.utc)

    Session.objects.get_or_create(
        session_id=session_id,
        defaults={
            'timestamp': now,
            'event': event,
            'project': data.get('project', ''),
        },
    )

    _update_daily_stats(now.date())


def _update_daily_stats(dt) -> None:
    """Upsert daily stats for the given date."""
    from django.db.models import Count

    stats, created = DailyStats.objects.get_or_create(date=dt)

    stats.total_invocations = Invocation.objects.filter(
        timestamp__date=dt
    ).count()
    stats.total_sessions = Session.objects.filter(
        timestamp__date=dt
    ).count()
    stats.unique_agents = (
        Invocation.objects.filter(timestamp__date=dt)
        .values('agent').distinct().count()
    )
    stats.unique_projects = (
        Invocation.objects.filter(timestamp__date=dt)
        .exclude(project='').values('project').distinct().count()
    )

    # Top agent for the day
    top = (
        Invocation.objects.filter(timestamp__date=dt)
        .values('agent').annotate(c=Count('id'))
        .order_by('-c').first()
    )
    stats.top_agent = top['agent'] if top else ''

    # Top project for the day
    top_proj = (
        Invocation.objects.filter(timestamp__date=dt)
        .exclude(project='').values('project')
        .annotate(c=Count('id')).order_by('-c').first()
    )
    stats.top_project = top_proj['project'] if top_proj else ''

    stats.save()


def main():
    if len(sys.argv) < 2:
        print('Usage: hook_writer.py invocation|session', file=sys.stderr)
        sys.exit(1)

    record_type = sys.argv[1]

    # Read JSON from stdin
    try:
        raw = sys.stdin.read()
        if not raw.strip():
            print('No input on stdin', file=sys.stderr)
            sys.exit(1)
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f'Invalid JSON: {e}', file=sys.stderr)
        sys.exit(1)

    if record_type == 'invocation':
        ingest_invocation(data)
    elif record_type == 'session':
        ingest_session(data)
    else:
        print(f'Unknown record type: {record_type}', file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
