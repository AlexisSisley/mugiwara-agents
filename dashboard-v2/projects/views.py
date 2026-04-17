"""Views for Projects page — DB-backed index + Mugiwara stats + actions.

Hot path (project_list, filters, search) reads from the cached `Project` model.
Heavy filesystem scan is run by the `scan_projects` management command (or via
the rescan endpoint), not on every request.
"""
import json
import subprocess
from pathlib import Path
from urllib.parse import urlencode

from django.core.management import call_command
from django.core.paginator import Paginator
from django.db.models import Count, Max, Q
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from core.models import Invocation, Session
from core.category_detector import detect_category
from core.registry import load_registry
from .models import Project
from .scanner import DocFile
from .claude_sessions import get_claude_sessions, format_duration
from .initializer import init_project, list_presets, detect_stacks, suggest_preset, load_preset, list_all_agents, list_all_pipelines, read_current_config, diff_claude_md


PAGE_SIZE = 30


def _get_project(project_name):
    """Lookup a cached project by display name. Returns None if absent."""
    return Project.objects.filter(name=project_name).first()


def _ensure_indexed():
    """Run the scan once if the cache is empty (first launch)."""
    if not Project.objects.exists():
        call_command('scan_projects')


def _filter_projects(request):
    """Apply query filters to the Project queryset. Returns (queryset, filters_meta)."""
    qs = Project.objects.all()
    base = qs  # for unfiltered counts

    search = request.GET.get('search', '').strip()
    cat = request.GET.get('category', 'all')
    stack = request.GET.get('stack', 'all')
    git = request.GET.get('git', 'all')

    if search:
        qs = qs.filter(Q(name__icontains=search) | Q(stack__icontains=search))
    if cat != 'all':
        qs = qs.filter(category=cat)
    if stack != 'all':
        qs = qs.filter(stack=stack)

    git_filters = {
        'git': Q(has_git=True),
        'no-git': Q(has_git=False),
        'dirty': Q(is_dirty=True),
        'behind': Q(commits_behind__gt=0),
        'ahead': Q(commits_ahead__gt=0),
        'clean': Q(has_git=True, is_dirty=False, commits_ahead=0, commits_behind=0),
    }
    if git in git_filters:
        qs = qs.filter(git_filters[git])

    qs = qs.order_by('-invocations', 'name')

    # Counts on unfiltered base — single aggregate query each.
    cat_counts = dict(
        base.values_list('category').annotate(c=Count('id'))
    )
    cat_counts.setdefault('pro', 0)
    cat_counts.setdefault('poc', 0)
    cat_counts.setdefault('perso', 0)

    stack_counts = dict(
        base.exclude(stack='').values_list('stack').annotate(c=Count('id'))
    )
    git_count = base.filter(has_git=True).count()
    no_git_count = base.filter(has_git=False).count()
    total = base.count()

    stack_options = [('all', f'All stacks ({total})')]
    for s, c in sorted(stack_counts.items(), key=lambda x: -x[1]):
        stack_options.append((s, f'{s} ({c})'))

    filters = [
        {
            'name': 'search', 'type': 'search',
            'placeholder': 'Search projects...', 'value': search or '',
        },
        {
            'name': 'category', 'type': 'select', 'label': 'Category',
            'value': cat,
            'options': [
                ('all', f'All ({total})'),
                ('pro', f'Pro ({cat_counts["pro"]})'),
                ('poc', f'PoC ({cat_counts["poc"]})'),
                ('perso', f'Perso ({cat_counts["perso"]})'),
            ],
        },
        {
            'name': 'stack', 'type': 'select', 'label': 'Stack',
            'value': stack,
            'options': stack_options,
        },
        {
            'name': 'git', 'type': 'select', 'label': 'Git',
            'value': git,
            'options': [
                ('all', f'All ({total})'),
                ('git', f'Git ({git_count})'),
                ('no-git', f'No Git ({no_git_count})'),
                ('dirty', 'Dirty'),
                ('behind', 'Behind remote'),
                ('ahead', 'Ahead of remote'),
                ('clean', 'Clean & synced'),
            ],
        },
    ]

    return qs, filters, total


def _build_qs_string(request):
    """Querystring with current filters but stripped of `page` (for pagination links)."""
    params = {k: v for k, v in request.GET.items() if k != 'page' and v}
    return urlencode(params)


def project_list(request):
    """List all projects with filtering, search and pagination (DB-backed)."""
    _ensure_indexed()

    qs, filters, total_unfiltered = _filter_projects(request)

    paginator = Paginator(qs, PAGE_SIZE)
    page_obj = paginator.get_page(request.GET.get('page', 1))

    context = {
        'active_page': 'projects',
        'page_title': 'Projects',
        'projects': page_obj.object_list,
        'page_obj': page_obj,
        'qs': _build_qs_string(request),
        'total_count': paginator.count,
        'filters': filters,
    }

    if request.headers.get('HX-Request'):
        return render(request, 'projects/partials/_project_grid.html', context)

    return render(request, 'projects/index.html', context)


@csrf_exempt
@require_POST
def rescan_projects(request):
    """Run the scan command synchronously then re-render the grid (HTMX)."""
    call_command('scan_projects')
    qs, filters, _ = _filter_projects(request)
    paginator = Paginator(qs, PAGE_SIZE)
    page_obj = paginator.get_page(request.GET.get('page', 1))
    context = {
        'projects': page_obj.object_list,
        'page_obj': page_obj,
        'qs': _build_qs_string(request),
        'total_count': paginator.count,
        'filters': filters,
    }
    return render(request, 'projects/partials/_project_grid.html', context)


def _hydrate_doc_files(project):
    """Convert JSONField list[dict] back into DocFile dataclasses for templates/python access."""
    raw = project.doc_files or []
    project.doc_files = [DocFile(**d) for d in raw if isinstance(d, dict)]


def project_page(request, project_name):
    """Full-page project detail with 2-column layout, sessions, and files."""
    _ensure_indexed()
    project = _get_project(project_name)
    if not project:
        return render(request, 'projects/index.html', {
            'active_page': 'projects',
            'page_title': 'Projects',
            'projects': [],
            'total_count': 0,
            'filters': [],
        })

    _hydrate_doc_files(project)

    # Live invocation stats (cheap, indexed)
    db = (
        Invocation.objects.filter(project=project_name)
        .values('project')
        .annotate(count=Count('id'), last_used=Max('timestamp'))
        .order_by('project')
        .first()
    ) or {}
    project.invocations = db.get('count', project.invocations)
    project.last_used = db.get('last_used', project.last_used)
    # Refresh category live (cheap; reads JSON rules)
    project.category = detect_category(project=project.name, cwd=project.path)

    top_agents = list(
        Invocation.objects.filter(project=project_name)
        .values('agent')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    max_count = top_agents[0]['count'] if top_agents else 1
    for a in top_agents:
        a['width'] = min(100, int((a['count'] / max_count) * 100))

    session_count = Session.objects.filter(project=project_name).count()

    mugi_sessions = list(
        Invocation.objects.filter(project=project_name)
        .exclude(session_id='')
        .values('session_id')
        .annotate(count=Count('id'), start=Max('timestamp'))
        .order_by('-start')[:20]
    )
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

    claude_sessions = get_claude_sessions(project_name)
    claude_total_messages = sum(
        s.user_messages + s.assistant_messages for s in claude_sessions
    )

    doc_files = project.doc_files
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
        doc_categories.setdefault(df.category, []).append(df)

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
    project = _get_project(project_name)
    if not project:
        return render(request, 'components/_empty_state.html', {
            'title': 'Not found', 'message': f'Project "{project_name}" not found.',
        })

    _hydrate_doc_files(project)

    db = (
        Invocation.objects.filter(project=project_name)
        .values('project')
        .annotate(count=Count('id'), last_used=Max('timestamp'))
        .order_by('project')
        .first()
    ) or {}
    project.invocations = db.get('count', project.invocations)
    project.last_used = db.get('last_used', project.last_used)
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

    project = _get_project(project_name)
    if not project:
        return JsonResponse({'error': 'Project not found'}, status=404)

    project_root = Path(project.path)
    try:
        full_path = (project_root / file_path).resolve()
        if not str(full_path).startswith(str(project_root.resolve())):
            return JsonResponse({'error': 'Invalid path'}, status=403)
    except (ValueError, OSError):
        return JsonResponse({'error': 'Invalid path'}, status=400)

    if not full_path.is_file():
        return JsonResponse({'error': 'File not found'}, status=404)

    try:
        size = full_path.stat().st_size
    except OSError:
        return JsonResponse({'error': 'Cannot read file'}, status=500)

    if size > 500 * 1024:
        return JsonResponse({'error': 'File too large (max 500KB)'}, status=413)

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
    project = _get_project(project_name)
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
    project = _get_project(project_name)
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
def project_resume_session(request, project_name):
    """Resume a Claude Code session in a new PowerShell window."""
    project = _get_project(project_name)
    if not project:
        return JsonResponse({'error': 'Project not found'}, status=404)

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        body = {}

    session_id = body.get('session_id', '')
    if not session_id:
        return JsonResponse({'error': 'Missing session_id'}, status=400)

    try:
        subprocess.Popen(
            ['powershell', '-NoExit', '-Command',
             f'cd "{project.path}"; claude --resume {session_id}'],
            creationflags=subprocess.CREATE_NEW_CONSOLE,
        )
    except (OSError, FileNotFoundError) as e:
        return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({
        'ok': True, 'action': 'resume',
        'project': project_name, 'session_id': session_id,
    })


@csrf_exempt
@require_POST
def project_run_agent(request, project_name):
    """Open PowerShell + Claude with a specific agent/skill."""
    project = _get_project(project_name)
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
    project = _get_project(project_name)
    if not project:
        return JsonResponse({'error': 'Project not found'}, status=404)

    try:
        subprocess.Popen(['explorer', project.path])
    except (OSError, FileNotFoundError) as e:
        return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'ok': True, 'action': 'explore', 'project': project_name})


@csrf_exempt
@require_POST
def project_init_mugiwara(request, project_name):
    """Initialize or update Mugiwara config for a project."""
    project = _get_project(project_name)
    if not project:
        return JsonResponse({'error': 'Project not found'}, status=404)

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        body = {}

    preset_override = body.get('preset') or None
    custom_agents = body.get('agents')
    custom_pipelines = body.get('pipelines')
    project_path = Path(project.path)

    try:
        result = init_project(project_path, preset_override=preset_override,
                              custom_agents=custom_agents, custom_pipelines=custom_pipelines)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

    # has_mugiwara likely changed; refresh the single project row.
    project.has_mugiwara = (project_path / '.claude').exists() or (project_path / 'CLAUDE.md').exists()
    project.save(update_fields=['has_mugiwara', 'scanned_at'])

    return JsonResponse({
        'ok': True,
        'action': 'init',
        'project': project_name,
        **result,
    })


def project_init_preview(request, project_name):
    """GET — return all agents, pipelines, stacks, presets, and current config if initialized."""
    project = _get_project(project_name)
    if not project:
        return JsonResponse({'error': 'Project not found'}, status=404)

    project_path = Path(project.path)
    stacks = detect_stacks(project_path)
    current_config = read_current_config(project_path)
    is_initialized = current_config is not None

    preset_name = request.GET.get('preset') or (
        current_config['preset'] if is_initialized else suggest_preset(stacks)
    )
    preset_data = load_preset(preset_name)
    presets = list_presets()
    all_agents = list_all_agents()
    all_pipelines = list_all_pipelines()

    if is_initialized and not request.GET.get('preset'):
        active_agents = current_config['agents']
        active_pipelines = current_config['pipelines']
    else:
        active_agents = preset_data['agents']
        active_pipelines = preset_data['pipelines']

    return JsonResponse({
        'stacks': stacks,
        'suggested_preset': preset_name,
        'preset_description': preset_data['description'],
        'available_presets': presets,
        'all_agents': all_agents,
        'all_pipelines': all_pipelines,
        'active_agents': active_agents,
        'active_pipelines': active_pipelines,
        'is_initialized': is_initialized,
    })


@csrf_exempt
@require_POST
def project_init_diff(request, project_name):
    """Return current vs new CLAUDE.md section for diff preview."""
    project = _get_project(project_name)
    if not project:
        return JsonResponse({'error': 'Project not found'}, status=404)

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        body = {}

    agents = body.get('agents', [])
    pipelines = body.get('pipelines', [])
    preset = body.get('preset', 'minimal')

    result = diff_claude_md(Path(project.path), agents, pipelines, preset)
    return JsonResponse(result)
