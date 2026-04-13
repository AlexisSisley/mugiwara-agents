"""Shared aggregation helpers for weekly and custom-range reports."""
from datetime import date, timedelta

from django.db.models import Count
from django.db.models.functions import TruncMonth, TruncWeek

from core.models import DailyStats, Invocation, Memory, Session


PRESETS = ('last7', 'last30', 'this_month', 'last_month', 'this_quarter', 'custom')


def pick_bucket(start: date, end: date) -> str:
    """Return 'day' | 'week' | 'month' for the breakdown granularity."""
    days = (end - start).days + 1
    if days <= 60:
        return 'day'
    if days <= 365:
        return 'week'
    return 'month'


def resolve_preset(name: str, today: date | None = None) -> tuple[date, date, str]:
    """Resolve a preset name to (start, end, label). 'custom' is not handled here."""
    today = today or date.today()
    if name == 'last7':
        start = today - timedelta(days=6)
        return start, today, 'Last 7 days'
    if name == 'last30':
        start = today - timedelta(days=29)
        return start, today, 'Last 30 days'
    if name == 'this_month':
        start = today.replace(day=1)
        return start, today, f'{start.strftime("%B %Y")} (MTD)'
    if name == 'last_month':
        first_this = today.replace(day=1)
        end = first_this - timedelta(days=1)
        start = end.replace(day=1)
        return start, end, start.strftime('%B %Y')
    if name == 'this_quarter':
        q = (today.month - 1) // 3
        start = date(today.year, q * 3 + 1, 1)
        return start, today, f'Q{q + 1} {today.year} (QTD)'
    raise ValueError(f'Unknown preset: {name}')


def aggregate_range(start: date, end: date, bucket: str) -> dict:
    """Aggregate invocations / sessions / memories over [start, end] inclusive."""
    invocations = Invocation.objects.filter(
        timestamp__date__gte=start, timestamp__date__lte=end
    )
    sessions = Session.objects.filter(
        timestamp__date__gte=start, timestamp__date__lte=end
    )
    memories = Memory.objects.filter(date__gte=start, date__lte=end)

    total_invocations = invocations.count()
    total_sessions = sessions.count()
    total_decisions = memories.count()

    top_agents = list(
        invocations.values('agent')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    top_projects = list(
        invocations.exclude(project='')
        .values('project')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    by_category = list(
        invocations.values('category')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    if bucket == 'day':
        breakdown = list(
            DailyStats.objects.filter(date__gte=start, date__lte=end)
            .order_by('date')
            .values('date', 'total_invocations', 'total_sessions', 'top_agent')
        )
        breakdown_label = 'Daily breakdown'
    elif bucket == 'week':
        rows = (
            invocations.annotate(b=TruncWeek('timestamp'))
            .values('b')
            .annotate(total_invocations=Count('id'))
            .order_by('b')
        )
        breakdown = [
            {'date': r['b'].date() if hasattr(r['b'], 'date') else r['b'],
             'total_invocations': r['total_invocations'],
             'total_sessions': 0, 'top_agent': ''}
            for r in rows
        ]
        breakdown_label = 'Weekly breakdown'
    else:  # month
        rows = (
            invocations.annotate(b=TruncMonth('timestamp'))
            .values('b')
            .annotate(total_invocations=Count('id'))
            .order_by('b')
        )
        breakdown = [
            {'date': r['b'].date() if hasattr(r['b'], 'date') else r['b'],
             'total_invocations': r['total_invocations'],
             'total_sessions': 0, 'top_agent': ''}
            for r in rows
        ]
        breakdown_label = 'Monthly breakdown'

    conf_dist = list(
        memories.values('confiance')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return {
        'total_invocations': total_invocations,
        'total_sessions': total_sessions,
        'total_decisions': total_decisions,
        'top_agents': top_agents,
        'top_projects': top_projects,
        'by_category': by_category,
        'daily_stats': breakdown,              # reuse existing template key
        'breakdown_label': breakdown_label,
        'conf_dist': conf_dist,
    }
