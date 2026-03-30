"""Views for Reports page — list, generate, and view weekly reports."""
from datetime import date, timedelta

from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib import messages
from django.utils import timezone

from core.models import WeeklyReport
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
        from pathlib import Path
        p = Path(report.html_path)
        if p.exists():
            html_content = p.read_text(encoding='utf-8')

    return render(request, 'reports/partials/_report_detail.html', {
        'report': report,
        'html_content': html_content,
    })


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
