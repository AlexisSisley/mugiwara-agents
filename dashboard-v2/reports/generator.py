"""
Weekly report generator — aggregates Mugiwara activity for a given week.
Generates an HTML report file in ~/.mugiwara/reports/.
"""
from datetime import date, timedelta
from pathlib import Path

from django.db.models import Count, Max
from django.template.loader import render_to_string
from django.utils import timezone

from core.models import Invocation, Session, Memory, DailyStats, WeeklyReport


def get_week_bounds(week_start: date) -> tuple[date, date]:
    """Ensure week_start is a Monday and return (monday, sunday)."""
    # Adjust to Monday if not already
    offset = week_start.weekday()
    monday = week_start - timedelta(days=offset)
    sunday = monday + timedelta(days=6)
    return monday, sunday


def generate_weekly_report(week_start: date) -> WeeklyReport:
    """
    Generate a weekly report for the given week and save as HTML.
    Returns the WeeklyReport model instance.
    """
    monday, sunday = get_week_bounds(week_start)

    # Aggregate data
    invocations = Invocation.objects.filter(
        timestamp__date__gte=monday, timestamp__date__lte=sunday
    )
    sessions = Session.objects.filter(
        timestamp__date__gte=monday, timestamp__date__lte=sunday
    )
    memories = Memory.objects.filter(date__gte=monday, date__lte=sunday)

    total_invocations = invocations.count()
    total_sessions = sessions.count()
    total_decisions = memories.count()

    # Top agents
    top_agents = list(
        invocations.values('agent')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    # Top projects
    top_projects = list(
        invocations.exclude(project='')
        .values('project')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    # By category
    by_category = list(
        invocations.values('category')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Daily breakdown
    daily_stats = list(
        DailyStats.objects.filter(date__gte=monday, date__lte=sunday)
        .order_by('date')
        .values('date', 'total_invocations', 'total_sessions', 'top_agent')
    )

    # Confidence distribution from memory
    conf_dist = list(
        memories.values('confiance')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    context = {
        'week_start': monday,
        'week_end': sunday,
        'total_invocations': total_invocations,
        'total_sessions': total_sessions,
        'total_decisions': total_decisions,
        'top_agents': top_agents,
        'top_projects': top_projects,
        'by_category': by_category,
        'daily_stats': daily_stats,
        'conf_dist': conf_dist,
        'generated_at': timezone.now(),
    }

    # Render HTML (dashboard preview)
    html = render_to_string('reports/report_template.html', context)

    # Render email-ready HTML (table-based, inline styles, email-client compatible)
    email_html = render_to_string('reports/email_template.html', context)

    # Save to files
    reports_dir = Path.home() / '.mugiwara' / 'reports'
    reports_dir.mkdir(parents=True, exist_ok=True)

    filename = f'weekly-{monday.isoformat()}.html'
    filepath = reports_dir / filename
    filepath.write_text(html, encoding='utf-8')

    email_filename = f'weekly-{monday.isoformat()}-email.html'
    email_filepath = reports_dir / email_filename
    email_filepath.write_text(email_html, encoding='utf-8')

    # Save/update DB record
    report, _ = WeeklyReport.objects.update_or_create(
        week_start=monday,
        defaults={
            'week_end': sunday,
            'generated_at': timezone.now(),
            'html_path': str(filepath),
            'email_html_path': str(email_filepath),
            'status': 'generated',
        },
    )

    return report
