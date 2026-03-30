"""Views for Pipelines page — reconstitute pipeline runs from invocations."""
from django.db.models import Count, Min, Max, F
from django.shortcuts import render

from core.models import Invocation


def pipeline_list(request):
    # Reconstitute pipeline runs by grouping pipeline invocations per session
    search = request.GET.get('search', '').strip()
    status_filter = request.GET.get('status', 'all')

    runs_qs = (
        Invocation.objects.filter(is_pipeline=True)
        .values('session_id')
        .annotate(
            name=Max('pipeline_detected'),
            start=Min('timestamp'),
            end=Max('timestamp'),
            step_count=Count('id'),
        )
        .order_by('-start')
    )

    if search:
        runs_qs = runs_qs.filter(pipeline_detected__icontains=search)

    runs = list(runs_qs[:50])

    # Compute duration for each run
    for run in runs:
        if run['start'] and run['end']:
            delta = run['end'] - run['start']
            run['duration_seconds'] = int(delta.total_seconds())
        else:
            run['duration_seconds'] = 0

    # Total stats
    total_runs = Invocation.objects.filter(is_pipeline=True).values('session_id').distinct().count()
    unique_pipelines = (
        Invocation.objects.filter(is_pipeline=True)
        .exclude(pipeline_detected='')
        .values('pipeline_detected').distinct().count()
    )

    filters = [
        {
            'name': 'search', 'type': 'search',
            'placeholder': 'Search pipelines...', 'value': search,
        },
    ]

    context = {
        'active_page': 'pipelines',
        'page_title': 'Pipelines',
        'runs': runs,
        'total_runs': total_runs,
        'unique_pipelines': unique_pipelines,
        'filters': filters,
    }

    if request.headers.get('HX-Request'):
        return render(request, 'pipelines/partials/_pipeline_list.html', context)

    return render(request, 'pipelines/index.html', context)


def pipeline_steps_partial(request, session_id):
    """Return the steps for a given pipeline run (inline expansion)."""
    steps = (
        Invocation.objects.filter(session_id=session_id, is_pipeline=True)
        .order_by('timestamp')
    )
    return render(request, 'pipelines/partials/_pipeline_steps.html', {
        'steps': steps,
        'session_id': session_id,
    })
