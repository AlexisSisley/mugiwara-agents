"""Views for Reports page — list, generate, and view weekly reports."""
from datetime import date, timedelta
from pathlib import Path

from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from django.utils import timezone

from django.db.models import Count, Sum, F

from core.models import WeeklyReport, Invocation, Session, Memory
from tokens.models import TokenUsage
from .generator import generate_weekly_report


def report_list(request):
    reports = WeeklyReport.objects.all()[:20]

    context = {
        'active_page': 'reports',
        'page_title': 'Reports',
        'reports': reports,
    }
    return render(request, 'reports/index.html', context)


def report_detail(request, pk):
    """Drawer partial — show report HTML preview."""
    try:
        report = WeeklyReport.objects.get(pk=pk)
    except WeeklyReport.DoesNotExist:
        return render(request, 'components/_empty_state.html', {
            'title': 'Not found', 'message': 'Report not found.'
        })

    # Read HTML from file if it exists
    html_content = ''
    if report.html_path:
        p = Path(report.html_path)
        if p.exists():
            html_content = p.read_text(encoding='utf-8')

    return render(request, 'reports/partials/_report_detail.html', {
        'report': report,
        'html_content': html_content,
    })


def report_detail_page(request, pk):
    """Full-screen detail page for a weekly report."""
    try:
        report = WeeklyReport.objects.get(pk=pk)
    except WeeklyReport.DoesNotExist:
        return render(request, 'components/_empty_state.html', {
            'title': 'Not found', 'message': 'Report not found.'
        })

    monday = report.week_start
    sunday = report.week_end
    category = request.GET.get('category', '')

    # Base querysets filtered by week
    inv_qs = Invocation.objects.filter(
        timestamp__date__gte=monday, timestamp__date__lte=sunday
    )
    sess_qs = Session.objects.filter(
        timestamp__date__gte=monday, timestamp__date__lte=sunday
    )
    token_qs = TokenUsage.objects.filter(
        timestamp__date__gte=monday, timestamp__date__lte=sunday
    )
    mem_qs = Memory.objects.filter(date__gte=monday, date__lte=sunday)

    # Apply category filter
    if category:
        inv_qs = inv_qs.filter(category=category)
        sess_qs = sess_qs.filter(category=category)
        mem_qs = mem_qs.filter(category=category)
        filtered_session_ids = list(
            sess_qs.values_list('session_id', flat=True)
        )
        token_qs = token_qs.filter(session_id__in=filtered_session_ids)

    # KPIs
    total_sessions = sess_qs.count()
    total_invocations = inv_qs.count()

    token_agg = token_qs.aggregate(
        total_tokens=Sum(
            F('input_tokens') + F('output_tokens')
            + F('cache_creation_tokens') + F('cache_read_tokens')
        ),
        total_cost=Sum('cost'),
        total_cache_read=Sum('cache_read_tokens'),
        total_input=Sum('input_tokens'),
    )
    total_tokens = token_agg['total_tokens'] or 0
    total_cost = token_agg['total_cost'] or 0
    total_cache_read = token_agg['total_cache_read'] or 0
    total_input = token_agg['total_input'] or 0

    unique_agents = inv_qs.values('agent').distinct().count()

    cache_denom = total_cache_read + total_input
    cache_hit_rate = (total_cache_read / cache_denom * 100) if cache_denom > 0 else 0

    # Top agents with bar widths
    top_agents = list(
        inv_qs.values('agent')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    max_agent_count = top_agents[0]['count'] if top_agents else 1
    for agent in top_agents:
        agent['width'] = round(agent['count'] / max_agent_count * 100)

    # Top projects
    top_projects = list(
        inv_qs.exclude(project='')
        .values('project')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    # Subjects from Memory
    subjects = list(
        mem_qs.exclude(sujet='')
        .values_list('sujet', flat=True)[:15]
    )

    context = {
        'active_page': 'reports',
        'page_title': f'Report — {monday}',
        'report': report,
        'monday': monday,
        'sunday': sunday,
        'category': category,
        'total_sessions': total_sessions,
        'total_invocations': total_invocations,
        'total_tokens': total_tokens,
        'total_cost': total_cost,
        'unique_agents': unique_agents,
        'cache_hit_rate': cache_hit_rate,
        'top_agents': top_agents,
        'top_projects': top_projects,
        'subjects': subjects,
    }
    return render(request, 'reports/detail.html', context)


def report_sessions(request, pk):
    """HTMX partial — sessions table for a weekly report."""
    try:
        report = WeeklyReport.objects.get(pk=pk)
    except WeeklyReport.DoesNotExist:
        return render(request, 'components/_empty_state.html', {
            'title': 'Not found', 'message': 'Report not found.'
        })

    monday = report.week_start
    sunday = report.week_end
    category = request.GET.get('category', '')

    token_qs = TokenUsage.objects.filter(
        timestamp__date__gte=monday, timestamp__date__lte=sunday
    )

    if category:
        filtered_session_ids = list(
            Session.objects.filter(
                timestamp__date__gte=monday, timestamp__date__lte=sunday,
                category=category,
            ).values_list('session_id', flat=True)
        )
        token_qs = token_qs.filter(session_id__in=filtered_session_ids)

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

    # Aggregate by session
    from django.db.models import Min, Max
    sessions_qs = (
        token_qs.values('session_id', 'project')
        .annotate(
            total_cost=Sum('cost'),
            total_tokens=Sum(
                F('input_tokens') + F('output_tokens')
                + F('cache_creation_tokens') + F('cache_read_tokens')
            ),
            msg_count=Count('id'),
            first_ts=Min('timestamp'),
            dominant_model=Max('model'),
        )
        .order_by(db_sort)
    )

    # Pagination
    page = int(request.GET.get('page', 1))
    per_page = 20
    total_sessions = sessions_qs.count()
    total_pages = max(1, (total_sessions + per_page - 1) // per_page)
    page = max(1, min(page, total_pages))
    offset = (page - 1) * per_page
    sessions = list(sessions_qs[offset:offset + per_page])

    # Fetch first prompt for each session
    for s in sessions:
        first_prompt = (
            Invocation.objects
            .filter(session_id=s['session_id'])
            .exclude(args_preview='')
            .order_by('timestamp')
            .values_list('args_preview', flat=True)
            .first()
        )
        s['first_prompt'] = first_prompt or ''

        sess_obj = Session.objects.filter(session_id=s['session_id']).first()
        s['category'] = sess_obj.category if sess_obj else ''

    context = {
        'report': report,
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
        'category': category,
    }
    return render(request, 'reports/partials/_report_sessions.html', context)


def report_email_html(request, pk):
    """Return raw email HTML for clipboard copy."""
    try:
        report = WeeklyReport.objects.get(pk=pk)
    except WeeklyReport.DoesNotExist:
        return JsonResponse({'error': 'Report not found'}, status=404)

    email_html = ''
    if report.email_html_path:
        p = Path(report.email_html_path)
        if p.exists():
            email_html = p.read_text(encoding='utf-8')

    if not email_html:
        # Fallback: use the standard HTML report if email version not available
        if report.html_path:
            p = Path(report.html_path)
            if p.exists():
                email_html = p.read_text(encoding='utf-8')

    if not email_html:
        return JsonResponse({'error': 'No HTML content available'}, status=404)

    return JsonResponse({'html': email_html})


@csrf_exempt
def report_generate(request):
    """Generate a report for the current or specified week."""
    if request.method == 'POST':
        week_str = request.POST.get('week_start', '')
        if week_str:
            try:
                week_start = date.fromisoformat(week_str)
            except ValueError:
                week_start = _current_week_monday()
        else:
            week_start = _current_week_monday()

        try:
            report = generate_weekly_report(week_start)
            messages.success(request, f'Report generated for week of {report.week_start}')
        except Exception as e:
            messages.error(request, f'Error generating report: {e}')

    return redirect('report_list')


def _current_week_monday():
    today = date.today()
    return today - timedelta(days=today.weekday())
