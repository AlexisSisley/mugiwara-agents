"""Custom date-range report generator — uses shared aggregation helper."""
from datetime import date
from pathlib import Path

from django.template.loader import render_to_string
from django.utils import timezone

from core.models import CustomReport

from .aggregations import aggregate_range, pick_bucket


def generate_custom_report(
    start: date, end: date, preset: str = 'custom', label: str = ''
) -> CustomReport:
    """Generate a custom-range report, write HTML files, and persist the row."""
    if start > end:
        raise ValueError(f'start ({start}) must be <= end ({end})')

    period_label = label or f'{start} \u2192 {end}'
    agg = aggregate_range(start, end, pick_bucket(start, end))

    context = {
        **agg,
        'start_date': start,
        'end_date': end,
        'period_label': period_label,
        # legacy keys so the shared template keeps working
        'week_start': start,
        'week_end': end,
        'generated_at': timezone.now(),
    }

    html = render_to_string('reports/report_template.html', context)
    email_html = render_to_string('reports/email_template.html', context)

    report = CustomReport.objects.create(
        start_date=start,
        end_date=end,
        label=period_label,
        preset=preset,
        generated_at=timezone.now(),
        status='generated',
    )

    reports_dir = Path.home() / '.mugiwara' / 'reports'
    reports_dir.mkdir(parents=True, exist_ok=True)
    filepath = reports_dir / f'custom-{report.pk}.html'
    email_filepath = reports_dir / f'custom-{report.pk}-email.html'
    filepath.write_text(html, encoding='utf-8')
    email_filepath.write_text(email_html, encoding='utf-8')

    report.html_path = str(filepath)
    report.email_html_path = str(email_filepath)
    report.save(update_fields=['html_path', 'email_html_path'])
    return report
