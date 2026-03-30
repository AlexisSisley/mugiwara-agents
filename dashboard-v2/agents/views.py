"""Views for Overview and Crew pages."""
from datetime import timedelta

from django.db.models import Count, Max
from django.db.models.functions import ExtractHour, ExtractWeekDay
from django.shortcuts import render
from django.utils import timezone

from core.models import Invocation, Session, DailyStats
from core.registry import load_registry


# ---------------------------------------------------------------------------
#  Overview (home page)
# ---------------------------------------------------------------------------

def overview(request):
    now = timezone.now()
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    # KPI cards
    total_invocations = Invocation.objects.count()
    total_sessions = Session.objects.count()
    unique_agents = Invocation.objects.values('agent').distinct().count()
    active_projects = (
        Invocation.objects.exclude(project='')
        .values('project').distinct().count()
    )

    # 7-day change for invocations
    recent_inv = Invocation.objects.filter(timestamp__gte=seven_days_ago).count()
    prev_inv = Invocation.objects.filter(
        timestamp__gte=seven_days_ago - timedelta(days=7),
        timestamp__lt=seven_days_ago,
    ).count()
    inv_change = _pct_change(recent_inv, prev_inv)

    # Sparkline data (last 7 days from daily_stats)
    sparkline_raw = list(
        DailyStats.objects.filter(date__gte=seven_days_ago.date())
        .order_by('date')
        .values_list('date', 'total_invocations', 'total_sessions')
    )
    sparkline_invocations = [
        {'date': str(row[0]), 'value': row[1]} for row in sparkline_raw
    ]
    sparkline_sessions = [
        {'date': str(row[0]), 'value': row[2]} for row in sparkline_raw
    ]

    # Heatmap data (day-of-week x hour-of-day)
    heatmap_raw = list(
        Invocation.objects.filter(timestamp__gte=thirty_days_ago)
        .annotate(
            hour=ExtractHour('timestamp'),
            dow=ExtractWeekDay('timestamp'),
        )
        .values('hour', 'dow')
        .annotate(count=Count('id'))
        .order_by('dow', 'hour')
    )
    heatmap_data = [
        {'dow': row['dow'], 'hour': row['hour'], 'count': row['count']}
        for row in heatmap_raw
    ]

    # Activity feed (latest 20)
    feed = Invocation.objects.order_by('-timestamp')[:20]

    context = {
        'active_page': 'overview',
        'page_title': 'Overview',
        'total_invocations': total_invocations,
        'total_sessions': total_sessions,
        'unique_agents': unique_agents,
        'active_projects': active_projects,
        'inv_change': inv_change,
        'sparkline_invocations': sparkline_invocations,
        'sparkline_sessions': sparkline_sessions,
        'heatmap_data': heatmap_data,
        'feed': feed,
    }
    return render(request, 'agents/overview.html', context)


# ---------------------------------------------------------------------------
#  Activity feed partial (HTMX pagination)
# ---------------------------------------------------------------------------

def activity_feed_partial(request):
    page = int(request.GET.get('page', 1))
    per_page = 20
    offset = (page - 1) * per_page
    feed = Invocation.objects.order_by('-timestamp')[offset:offset + per_page]
    has_next = Invocation.objects.count() > offset + per_page
    return render(request, 'agents/partials/_activity_feed.html', {
        'feed': feed,
        'page': page,
        'has_next': has_next,
    })


# ---------------------------------------------------------------------------
#  Crew — Agent list with registry merge
# ---------------------------------------------------------------------------

def crew_list(request):
    registry = load_registry()

    # DB stats per agent
    agent_stats_raw = list(
        Invocation.objects.values('agent')
        .annotate(count=Count('id'), last_used=Max('timestamp'))
    )
    stats_map = {row['agent']: row for row in agent_stats_raw}

    # Merge registry + DB stats
    agents = []
    for name, meta in registry.items():
        db = stats_map.get(name, {})
        agents.append({
            'name': name,
            'description': meta['description'],
            'category': meta['category'],
            'role': meta['role'],
            'version': meta['version'],
            'elevated': meta['elevated'],
            'alias_of': meta['alias_of'],
            'invocations': db.get('count', 0),
            'last_used': db.get('last_used'),
        })

    # Filtering
    search = request.GET.get('search', '').strip().lower()
    type_filter = request.GET.get('type', 'all')
    sort_by = request.GET.get('sort', 'name')

    if search:
        agents = [a for a in agents
                  if search in a['name'].lower() or search in a['description'].lower()]
    if type_filter != 'all':
        agents = [a for a in agents if a['role'] == type_filter]

    # Sorting
    if sort_by == 'invocations':
        agents.sort(key=lambda a: a['invocations'], reverse=True)
    elif sort_by == 'lastUsed':
        agents.sort(key=lambda a: (a['last_used'] or timezone.datetime.min.replace(tzinfo=timezone.utc)), reverse=True)
    else:
        agents.sort(key=lambda a: a['name'])

    # Filter definitions for template
    filters = [
        {
            'name': 'search', 'type': 'search',
            'placeholder': 'Search agents...', 'value': search,
        },
        {
            'name': 'type', 'type': 'select', 'label': 'Type',
            'value': type_filter,
            'options': [
                ('all', 'All types'),
                ('agent', 'Agents'),
                ('pipeline', 'Pipelines'),
                ('alias', 'Aliases'),
            ],
        },
        {
            'name': 'sort', 'type': 'select', 'label': 'Sort by',
            'value': sort_by,
            'options': [
                ('name', 'Name'),
                ('invocations', 'Most used'),
                ('lastUsed', 'Recently used'),
            ],
        },
    ]

    context = {
        'active_page': 'crew',
        'page_title': 'Crew',
        'agents': agents,
        'filters': filters,
        'total_count': len(agents),
    }

    # HTMX partial response
    if request.headers.get('HX-Request'):
        return render(request, 'agents/partials/_crew_grid.html', context)

    return render(request, 'agents/crew.html', context)


# ---------------------------------------------------------------------------
#  Crew detail (drawer partial via HTMX)
# ---------------------------------------------------------------------------

def crew_detail_partial(request, agent_name):
    registry = load_registry()
    meta = registry.get(agent_name, {
        'name': agent_name, 'description': '', 'category': '',
        'role': 'agent', 'version': '', 'elevated': False, 'alias_of': '',
    })

    # Agent stats
    total = Invocation.objects.filter(agent=agent_name).count()
    last_used = (
        Invocation.objects.filter(agent=agent_name)
        .order_by('-timestamp').values_list('timestamp', flat=True).first()
    )

    # Top projects for this agent
    top_projects = list(
        Invocation.objects.filter(agent=agent_name)
        .exclude(project='')
        .values('project')
        .annotate(count=Count('id'))
        .order_by('-count')[:5]
    )

    # Recent calls
    recent_calls = Invocation.objects.filter(agent=agent_name).order_by('-timestamp')[:10]

    return render(request, 'agents/partials/_crew_detail.html', {
        'agent': meta,
        'total_invocations': total,
        'last_used': last_used,
        'top_projects': top_projects,
        'recent_calls': recent_calls,
    })


# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------

def _pct_change(current, previous):
    """Return a formatted percentage change string."""
    if previous == 0:
        if current > 0:
            return {'value': '+100%', 'trend': 'up'}
        return {'value': '0%', 'trend': 'flat'}
    change = ((current - previous) / previous) * 100
    if change > 0:
        return {'value': f'+{change:.0f}%', 'trend': 'up'}
    elif change < 0:
        return {'value': f'{change:.0f}%', 'trend': 'down'}
    return {'value': '0%', 'trend': 'flat'}
