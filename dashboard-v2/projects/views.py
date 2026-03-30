"""Views for Projects page — filesystem scanner + Mugiwara stats + actions."""
import json
import subprocess
from pathlib import Path

from django.db.models import Count, Max
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from core.models import Invocation, Session
from core.category_detector import detect_category
from core.registry import load_registry
from .scanner import scan_projects, scan_doc_files, DocFile
from .claude_sessions import get_claude_sessions, format_duration


def project_list(request):
    """List all projects with filtering and sorting."""
    projects = scan_projects()

    # Merge with DB stats
    project_stats = {
        row['project']: row
        for row in Invocation.objects.exclude(project='')
        .values('project')
        .annotate(count=Count('id'), last_used=Max('timestamp'))
    }

    for proj in projects:
        db = project_stats.get(proj.name, {})
        proj.invocations = db.get('count', 0)
        proj.last_used = db.get('last_used')
        proj.category = detect_category(project=proj.name, cwd=proj.path)

    # Filtering
    cat_filter = request.GET.get('category', 'all')
    search = request.GET.get('search', '').strip().lower()

    all_projects = list(projects)

    if search:
        projects = [p for p in projects
                    if search in p.name.lower() or search in p.stack.lower()]
    if cat_filter != 'all':
        projects = [p for p in projects if p.category == cat_filter]

    # Sort: most used first, then alphabetical
    projects.sort(key=lambda p: (-p.invocations, p.name))

    # Category counts from unfiltered list
    cat_counts = {'pro': 0, 'poc': 0, 'perso': 0}
    for p in all_projects:
        cat_counts[p.category] = cat_counts.get(p.category, 0) + 1

    filters = [
        {
            'name': 'search', 'type': 'search',
            'placeholder': 'Search projects...', 'value': search or '',
        },
        {
            'name': 'category', 'type': 'select', 'label': 'Category',
            'value': cat_filter,
            'options': [
                ('all', f'All ({len(all_projects)})'),
                ('pro', f'Pro ({cat_counts["pro"]})'),
                ('poc', f'PoC ({cat_counts["poc"]})'),
                ('perso', f'Perso ({cat_counts["perso"]})'),
            ],
        },
    ]

    context = {
        'active_page': 'projects',
        'page_title': 'Projects',
        'projects': projects,
        'total_count': len(projects),
        'filters': filters,
    }

    if request.headers.get('HX-Request'):
        return render(request, 'projects/partials/_project_grid.html', context)

    return render(request, 'projects/index.html', context)


def project_page(request, project_name):
    """Full-page project detail with 2-column layout, sessions, and files."""
    projects = scan_projects()
    project = next((p for p in projects if p.name == project_name), None)

    if not project:
        return render(request, 'projects/index.html', {
            'active_page': 'projects',
            'page_title': 'Projects',
            'projects': [],
            'total_count': 0,
            'filters': [],
        })

    # DB stats
    db = (
        Invocation.objects.filter(project=project_name)
        .values('project')
        .annotate(count=Count('id'), last_used=Max('timestamp'))
        .order_by('project')
        .first()
    ) or {}
    project.invocations = db.get('count', 0)
    project.last_used = db.get('last_used')
    project.category = detect_category(project=project.name, cwd=project.path)

    # Top agents for this project
    top_agents = list(
        Invocation.objects.filter(project=project_name)
        .values('agent')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    # Calculate relative bar widths
    max_count = top_agents[0]['count'] if top_agents else 1
    for a in top_agents:
        a['width'] = min(100, int((a['count'] / max_count) * 100))

    # Session count
    session_count = Session.objects.filter(project=project_name).count()

    # Mugiwara sessions (grouped by session_id)
    mugi_sessions = list(
        Invocation.objects.filter(project=project_name)
        .exclude(session_id='')
        .values('session_id')
        .annotate(
            count=Count('id'),
            start=Max('timestamp'),
        )
        .order_by('-start')[:20]
    )

    # Enrich mugiwara sessions with agent list and pipeline info
    for sess in mugi_sessions:
        invocations = Invocation.objects.filter(
            session_id=sess['session_id'], project=project_name
        )
        sess['agents'] = list(
            invocations.values_list('agent', flat=True).distinct()[:8]
        )
        pipeline = invocations.filter(is_pipeline=True).values_list(
            'pipeline_detected', flat=True
        ).first()
        sess['pipeline'] = pipeline or ''

    # Claude Code sessions
    claude_sessions = get_claude_sessions(project_name)
    claude_total_messages = sum(
        s.user_messages + s.assistant_messages for s in claude_sessions
    )

    # Enriched doc files
    doc_files = project.doc_files
    # Group by category
    doc_categories = {}
    category_order = ['doc', 'sql', 'schema', 'config', 'ci', 'other']
    category_labels = {
        'doc': 'Documentation', 'sql': 'SQL', 'schema': 'Schemas',
        'config': 'Configuration', 'ci': 'CI/CD', 'other': 'Other',
    }
    category_icons = {
        'doc': '\U0001F4C4', 'sql': '\U0001F5C3', 'schema': '\U0001F9E9',
        'config': '\u2699\uFE0F', 'ci': '\U0001F680', 'other': '\U0001F4CE',
    }
    for df in doc_files:
        if df.category not in doc_categories:
            doc_categories[df.category] = []
        doc_categories[df.category].append(df)

    ordered_doc_cats = [
        {
            'key': cat,
            'label': category_labels.get(cat, cat),
            'icon': category_icons.get(cat, ''),
            'files': doc_categories[cat],
        }
        for cat in category_order
        if cat in doc_categories
    ]

    # Agent registry for agent picker
    registry = load_registry()
    agent_names = sorted(registry.keys())

    context = {
        'active_page': 'projects',
        'page_title': project.name,
        'project': project,
        'top_agents': top_agents,
        'session_count': session_count,
        'mugi_sessions': mugi_sessions,
        'claude_sessions': claude_sessions,
        'claude_total_messages': claude_total_messages,
        'doc_categories': ordered_doc_cats,
        'total_doc_files': len(doc_files),
        'agent_names': agent_names,
        'format_duration': format_duration,
    }

    return render(request, 'projects/detail.html', context)


def project_detail(request, project_name):
    """Drawer partial for project detail (kept for backward compat)."""
    projects = scan_projects()
    project = next((p for p in projects if p.name == project_name), None)

    if not project:
        return render(request, 'components/_empty_state.html', {
            'title': 'Not found', 'message': f'Project "{project_name}" not found.',
        })

    db = (
        Invocation.objects.filter(project=project_name)
        .values('project')
        .annotate(count=Count('id'), last_used=Max('timestamp'))
        .order_by('project')
        .first()
    ) or {}
    project.invocations = db.get('count', 0)
    project.last_used = db.get('last_used')
    project.category = detect_category(project=project.name, cwd=project.path)

    top_agents = list(
        Invocation.objects.filter(project=project_name)
        .values('agent')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    recent = Invocation.objects.filter(project=project_name).order_by('-timestamp')[:10]

    return render(request, 'projects/partials/_project_detail.html', {
        'project': project,
        'top_agents': top_agents,
        'recent_calls': recent,
    })


def project_file(request, project_name):
    """Serve a project file content for the file viewer."""
    file_path = request.GET.get('path', '')
    if not file_path:
        return JsonResponse({'error': 'Missing path parameter'}, status=400)

    # Find project
    projects = scan_projects()
    project = next((p for p in projects if p.name == project_name), None)
    if not project:
        return JsonResponse({'error': 'Project not found'}, status=404)

    # Resolve and validate path (prevent directory traversal)
    project_root = Path(project.path)
    try:
        full_path = (project_root / file_path).resolve()
        if not str(full_path).startswith(str(project_root.resolve())):
            return JsonResponse({'error': 'Invalid path'}, status=403)
    except (ValueError, OSError):
        return JsonResponse({'error': 'Invalid path'}, status=400)

    if not full_path.is_file():
        return JsonResponse({'error': 'File not found'}, status=404)

    # Check file size
    try:
        size = full_path.stat().st_size
    except OSError:
        return JsonResponse({'error': 'Cannot read file'}, status=500)

    if size > 500 * 1024:
        return JsonResponse({'error': 'File too large (max 500KB)'}, status=413)

    # Detect language from extension
    ext = full_path.suffix.lower()
    lang_map = {
        '.md': 'markdown', '.sql': 'sql', '.py': 'python', '.js': 'javascript',
        '.ts': 'typescript', '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
        '.toml': 'toml', '.rs': 'rust', '.go': 'go', '.rb': 'ruby',
        '.sh': 'bash', '.ps1': 'powershell', '.css': 'css', '.html': 'html',
        '.xml': 'xml', '.dart': 'dart', '.java': 'java', '.kt': 'kotlin',
        '.cs': 'csharp', '.graphql': 'graphql', '.proto': 'protobuf',
        '.prisma': 'prisma', '.env': 'env', '.txt': 'text',
    }
    language = lang_map.get(ext, 'text')

    try:
        content = full_path.read_text(encoding='utf-8', errors='replace')
    except OSError:
        return JsonResponse({'error': 'Cannot read file'}, status=500)

    return JsonResponse({
        'content': content,
        'language': language,
        'size': size,
        'path': file_path,
    })


@csrf_exempt
@require_POST
def project_open(request, project_name):
    """Open PowerShell + Claude in the project directory."""
    projects = scan_projects()
    project = next((p for p in projects if p.name == project_name), None)
    if not project:
        return JsonResponse({'error': 'Project not found'}, status=404)

    try:
        subprocess.Popen(
            ['powershell', '-NoExit', '-Command',
             f'cd "{project.path}"; claude'],
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
    except (OSError, FileNotFoundError) as e:
        return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'ok': True, 'action': 'open', 'project': project_name})


@csrf_exempt
@require_POST
def project_open_yolo(request, project_name):
    """Open PowerShell + Claude --dangerously-skip-permissions."""
    projects = scan_projects()
    project = next((p for p in projects if p.name == project_name), None)
    if not project:
        return JsonResponse({'error': 'Project not found'}, status=404)

    try:
        subprocess.Popen(
            ['powershell', '-NoExit', '-Command',
             f'cd "{project.path}"; claude --dangerously-skip-permissions'],
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
    except (OSError, FileNotFoundError) as e:
        return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'ok': True, 'action': 'yolo', 'project': project_name})


@csrf_exempt
@require_POST
def project_run_agent(request, project_name):
    """Open PowerShell + Claude with a specific agent/skill."""
    projects = scan_projects()
    project = next((p for p in projects if p.name == project_name), None)
    if not project:
        return JsonResponse({'error': 'Project not found'}, status=404)

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        body = {}

    agent = body.get('agent', '')
    message = body.get('message', '')

    if not agent:
        return JsonResponse({'error': 'Missing agent parameter'}, status=400)

    cmd = f'cd "{project.path}"; claude "/{agent}'
    if message:
        cmd += f' {message}'
    cmd += '"'

    try:
        subprocess.Popen(
            ['powershell', '-NoExit', '-Command', cmd],
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
    except (OSError, FileNotFoundError) as e:
        return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({
        'ok': True, 'action': 'run-agent',
        'project': project_name, 'agent': agent,
    })


@csrf_exempt
@require_POST
def project_explore(request, project_name):
    """Open File Explorer in the project directory."""
    projects = scan_projects()
    project = next((p for p in projects if p.name == project_name), None)
    if not project:
        return JsonResponse({'error': 'Project not found'}, status=404)

    try:
        subprocess.Popen(['explorer', project.path])
    except (OSError, FileNotFoundError) as e:
        return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'ok': True, 'action': 'explore', 'project': project_name})
