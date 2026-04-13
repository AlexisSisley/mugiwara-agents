"""Weekly report generator — thin wrapper over aggregate_range."""
from datetime import date, timedelta
from pathlib import Path

from django.template.loader import render_to_string
from django.utils import timezone

from core.models import WeeklyReport

from .aggregations import aggregate_range, pick_bucket


def get_week_bounds(week_start: date) -> tuple[date, date]:
    """Ensure week_start is a Monday and return (monday, sunday)."""
    offset = week_start.weekday()
    monday = week_start - timedelta(days=offset)
    sunday = monday + timedelta(days=6)
    return monday, sunday


def generate_weekly_report(week_start: date) -> WeeklyReport:
    """Generate a weekly report for the given week and save as HTML."""
    monday, sunday = get_week_bounds(week_start)

    agg = aggregate_range(monday, sunday, pick_bucket(monday, sunday))
    period_label = f'Week of {monday}'

    context = {
        **agg,
        # generic keys (shared with custom reports)
        'start_date': monday,
        'end_date': sunday,
        'period_label': period_label,
        # legacy keys kept for backward compat with any downstream code
        'week_start': monday,
        'week_end': sunday,
        'generated_at': timezone.now(),
    }

    html = render_to_string('reports/report_template.html', context)
    email_html = render_to_string('reports/email_template.html', context)

    reports_dir = Path.home() / '.mugiwara' / 'reports'
    reports_dir.mkdir(parents=True, exist_ok=True)

    filename = f'weekly-{monday.isoformat()}.html'
    filepath = reports_dir / filename
    filepath.write_text(html, encoding='utf-8')

    email_filename = f'weekly-{monday.isoformat()}-email.html'
    email_filepath = reports_dir / email_filename
    email_filepath.write_text(email_html, encoding='utf-8')

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
