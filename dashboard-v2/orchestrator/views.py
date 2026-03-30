"""Views for Orchestrator page — routing decisions from one_piece memory."""
from django.db.models import Count
from django.shortcuts import render

from core.models import Memory


def orchestrator_index(request):
    total = Memory.objects.count()

    # Confidence distribution
    conf_dist = list(
        Memory.objects.values('confiance')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    donut_data = [
        {'label': row['confiance'] or 'unknown', 'value': row['count']}
        for row in conf_dist
    ]
    donut_colors = {
        'haute': '#10B981',
        'moyenne': '#F59E0B',
        'basse': '#EF4444',
        'unknown': '#6B7280',
    }

    # Top routed agents
    top_agents = list(
        Memory.objects.exclude(route_agent='')
        .values('route_agent')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    top_agents_chart = [
        {'label': row['route_agent'], 'value': row['count']}
        for row in top_agents
    ]

    # Top subjects/projects
    top_projects = list(
        Memory.objects.exclude(projet='')
        .values('projet')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    # Decision table
    search = request.GET.get('search', '').strip()
    conf_filter = request.GET.get('confiance', 'all')

    decisions = Memory.objects.all()
    if search:
        decisions = decisions.filter(demande__icontains=search)
    if conf_filter != 'all':
        decisions = decisions.filter(confiance=conf_filter)
    decisions = decisions.order_by('-date')[:50]

    filters = [
        {
            'name': 'search', 'type': 'search',
            'placeholder': 'Search decisions...', 'value': search,
        },
        {
            'name': 'confiance', 'type': 'select', 'label': 'Confidence',
            'value': conf_filter,
            'options': [
                ('all', 'All'),
                ('haute', 'Haute'),
                ('moyenne', 'Moyenne'),
                ('basse', 'Basse'),
            ],
        },
    ]

    context = {
        'active_page': 'orchestrator',
        'page_title': 'Orchestrator',
        'total_decisions': total,
        'donut_data': donut_data,
        'donut_colors': donut_colors,
        'top_agents_chart': top_agents_chart,
        'top_projects': top_projects,
        'decisions': decisions,
        'filters': filters,
    }

    if request.headers.get('HX-Request'):
        return render(request, 'orchestrator/partials/_decisions_table.html', context)

    return render(request, 'orchestrator/index.html', context)


def decision_detail(request, pk):
    """Drawer partial for a single decision."""
    try:
        decision = Memory.objects.get(pk=pk)
    except Memory.DoesNotExist:
        return render(request, 'components/_empty_state.html', {
            'title': 'Not found', 'message': 'Decision not found.'
        })
    return render(request, 'orchestrator/partials/_decision_detail.html', {
        'decision': decision,
    })
