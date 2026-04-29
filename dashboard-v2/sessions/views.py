# sessions/views.py
"""Views for Claude Code sessions — list, search, filter, resume."""
import subprocess
from pathlib import Path

from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from projects.claude_sessions import get_all_claude_sessions, format_duration
from projects.models import Project


def session_list(request):
    """Display all Claude Code sessions across every project."""
    search = request.GET.get('search', '').strip()
    project_filter = request.GET.get('project', '').strip()

    sessions, project_names = get_all_claude_sessions()

    # Apply filters
    if project_filter:
        sessions = [s for s in sessions if s.project_name == project_filter]
    if search:
        q = search.lower()
        sessions = [
            s for s in sessions
            if q in (s.first_user_message or '').lower()
            or q in s.project_name.lower()
            or q in s.git_branch.lower()
            or q in s.session_id.lower()
        ]

    # KPIs
    total_count = len(sessions)
    unique_projects = len({s.project_name for s in sessions})
    total_messages = sum(s.user_messages + s.assistant_messages for s in sessions)
    total_duration_ms = sum(s.duration_ms for s in sessions)

    # HTMX partial rendering
    is_htmx = request.headers.get('HX-Request') == 'true'
    template = 'sessions/partials/_session_grid.html' if is_htmx else 'sessions/session_list.html'

    context = {
        'active_page': 'sessions',
        'page_title': 'Sessions Claude',
        'sessions': sessions,
        'project_names': project_names,
        'search': search,
        'project_filter': project_filter,
        'total_count': total_count,
        'unique_projects': unique_projects,
        'total_messages': total_messages,
        'total_duration': format_duration(total_duration_ms),
    }
    return render(request, template, context)


@csrf_exempt
@require_POST
def session_resume(request, session_id: str):
    """Resume a Claude Code session by opening a new PowerShell window."""
    # Try to find the project path from the DB
    sessions, _ = get_all_claude_sessions()
    target = next((s for s in sessions if s.session_id == session_id), None)

    if not target:
        return JsonResponse({'success': False, 'error': 'Session introuvable'}, status=404)

    # Try to resolve actual project path from DB
    project_path = None
    if target.project_slug:
        match = Project.objects.filter(
            path__icontains=target.project_name
        ).first()
        if match:
            project_path = match.path

    # Build PowerShell command
    if project_path:
        escaped = project_path.replace("'", "''")
        cmd = f"start powershell -NoExit -Command \"cd '{escaped}'; claude --resume '{session_id}'\""
    else:
        cmd = f"start powershell -NoExit -Command \"claude --resume '{session_id}'\""

    try:
        subprocess.Popen(cmd, shell=True)
        return JsonResponse({
            'success': True,
            'session_id': session_id,
            'project_path': project_path,
        })
    except Exception as e:
        return JsonResponse({'success': False, 'error': str(e)}, status=500)
