# tokens/views.py
"""Views for Token Usage & Costs dashboard."""
from datetime import timedelta
from itertools import groupby
from operator import attrgetter

from django.db.models import Sum, Count, Min, Max, F, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import TokenUsage
from .parser import scan_all_sessions
from .pricing import get_rates


def _get_period_start(period: str):
    """Convert period string to start datetime."""
    now = timezone.now()
    mapping = {
        '7d': now - timedelta(days=7),
        '30d': now - timedelta(days=30),
        '90d': now - timedelta(days=90),
    }
    return mapping.get(period)  # None means all time


def _base_qs(request):
    """Build base queryset with period and project filters."""
    period = request.GET.get('period', '30d')
    project = request.GET.get('project', '')
    qs = TokenUsage.objects.all()

    start = _get_period_start(period)
    if start:
        qs = qs.filter(timestamp__gte=start)
    if project:
        qs = qs.filter(project=project)

    return qs, period, project


def token_index(request):
    """Main tokens page with tabs."""
    projects = (
        TokenUsage.objects.values_list('project', flat=True)
        .distinct()
        .order_by('project')
    )
    period = request.GET.get('period', '30d')
    project = request.GET.get('project', '')

    context = {
        'active_page': 'tokens',
        'page_title': 'Token Usage & Costs',
        'projects': list(projects),
        'current_period': period,
        'current_project': project,
    }
    return render(request, 'tokens/index.html', context)


def tab_costs(request):
    """HTMX partial — Costs tab."""
    qs, period, project = _base_qs(request)
    now = timezone.now()

    # KPIs
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=today_start.weekday())
    month_start = today_start.replace(day=1)

    cost_today = qs.filter(timestamp__gte=today_start).aggregate(
        s=Sum('cost'))['s'] or 0
    cost_week = qs.filter(timestamp__gte=week_start).aggregate(
        s=Sum('cost'))['s'] or 0
    cost_month = qs.filter(timestamp__gte=month_start).aggregate(
        s=Sum('cost'))['s'] or 0
    cost_total = qs.aggregate(s=Sum('cost'))['s'] or 0

    # Subagent breakdown
    sub_qs = qs.filter(is_subagent=True)
    sub_cost_today = sub_qs.filter(timestamp__gte=today_start).aggregate(
        s=Sum('cost'))['s'] or 0
    sub_cost_week = sub_qs.filter(timestamp__gte=week_start).aggregate(
        s=Sum('cost'))['s'] or 0
    sub_cost_month = sub_qs.filter(timestamp__gte=month_start).aggregate(
        s=Sum('cost'))['s'] or 0
    sub_cost_total = sub_qs.aggregate(s=Sum('cost'))['s'] or 0

    # Daily cost chart data
    daily_costs = (
        qs.annotate(date=TruncDate('timestamp'))
        .values('date')
        .annotate(total=Sum('cost'))
        .order_by('date')
    )
    daily_chart = [
        {'date': str(d['date']), 'value': round(d['total'], 2)}
        for d in daily_costs
    ]

    # Cost by model (donut)
    by_model = (
        qs.values('model')
        .annotate(total=Sum('cost'))
        .order_by('-total')
    )
    model_chart = [
        {'label': d['model'].split('-')[1] if '-' in d['model'] else d['model'],
         'value': round(d['total'], 2)}
        for d in by_model
    ]

    # Cost by project top 10 (barH)
    by_project = (
        qs.values('project')
        .annotate(total=Sum('cost'))
        .order_by('-total')[:10]
    )
    project_chart = [
        {'label': d['project'][:25], 'value': round(d['total'], 2)}
        for d in by_project
    ]

    # Period label for "Total" card
    period_labels = {'7d': '7 days', '30d': '30 days', '90d': '90 days', 'all': 'All time'}
    period_label = period_labels.get(period, period)

    context = {
        'cost_today': cost_today,
        'cost_week': cost_week,
        'cost_month': cost_month,
        'cost_total': cost_total,
        'sub_cost_today': sub_cost_today,
        'sub_cost_week': sub_cost_week,
        'sub_cost_month': sub_cost_month,
        'sub_cost_total': sub_cost_total,
        'period_label': period_label,
        'daily_chart': daily_chart,
        'model_chart': model_chart,
        'project_chart': project_chart,
        'current_period': period,
    }
    return render(request, 'tokens/partials/_tab_costs.html', context)


def tab_technical(request):
    """HTMX partial — Technical tab."""
    qs, period, project = _base_qs(request)

    agg = qs.aggregate(
        total_input=Sum('input_tokens'),
        total_output=Sum('output_tokens'),
        total_cache_creation=Sum('cache_creation_tokens'),
        total_cache_read=Sum('cache_read_tokens'),
        total_cost=Sum('cost'),
    )

    total_input = agg['total_input'] or 0
    total_output = agg['total_output'] or 0
    total_cache_creation = agg['total_cache_creation'] or 0
    total_cache_read = agg['total_cache_read'] or 0
    total_all = total_input + total_output + total_cache_creation + total_cache_read

    # Main vs Subagents split
    sub_agg = qs.filter(is_subagent=True).aggregate(
        sub_input=Sum('input_tokens'),
        sub_output=Sum('output_tokens'),
        sub_cc=Sum('cache_creation_tokens'),
        sub_cr=Sum('cache_read_tokens'),
    )
    sub_total = (
        (sub_agg['sub_input'] or 0)
        + (sub_agg['sub_output'] or 0)
        + (sub_agg['sub_cc'] or 0)
        + (sub_agg['sub_cr'] or 0)
    )
    main_total = total_all - sub_total

    subagent_split_chart = [
        {'label': 'Main', 'value': main_total},
        {'label': 'Subagents', 'value': sub_total},
    ]

    # Cache hit rate
    cache_denominator = total_cache_read + total_input
    cache_hit_rate = (total_cache_read / cache_denominator * 100) if cache_denominator > 0 else 0

    # Estimated savings: what cache reads would cost at full input rate
    savings_records = (
        qs.values('model')
        .annotate(cr=Sum('cache_read_tokens'))
    )
    estimated_savings = 0
    for r in savings_records:
        rates = get_rates(r['model'])
        cr = r['cr'] or 0
        full_cost = cr * rates['input'] / 1_000_000
        actual_cost = cr * rates['cache_read'] / 1_000_000
        estimated_savings += full_cost - actual_cost

    # Token composition donut
    composition_chart = [
        {'label': 'Input', 'value': total_input},
        {'label': 'Output', 'value': total_output},
        {'label': 'Cache Write', 'value': total_cache_creation},
        {'label': 'Cache Read', 'value': total_cache_read},
    ]

    # Cache hit rate by day sparkline
    daily_cache = (
        qs.annotate(date=TruncDate('timestamp'))
        .values('date')
        .annotate(
            cr=Sum('cache_read_tokens'),
            inp=Sum('input_tokens'),
        )
        .order_by('date')
    )
    cache_sparkline = []
    for d in daily_cache:
        cr = d['cr'] or 0
        inp = d['inp'] or 0
        denom = cr + inp
        rate = (cr / denom * 100) if denom > 0 else 0
        cache_sparkline.append({'date': str(d['date']), 'value': round(rate, 1)})

    # Tokens by model barH
    by_model = (
        qs.values('model')
        .annotate(total=Sum(F('input_tokens') + F('output_tokens')
                           + F('cache_creation_tokens') + F('cache_read_tokens')))
        .order_by('-total')
    )
    model_chart = [
        {'label': d['model'].split('-')[1] if '-' in d['model'] else d['model'],
         'value': d['total'] or 0}
        for d in by_model
    ]

    context = {
        'total_tokens': total_all,
        'cache_hit_rate': cache_hit_rate,
        'total_cache_read': total_cache_read,
        'estimated_savings': estimated_savings,
        'composition_chart': composition_chart,
        'subagent_split_chart': subagent_split_chart,
        'cache_sparkline': cache_sparkline,
        'model_chart': model_chart,
    }
    return render(request, 'tokens/partials/_tab_technical.html', context)


def tab_sessions(request):
    """HTMX partial — Sessions tab with paginated table."""
    qs, period, project = _base_qs(request)

    # Sort
    sort_field = request.GET.get('sort', 'cost')
    order = request.GET.get('order', 'desc')
    sort_map = {
        'cost': 'total_cost',
        'tokens': 'total_tokens',
        'date': 'first_ts',
        'messages': 'msg_count',
    }
    db_sort = sort_map.get(sort_field, 'total_cost')
    if order == 'desc':
        db_sort = '-' + db_sort

    # Aggregate main sessions only (subagents will be counted separately)
    main_qs = qs.filter(is_subagent=False)
    sessions_qs = (
        main_qs.values('session_id', 'project')
        .annotate(
            total_cost=Sum('cost'),
            total_tokens=Sum(F('input_tokens') + F('output_tokens')
                            + F('cache_creation_tokens') + F('cache_read_tokens')),
            msg_count=Count('id'),
            first_ts=Min('timestamp'),
            dominant_model=Max('model'),
        )
        .order_by(db_sort)
    )

    # Manual pagination
    page = int(request.GET.get('page', 1))
    per_page = 20
    total_sessions = sessions_qs.count()
    total_pages = max(1, (total_sessions + per_page - 1) // per_page)
    page = max(1, min(page, total_pages))
    offset = (page - 1) * per_page
    sessions = list(sessions_qs[offset:offset + per_page])

    # Enrich sessions with subagent data
    for s in sessions:
        sid = s['session_id']
        sub = qs.filter(is_subagent=True, parent_session_id=sid)
        sub_agg = sub.aggregate(
            sub_cost=Sum('cost'),
            sub_tokens=Sum(F('input_tokens') + F('output_tokens')
                          + F('cache_creation_tokens') + F('cache_read_tokens')),
            sub_count=Count('session_id', distinct=True),
        )
        s['sub_count'] = sub_agg['sub_count'] or 0
        s['sub_cost'] = sub_agg['sub_cost'] or 0
        s['sub_tokens'] = sub_agg['sub_tokens'] or 0
        s['total_cost_inclusive'] = s['total_cost'] + s['sub_cost']
        s['total_tokens_inclusive'] = s['total_tokens'] + s['sub_tokens']

    # Model filter options
    models_list = (
        qs.values_list('model', flat=True).distinct().order_by('model')
    )

    context = {
        'sessions': sessions,
        'page': page,
        'total_pages': total_pages,
        'total_sessions': total_sessions,
        'has_prev': page > 1,
        'has_next': page < total_pages,
        'prev_page': page - 1,
        'next_page': page + 1,
        'sort_field': sort_field,
        'sort_order': order,
        'models_list': list(models_list),
        'current_period': period,
    }
    return render(request, 'tokens/partials/_tab_sessions.html', context)


def session_detail(request, session_id):
    """Drawer content — detail of a single session with subagent breakdown."""
    # Main session messages
    main_messages = list(
        TokenUsage.objects.filter(session_id=session_id, is_subagent=False)
        .order_by('timestamp')
    )

    # Subagent messages grouped by their session_id
    sub_messages = list(
        TokenUsage.objects.filter(parent_session_id=session_id, is_subagent=True)
        .order_by('session_id', 'timestamp')
    )

    # Group subagent messages by session_id for display
    subagent_groups = []
    for sid, msgs in groupby(sub_messages, key=attrgetter('session_id')):
        msgs_list = list(msgs)
        group_cost = sum(m.cost for m in msgs_list)
        group_tokens = sum(m.total_tokens for m in msgs_list)
        subagent_groups.append({
            'session_id': sid,
            'short_id': sid[:12],
            'messages': msgs_list,
            'cost': group_cost,
            'tokens': group_tokens,
        })

    all_msgs = main_messages + sub_messages
    total_cost = sum(m.cost for m in all_msgs)
    total_tokens = sum(m.total_tokens for m in all_msgs)
    main_cost = sum(m.cost for m in main_messages)
    main_tokens = sum(m.total_tokens for m in main_messages)

    context = {
        'session_id': session_id,
        'main_messages': main_messages,
        'subagent_groups': subagent_groups,
        'subagent_count': len(subagent_groups),
        'total_cost': total_cost,
        'total_tokens': total_tokens,
        'main_cost': main_cost,
        'main_tokens': main_tokens,
    }
    return render(request, 'tokens/partials/_session_detail.html', context)


@csrf_exempt
def refresh_tokens(request):
    """POST — re-ingest token data, return HX-Trigger for tab reload."""
    if request.method == 'POST':
        records = scan_all_sessions(recent_days=7)
        if records:
            instances = [TokenUsage(**r) for r in records]
            TokenUsage.objects.bulk_create(
                instances, batch_size=500, ignore_conflicts=True,
            )

    response = HttpResponse(status=204)
    response['HX-Trigger'] = 'tokens-refreshed'
    return response


def project_summary(request, project_name):
    """HTMX partial — mini token summary for project detail page."""
    qs = TokenUsage.objects.filter(project=project_name)

    agg = qs.aggregate(
        total_cost=Sum('cost'),
        total_tokens=Sum(F('input_tokens') + F('output_tokens')
                         + F('cache_creation_tokens') + F('cache_read_tokens')),
        total_cache_read=Sum('cache_read_tokens'),
        total_input=Sum('input_tokens'),
    )

    total_cost = agg['total_cost'] or 0
    total_tokens = agg['total_tokens'] or 0
    cr = agg['total_cache_read'] or 0
    inp = agg['total_input'] or 0
    denom = cr + inp
    cache_hit_rate = (cr / denom * 100) if denom > 0 else 0

    context = {
        'project_name': project_name,
        'total_cost': total_cost,
        'total_tokens': total_tokens,
        'cache_hit_rate': cache_hit_rate,
    }
    return render(request, 'tokens/partials/_project_summary.html', context)
