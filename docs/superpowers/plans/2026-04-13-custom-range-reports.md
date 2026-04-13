# Custom Range Reports Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add custom date-range report generation to the Reports tab, coexisting with the existing weekly reports (unchanged), with quick presets (last 7/30 days, this/last month, this quarter) plus free start/end date pickers, adaptive daily bucket (day/week/month), and shared HTML + email output.

**Architecture:** New `CustomReport` Django model + new `reports/custom_generator.py`; shared aggregation helper extracted from the existing weekly generator; existing report/email templates parameterized with a `period_label` plus generic `start_date`/`end_date` keys so both report kinds reuse them. New views mirror the weekly detail/sessions/email endpoints. The Reports index shows a unified card grid with `Weekly`/`Custom` badges.

**Tech Stack:** Python 3.13, Django 5.2, SQLite, HTMX, vanilla HTML/CSS/JS. No test framework in use — verification via `python manage.py shell`, `python manage.py check`, and live HTTP smoke tests with `urllib.request` against `runserver`.

**Spec:** `docs/superpowers/specs/2026-04-13-custom-range-reports-design.md`

---

## Working context

All Python commands below must run inside the venv:

```bash
cd dashboard-v2
source venv/Scripts/activate   # Git Bash on Windows
```

Assume the dev server is (or will be) running in the background via `python manage.py runserver` on `127.0.0.1:8000`. Django's StatReloader picks up Python changes automatically; template changes are picked up on next request.

Each task ends with a commit. Commit message scope must be one of the allowed scopes defined by the repo's commitlint config (`dashboard` is the right scope for this work).

---

## File structure

**Create:**

- `dashboard-v2/reports/aggregations.py` — pure functions: `_pick_bucket()`, `aggregate_range(start, end, bucket)`, `resolve_preset(name, today=None)`.
- `dashboard-v2/reports/custom_generator.py` — `generate_custom_report(start, end, preset, label)`.
- `dashboard-v2/core/migrations/000X_customreport.py` — auto-generated.

**Modify:**

- `dashboard-v2/core/models.py` — add `CustomReport`.
- `dashboard-v2/reports/generator.py` — refactor to call `aggregate_range`, emit unified context keys (`period_label`, `start_date`, `end_date`) while keeping existing `week_start`/`week_end` aliases.
- `dashboard-v2/reports/views.py` — add `custom_report_generate`, `custom_report_detail_page`, `custom_report_sessions`, `custom_report_email_html`; rewrite `report_list` for unified list; helper `_validate_range(start, end)`.
- `dashboard-v2/reports/urls.py` — add 4 routes under `custom/`.
- `dashboard-v2/reports/templates/reports/index.html` — preset bar + "Custom…" collapsible form + unified grid with `Weekly`/`Custom` badges and kind-aware links.
- `dashboard-v2/reports/templates/reports/report_template.html` — title/header use `period_label`; keep weekly-specific sections untouched.
- `dashboard-v2/reports/templates/reports/email_template.html` — same.
- `dashboard-v2/reports/templates/reports/detail.html` — use `period_label` + `start_date`/`end_date`.
- `dashboard-v2/reports/templates/reports/partials/_report_sessions.html` — minimal: only if it references week-specific keys; adapt if needed.

Rationale: the weekly generator and its views stay structurally the same; only the context keys are enriched so the templates can be shared. Aggregation logic becomes a standalone module used by both generators — the kind of improvement a good developer makes while working in neighboring code.

---

## Task 1: Add `CustomReport` model + migration

**Files:**
- Modify: `dashboard-v2/core/models.py`
- Create: `dashboard-v2/core/migrations/000X_customreport.py` (auto)

- [ ] **Step 1: Add the `CustomReport` class at the bottom of `core/models.py`**

Append (after the existing `WeeklyReport` definition, before end of file):

```python
class CustomReport(models.Model):
    """User-defined date-range report (coexists with WeeklyReport)."""
    start_date = models.DateField()
    end_date = models.DateField()
    label = models.CharField(max_length=120, blank=True, default='')
    preset = models.CharField(max_length=30, blank=True, default='')
    generated_at = models.DateTimeField(null=True, blank=True)
    html_path = models.CharField(max_length=500, blank=True, default='')
    email_html_path = models.CharField(max_length=500, blank=True, default='')
    status = models.CharField(max_length=50, default='generated')

    class Meta:
        db_table = 'custom_reports'
        ordering = ['-generated_at', '-start_date']
        indexes = [models.Index(fields=['start_date', 'end_date'])]

    def __str__(self):
        return f'CustomReport {self.start_date}..{self.end_date} ({self.status})'
```

- [ ] **Step 2: Generate the migration**

```bash
python manage.py makemigrations core
```

Expected stdout:

```
Migrations for 'core':
  core\migrations\000X_customreport.py
    + Create model CustomReport
```

Record the actual migration number (the `X`) — needed for the commit message.

- [ ] **Step 3: Apply the migration**

```bash
python manage.py migrate core
```

Expected: `Applying core.000X_customreport... OK`.

- [ ] **Step 4: Smoke test the model via shell**

```bash
python manage.py shell -c "from core.models import CustomReport; from datetime import date; r = CustomReport.objects.create(start_date=date(2026,1,1), end_date=date(2026,1,31), label='January 2026', preset='last_month'); print('OK', r.pk, r); r.delete()"
```

Expected stdout: `OK <pk> CustomReport 2026-01-01..2026-01-31 (generated)`.

- [ ] **Step 5: Commit**

```bash
git add dashboard-v2/core/models.py dashboard-v2/core/migrations/000X_customreport.py
git commit -m "feat(dashboard): add CustomReport model for date-range reports"
```

---

## Task 2: Extract shared aggregation helper

**Files:**
- Create: `dashboard-v2/reports/aggregations.py`
- Modify: `dashboard-v2/reports/generator.py`

The existing weekly generator inlines all aggregation. Extract it so both generators share the logic; this is where the daily/weekly/monthly bucketing lives.

- [ ] **Step 1: Create `reports/aggregations.py`**

```python
"""Shared aggregation helpers for weekly and custom-range reports."""
from calendar import monthrange
from datetime import date, timedelta

from django.db.models import Count
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek

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
```

- [ ] **Step 2: Verify it imports cleanly**

```bash
python manage.py shell -c "from reports.aggregations import aggregate_range, pick_bucket, resolve_preset; from datetime import date; print(pick_bucket(date(2026,4,1), date(2026,4,2)), pick_bucket(date(2026,1,1), date(2026,6,1)), pick_bucket(date(2024,1,1), date(2026,1,1))); print(resolve_preset('last7')); print(resolve_preset('this_month')); a = aggregate_range(date(2026,4,1), date(2026,4,13), 'day'); print('agg keys:', sorted(a.keys()))"
```

Expected: `day week month`, three tuples, then `agg keys: ['breakdown_label', 'by_category', 'conf_dist', 'daily_stats', 'top_agents', 'top_projects', 'total_decisions', 'total_invocations', 'total_sessions']`.

- [ ] **Step 3: Refactor `reports/generator.py` to use the helper**

Replace the whole body of `dashboard-v2/reports/generator.py` with:

```python
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
```

- [ ] **Step 4: Verify the weekly report still generates**

```bash
python manage.py shell -c "from reports.generator import generate_weekly_report; from datetime import date, timedelta; today = date.today(); monday = today - timedelta(days=today.weekday()); r = generate_weekly_report(monday); print('OK', r.pk, r.html_path)"
```

Expected: `OK <pk> ...weekly-YYYY-MM-DD.html` and the file should exist on disk.

- [ ] **Step 5: Django system check**

```bash
python manage.py check
```

Expected: `System check identified no issues (0 silenced).`

- [ ] **Step 6: Commit**

```bash
git add dashboard-v2/reports/aggregations.py dashboard-v2/reports/generator.py
git commit -m "refactor(dashboard): extract shared report aggregation helper"
```

---

## Task 3: Build the custom report generator

**Files:**
- Create: `dashboard-v2/reports/custom_generator.py`

- [ ] **Step 1: Create the generator**

```python
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
```

- [ ] **Step 2: Smoke test — generate via each bucket size**

```bash
python manage.py shell -c "
from reports.custom_generator import generate_custom_report
from datetime import date
r1 = generate_custom_report(date(2026,4,1), date(2026,4,10), 'custom', 'smoke-day')
r2 = generate_custom_report(date(2026,1,1), date(2026,4,1), 'custom', 'smoke-week')
r3 = generate_custom_report(date(2024,1,1), date(2026,4,1), 'custom', 'smoke-month')
print('OK', r1.pk, r2.pk, r3.pk)
from pathlib import Path
for r in (r1,r2,r3):
    print(r.pk, Path(r.html_path).exists(), Path(r.email_html_path).exists())
# clean up
r1.delete(); r2.delete(); r3.delete()
"
```

Expected: `OK <pk1> <pk2> <pk3>` followed by three lines `<pk> True True`.

- [ ] **Step 3: Commit**

```bash
git add dashboard-v2/reports/custom_generator.py
git commit -m "feat(dashboard): add custom date-range report generator"
```

---

## Task 4: Parametrize shared templates with `period_label`

**Files:**
- Modify: `dashboard-v2/reports/templates/reports/report_template.html`
- Modify: `dashboard-v2/reports/templates/reports/email_template.html`

The generated HTML files (standalone, emailed) currently hardcode "Weekly Report" and "Week of ...". Replace with `period_label` so both kinds of reports render correctly.

- [ ] **Step 1: Update `report_template.html` title + header**

In `dashboard-v2/reports/templates/reports/report_template.html`:

Replace (line ~5):
```html
<title>Mugiwara Weekly Report — {{ week_start }}</title>
```
with:
```html
<title>Mugiwara Report — {{ period_label }}</title>
```

Replace (line ~23):
```html
<h1>&#9813; Mugiwara Weekly Report</h1>
<p style="color: #94a3b8;">{{ week_start }} &mdash; {{ week_end }}</p>
```
with:
```html
<h1>&#9813; Mugiwara Report</h1>
<p style="color: #94a3b8;">{{ period_label }} &middot; {{ start_date }} &mdash; {{ end_date }}</p>
```

Also replace any `<h2>` header referencing "Daily breakdown" (grep first) with `{{ breakdown_label|default:"Breakdown" }}` if present. Run:

```bash
grep -n "Daily breakdown\|Weekly Report\|week_start\|week_end" dashboard-v2/reports/templates/reports/report_template.html
```

For each occurrence of a hardcoded "Daily breakdown" heading, replace with `{{ breakdown_label|default:"Daily breakdown" }}`. Leave table bodies alone — they iterate `daily_stats` which is already populated correctly.

- [ ] **Step 2: Update `email_template.html` the same way**

```bash
grep -n "Weekly Report\|Week of\|Daily breakdown\|week_start\|week_end" dashboard-v2/reports/templates/reports/email_template.html
```

Apply the same transforms:
- Title / subject line: use `{{ period_label }}`
- Heading: replace "Weekly Report" with "Report"
- Date strap line: `{{ period_label }} &middot; {{ start_date }} — {{ end_date }}`
- Breakdown heading: `{{ breakdown_label|default:"Daily breakdown" }}`

Leave email-specific table styles untouched.

- [ ] **Step 3: Regenerate the current week report to validate templates still render**

```bash
python manage.py shell -c "
from reports.generator import generate_weekly_report
from datetime import date, timedelta
today = date.today(); monday = today - timedelta(days=today.weekday())
r = generate_weekly_report(monday)
from pathlib import Path
print('HTML bytes:', Path(r.html_path).stat().st_size, 'Email bytes:', Path(r.email_html_path).stat().st_size)
"
```

Expected: both byte counts > 0 and no Django `TemplateSyntaxError`.

- [ ] **Step 4: Regenerate a custom report and open the output file briefly**

```bash
python manage.py shell -c "
from reports.custom_generator import generate_custom_report
from datetime import date
r = generate_custom_report(date(2026,3,1), date(2026,3,31), 'last_month', 'March 2026')
print(r.html_path)
print(open(r.html_path, 'r', encoding='utf-8').read()[:400])
r.delete()
"
```

Expected: output HTML title contains `March 2026` and no `{{ period_label }}` literal in the output.

- [ ] **Step 5: Commit**

```bash
git add dashboard-v2/reports/templates/reports/report_template.html dashboard-v2/reports/templates/reports/email_template.html
git commit -m "refactor(dashboard): share report/email templates via period_label"
```

---

## Task 5: Update `detail.html` for shared date keys

**Files:**
- Modify: `dashboard-v2/reports/templates/reports/detail.html`
- Modify: `dashboard-v2/reports/templates/reports/partials/_report_sessions.html` (only if it uses week-specific keys)

The existing `detail.html` is rendered by `report_detail_page` for weekly reports. It uses `monday`/`sunday` from the view context. We'll make it resilient so the new custom detail view can reuse it.

- [ ] **Step 1: Grep for week-specific keys**

```bash
grep -n "monday\|sunday\|week_start\|week_end" dashboard-v2/reports/templates/reports/detail.html dashboard-v2/reports/templates/reports/partials/_report_sessions.html
```

- [ ] **Step 2: Replace `{{ monday }}` / `{{ sunday }}` with `{{ start_date }}` / `{{ end_date }}` in `detail.html`**

For each match found, swap:
- `{{ monday }}` → `{{ start_date }}`
- `{{ sunday }}` → `{{ end_date }}`

If there's a title like `Report — {{ monday }}` replace with `Report — {{ period_label }}`.

- [ ] **Step 3: Ensure the weekly view still passes the generic keys**

Open `dashboard-v2/reports/views.py` and in `report_detail_page`, in the `context` dict (around the existing `'monday': monday, 'sunday': sunday,` keys) add:

```python
'start_date': monday,
'end_date': sunday,
'period_label': f'Week of {monday}',
```

Keep `monday`/`sunday` keys too so nothing else breaks.

- [ ] **Step 4: Do the same in the `_report_sessions.html` partial and/or its view**

If `grep` showed any week-specific keys in `_report_sessions.html`, replace them the same way, then add `start_date`/`end_date` to the context dict in `report_sessions` view.

If no matches, skip this step.

- [ ] **Step 5: Live smoke test — hit the weekly detail URL**

Assuming the dev server is running, and there's at least one `WeeklyReport` in DB:

```bash
python -c "
import urllib.request, os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
import sys; sys.path.insert(0, 'dashboard-v2')
django.setup()
from core.models import WeeklyReport
r = WeeklyReport.objects.first()
print('testing weekly report pk', r.pk)
body = urllib.request.urlopen(f'http://127.0.0.1:8000/reports/{r.pk}/detail/', timeout=10).read()
assert b'Week of' in body or r.week_start.isoformat().encode() in body, 'Weekly detail did not render'
print('OK', len(body), 'bytes')
"
```

Expected: `OK <N> bytes` with no assertion error.

- [ ] **Step 6: Commit**

```bash
git add dashboard-v2/reports/templates/reports/detail.html dashboard-v2/reports/templates/reports/partials/_report_sessions.html dashboard-v2/reports/views.py
git commit -m "refactor(dashboard): make detail.html use generic start_date/end_date"
```

---

## Task 6: Add custom report views + URL routes

**Files:**
- Modify: `dashboard-v2/reports/views.py`
- Modify: `dashboard-v2/reports/urls.py`

- [ ] **Step 1: Add imports + helper to `views.py`**

At the top of `dashboard-v2/reports/views.py`, update imports:

```python
from core.models import WeeklyReport, Invocation, Session, Memory, CustomReport
from .aggregations import resolve_preset
from .custom_generator import generate_custom_report
```

After the existing helpers, add:

```python
def _parse_date(raw: str):
    """Parse ISO date string or return None."""
    if not raw:
        return None
    try:
        return date.fromisoformat(raw)
    except ValueError:
        return None


def _validate_custom_range(start, end):
    """Return an error message or None."""
    if start is None or end is None:
        return 'Missing start or end date'
    if start > end:
        return 'Start date must be before end date'
    if end > date.today():
        return 'End date cannot be in the future'
    return None
```

- [ ] **Step 2: Add `custom_report_generate` view**

Append to `views.py`:

```python
@csrf_exempt
def custom_report_generate(request):
    """Generate a custom-range report from a preset or explicit start/end."""
    if request.method != 'POST':
        return redirect('report_list')

    preset = request.POST.get('preset', 'custom')

    if preset == 'custom':
        start = _parse_date(request.POST.get('start_date', ''))
        end = _parse_date(request.POST.get('end_date', ''))
        err = _validate_custom_range(start, end)
        if err:
            messages.error(request, err)
            return redirect('report_list')
        label = f'{start} \u2192 {end}'
    else:
        try:
            start, end, label = resolve_preset(preset)
        except ValueError:
            messages.error(request, f'Unknown preset: {preset}')
            return redirect('report_list')

    try:
        report = generate_custom_report(start, end, preset, label)
        messages.success(request, f'Report generated: {label}')
    except Exception as e:
        messages.error(request, f'Error generating report: {e}')

    return redirect('report_list')
```

- [ ] **Step 3: Add `custom_report_detail_page` view**

This mirrors `report_detail_page` but reads `CustomReport` and passes generic date keys. Append to `views.py`:

```python
def custom_report_detail_page(request, pk):
    """Full-screen detail page for a custom-range report."""
    try:
        report = CustomReport.objects.get(pk=pk)
    except CustomReport.DoesNotExist:
        return render(request, 'components/_empty_state.html', {
            'title': 'Not found', 'message': 'Report not found.'
        })

    start = report.start_date
    end = report.end_date
    category = request.GET.get('category', '')

    inv_qs = Invocation.objects.filter(timestamp__date__gte=start, timestamp__date__lte=end)
    sess_qs = Session.objects.filter(timestamp__date__gte=start, timestamp__date__lte=end)
    token_qs = TokenUsage.objects.filter(timestamp__date__gte=start, timestamp__date__lte=end)
    mem_qs = Memory.objects.filter(date__gte=start, date__lte=end)

    if category:
        inv_qs = inv_qs.filter(category=category)
        sess_qs = sess_qs.filter(category=category)
        mem_qs = mem_qs.filter(category=category)
        filtered_session_ids = list(sess_qs.values_list('session_id', flat=True))
        token_qs = token_qs.filter(session_id__in=filtered_session_ids)

    total_sessions = sess_qs.count()
    total_invocations = inv_qs.count()

    token_agg = token_qs.aggregate(
        total_tokens=Sum(F('input_tokens') + F('output_tokens')
                         + F('cache_creation_tokens') + F('cache_read_tokens')),
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

    top_agents = list(
        inv_qs.values('agent').annotate(count=Count('id')).order_by('-count')[:10]
    )
    max_agent_count = top_agents[0]['count'] if top_agents else 1
    for agent in top_agents:
        agent['width'] = round(agent['count'] / max_agent_count * 100)

    top_projects = list(
        inv_qs.exclude(project='').values('project')
        .annotate(count=Count('id')).order_by('-count')[:10]
    )
    subjects = list(mem_qs.exclude(sujet='').values_list('sujet', flat=True)[:15])

    context = {
        'active_page': 'reports',
        'page_title': f'Report — {report.label or start}',
        'report': report,
        'kind': 'custom',
        'start_date': start,
        'end_date': end,
        'monday': start,        # legacy alias so detail.html partials keep working
        'sunday': end,
        'period_label': report.label or f'{start} \u2192 {end}',
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
```

- [ ] **Step 4: Add `custom_report_sessions` view**

Append to `views.py`. It's a near-copy of `report_sessions` reading `CustomReport`:

```python
def custom_report_sessions(request, pk):
    """HTMX partial — sessions table for a custom report."""
    try:
        report = CustomReport.objects.get(pk=pk)
    except CustomReport.DoesNotExist:
        return render(request, 'components/_empty_state.html', {
            'title': 'Not found', 'message': 'Report not found.'
        })

    start = report.start_date
    end = report.end_date
    category = request.GET.get('category', '')

    token_qs = TokenUsage.objects.filter(timestamp__date__gte=start, timestamp__date__lte=end)
    if category:
        filtered_session_ids = list(
            Session.objects.filter(
                timestamp__date__gte=start, timestamp__date__lte=end, category=category
            ).values_list('session_id', flat=True)
        )
        token_qs = token_qs.filter(session_id__in=filtered_session_ids)

    sort_field = request.GET.get('sort', 'cost')
    order = request.GET.get('order', 'desc')
    sort_map = {
        'cost': 'total_cost', 'tokens': 'total_tokens',
        'date': 'first_ts', 'messages': 'msg_count',
    }
    db_sort = sort_map.get(sort_field, 'total_cost')
    if order == 'desc':
        db_sort = '-' + db_sort

    from django.db.models import Min, Max
    sessions_qs = (
        token_qs.values('session_id', 'project')
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

    page = int(request.GET.get('page', 1))
    per_page = 20
    total_sessions = sessions_qs.count()
    total_pages = max(1, (total_sessions + per_page - 1) // per_page)
    page = max(1, min(page, total_pages))
    offset = (page - 1) * per_page
    sessions = list(sessions_qs[offset:offset + per_page])

    for s in sessions:
        first_prompt = (
            Invocation.objects.filter(session_id=s['session_id'])
            .exclude(args_preview='').order_by('timestamp')
            .values_list('args_preview', flat=True).first()
        )
        s['first_prompt'] = first_prompt or ''
        sess_obj = Session.objects.filter(session_id=s['session_id']).first()
        s['category'] = sess_obj.category if sess_obj else ''

    context = {
        'report': report,
        'kind': 'custom',
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
```

- [ ] **Step 5: Add `custom_report_email_html` view**

```python
def custom_report_email_html(request, pk):
    """Return raw email HTML for clipboard copy (custom report)."""
    try:
        report = CustomReport.objects.get(pk=pk)
    except CustomReport.DoesNotExist:
        return JsonResponse({'error': 'Report not found'}, status=404)

    email_html = ''
    if report.email_html_path:
        p = Path(report.email_html_path)
        if p.exists():
            email_html = p.read_text(encoding='utf-8')
    if not email_html and report.html_path:
        p = Path(report.html_path)
        if p.exists():
            email_html = p.read_text(encoding='utf-8')
    if not email_html:
        return JsonResponse({'error': 'No HTML content available'}, status=404)
    return JsonResponse({'html': email_html})
```

- [ ] **Step 6: Register routes in `reports/urls.py`**

Edit `dashboard-v2/reports/urls.py` to look like:

```python
from django.urls import path
from . import views

urlpatterns = [
    path('', views.report_list, name='report_list'),
    path('generate/', views.report_generate, name='report_generate'),
    path('custom/generate/', views.custom_report_generate, name='custom_report_generate'),
    path('custom/<int:pk>/detail/', views.custom_report_detail_page, name='custom_report_detail_page'),
    path('custom/<int:pk>/sessions/', views.custom_report_sessions, name='custom_report_sessions'),
    path('custom/<int:pk>/email-html/', views.custom_report_email_html, name='custom_report_email_html'),
    path('<int:pk>/', views.report_detail, name='report_detail'),
    path('<int:pk>/detail/', views.report_detail_page, name='report_detail_page'),
    path('<int:pk>/sessions/', views.report_sessions, name='report_sessions'),
    path('<int:pk>/email-html/', views.report_email_html, name='report_email_html'),
]
```

Note: `custom/` routes are placed before `<int:pk>/` to avoid path conflicts.

- [ ] **Step 7: Live smoke test — POST each preset + detail page**

```bash
python -c "
import urllib.request, urllib.parse, os, django, sys
sys.path.insert(0, 'dashboard-v2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
django.setup()
from core.models import CustomReport
CustomReport.objects.all().delete()
for preset in ('last7','last30','this_month','last_month','this_quarter'):
    data = urllib.parse.urlencode({'preset': preset}).encode()
    req = urllib.request.Request('http://127.0.0.1:8000/reports/custom/generate/', data=data)
    urllib.request.urlopen(req, timeout=15)
print('Created:', CustomReport.objects.count(), 'custom reports')
for r in CustomReport.objects.all():
    body = urllib.request.urlopen(f'http://127.0.0.1:8000/reports/custom/{r.pk}/detail/', timeout=10).read()
    assert len(body) > 1000, f'detail too small for {r}'
    print('OK', r.preset, r.label, len(body), 'bytes')
"
```

Expected: 5 reports created, 5 detail pages render. If any fails, fix before committing.

- [ ] **Step 8: Commit**

```bash
git add dashboard-v2/reports/views.py dashboard-v2/reports/urls.py
git commit -m "feat(dashboard): custom-range report views and URLs"
```

---

## Task 7: Unified list view + presets UI + badges

**Files:**
- Modify: `dashboard-v2/reports/views.py` (`report_list`)
- Modify: `dashboard-v2/reports/templates/reports/index.html`

- [ ] **Step 1: Rewrite `report_list`**

Replace the existing `report_list` body with:

```python
def report_list(request):
    weekly = list(WeeklyReport.objects.all()[:40])
    custom = list(CustomReport.objects.all()[:40])

    items = []
    for w in weekly:
        items.append({
            'kind': 'weekly',
            'pk': w.pk,
            'title': f'Week of {w.week_start}',
            'start_date': w.week_start,
            'end_date': w.week_end,
            'status': w.status,
            'generated_at': w.generated_at,
            'detail_url_name': 'report_detail_page',
        })
    for c in custom:
        items.append({
            'kind': 'custom',
            'pk': c.pk,
            'title': c.label or f'{c.start_date} \u2192 {c.end_date}',
            'start_date': c.start_date,
            'end_date': c.end_date,
            'status': c.status,
            'generated_at': c.generated_at,
            'detail_url_name': 'custom_report_detail_page',
        })

    # Sort by generated_at desc (None last); then start_date desc as tiebreaker.
    from datetime import datetime, timezone as _tz
    def sort_key(it):
        return (it['generated_at'] or datetime.min.replace(tzinfo=_tz.utc), it['start_date'])
    items.sort(key=sort_key, reverse=True)
    items = items[:30]

    context = {
        'active_page': 'reports',
        'page_title': 'Reports',
        'items': items,
    }
    return render(request, 'reports/index.html', context)
```

- [ ] **Step 2: Rewrite `reports/templates/reports/index.html`**

Replace the entire file with:

```html
{% extends "base.html" %}
{% load static dashboard_tags %}

{% block title %}Reports{% endblock %}

{% block content %}
<div style="margin-bottom: var(--spacing-lg);">
    <p class="text-muted" style="margin-bottom: var(--spacing-sm);">
        Generate reports from Mugiwara activity data.
    </p>

    <div class="flex items-center gap-1" style="flex-wrap: wrap; gap: var(--spacing-sm);">
        <form method="post" action="{% url 'report_generate' %}" style="display:inline;">
            {% csrf_token %}
            <button type="submit" class="neon-btn">&#9889; Generate Current Week</button>
        </form>

        {% for p in presets %}
        <form method="post" action="{% url 'custom_report_generate' %}" style="display:inline;">
            {% csrf_token %}
            <input type="hidden" name="preset" value="{{ p.0 }}">
            <button type="submit" class="btn-action">{{ p.1 }}</button>
        </form>
        {% endfor %}

        <details style="display:inline-block;">
            <summary class="btn-action" style="list-style:none; cursor:pointer;">Custom&hellip;</summary>
            <form method="post" action="{% url 'custom_report_generate' %}"
                  style="display:flex; gap: var(--spacing-sm); align-items:center; margin-top: var(--spacing-sm);">
                {% csrf_token %}
                <input type="hidden" name="preset" value="custom">
                <input type="date" name="start_date" required class="glass-input" style="width: 160px;">
                <span>&rarr;</span>
                <input type="date" name="end_date" required class="glass-input" style="width: 160px;">
                <button type="submit" class="neon-btn">Generate</button>
            </form>
        </details>
    </div>
</div>

{% if items %}
<div class="card-grid">
    {% for it in items %}
    <a href="{% url it.detail_url_name it.pk %}" class="glass-card crew-card" style="text-decoration:none;color:inherit;display:block;">
        <div class="crew-card__header">
            <span class="crew-card__name">{{ it.title }}</span>
            <span class="neon-badge neon-badge--{{ it.status|badge_class }}">{{ it.status }}</span>
        </div>
        <p class="crew-card__desc">{{ it.start_date }} &mdash; {{ it.end_date }}</p>
        <div class="crew-card__footer">
            {% if it.kind == 'weekly' %}
                <span class="neon-badge neon-badge--subagent">Weekly</span>
            {% else %}
                <span class="neon-badge neon-badge--haute">Custom</span>
            {% endif %}
            {% if it.generated_at %}
                <span class="crew-card__stat">Generated {{ it.generated_at|timeago }}</span>
            {% endif %}
        </div>
    </a>
    {% endfor %}
</div>
{% else %}
{% include "components/_empty_state.html" with title="No reports yet" message="Click a preset above to create your first report." icon="empty" %}
{% endif %}
{% endblock %}
```

- [ ] **Step 3: Pass `presets` to the view context**

Back in `report_list`, extend the context:

```python
    context = {
        'active_page': 'reports',
        'page_title': 'Reports',
        'items': items,
        'presets': [
            ('last7', 'Last 7 days'),
            ('last30', 'Last 30 days'),
            ('this_month', 'This month'),
            ('last_month', 'Last month'),
            ('this_quarter', 'This quarter'),
        ],
    }
```

- [ ] **Step 4: Live smoke — list page renders with both kinds**

Ensure at least one weekly + one custom exist (from Task 6 smoke), then:

```bash
python -c "
import urllib.request
body = urllib.request.urlopen('http://127.0.0.1:8000/reports/', timeout=10).read().decode()
assert 'Weekly' in body and 'Custom' in body, 'both badges must render'
assert 'Last 7 days' in body, 'preset button must render'
print('OK list page renders', len(body), 'bytes')
"
```

Expected: `OK list page renders <N> bytes`.

- [ ] **Step 5: Live smoke — click each preset button via POST**

(Same script as Task 6 step 7, but this time with CSRF: the view is `@csrf_exempt` so no token needed. Keep the same assertions.)

- [ ] **Step 6: Live smoke — submit custom range**

```bash
python -c "
import urllib.request, urllib.parse
data = urllib.parse.urlencode({'preset':'custom','start_date':'2026-03-01','end_date':'2026-03-15'}).encode()
urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8000/reports/custom/generate/', data=data), timeout=15)
body = urllib.request.urlopen('http://127.0.0.1:8000/reports/', timeout=10).read().decode()
assert '2026-03-01' in body and '2026-03-15' in body, 'custom range must appear in list'
print('OK custom range rendered')
"
```

Expected: `OK custom range rendered`.

- [ ] **Step 7: Live smoke — invalid range shows error and does not create a row**

```bash
python -c "
import urllib.request, urllib.parse, os, django, sys
sys.path.insert(0, 'dashboard-v2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
django.setup()
from core.models import CustomReport
before = CustomReport.objects.count()
data = urllib.parse.urlencode({'preset':'custom','start_date':'2026-03-15','end_date':'2026-03-01'}).encode()
urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8000/reports/custom/generate/', data=data), timeout=15)
after = CustomReport.objects.count()
assert before == after, f'invalid range must not create row (before={before}, after={after})'
print('OK invalid range rejected')
"
```

Expected: `OK invalid range rejected`.

- [ ] **Step 8: Commit**

```bash
git add dashboard-v2/reports/views.py dashboard-v2/reports/templates/reports/index.html
git commit -m "feat(dashboard): unified report list with presets + weekly/custom badges"
```

---

## Task 8: End-to-end verification

**Files:** none modified (smoke-only).

- [ ] **Step 1: Clear existing custom reports for a clean test**

```bash
python manage.py shell -c "from core.models import CustomReport; print(CustomReport.objects.all().delete())"
```

- [ ] **Step 2: Full e2e script**

```bash
python -c "
import urllib.request, urllib.parse, os, django, sys, time
sys.path.insert(0, 'dashboard-v2')
os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings')
django.setup()
from core.models import CustomReport, WeeklyReport

# 1. Each preset creates one report
for preset in ('last7','last30','this_month','last_month','this_quarter'):
    data = urllib.parse.urlencode({'preset': preset}).encode()
    urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8000/reports/custom/generate/', data=data), timeout=15)
assert CustomReport.objects.count() == 5, f'expected 5 custom, got {CustomReport.objects.count()}'
print('Step 1: 5 presets OK')

# 2. Custom range (short, daily bucket)
data = urllib.parse.urlencode({'preset':'custom','start_date':'2026-04-01','end_date':'2026-04-10'}).encode()
urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8000/reports/custom/generate/', data=data), timeout=15)

# 3. Custom range (long, weekly bucket ~ 90 days)
data = urllib.parse.urlencode({'preset':'custom','start_date':'2026-01-01','end_date':'2026-04-01'}).encode()
urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8000/reports/custom/generate/', data=data), timeout=15)

# 4. Custom range (very long, monthly bucket ~ 2y)
data = urllib.parse.urlencode({'preset':'custom','start_date':'2024-01-01','end_date':'2026-01-01'}).encode()
urllib.request.urlopen(urllib.request.Request('http://127.0.0.1:8000/reports/custom/generate/', data=data), timeout=15)
print('Step 2-4: 3 custom ranges OK')

# 5. List page shows all
body = urllib.request.urlopen('http://127.0.0.1:8000/reports/', timeout=10).read().decode()
assert 'Custom' in body and 'Weekly' in body, 'badges missing'

# 6. Each detail renders
for r in CustomReport.objects.all():
    b = urllib.request.urlopen(f'http://127.0.0.1:8000/reports/custom/{r.pk}/detail/', timeout=10).read()
    assert len(b) > 1500, f'detail too small for {r.label}'

# 7. Email HTML endpoint works for both kinds
wr = WeeklyReport.objects.first()
if wr:
    b = urllib.request.urlopen(f'http://127.0.0.1:8000/reports/{wr.pk}/email-html/', timeout=10).read()
    assert b'html' in b, 'weekly email-html missing'
cr = CustomReport.objects.first()
b = urllib.request.urlopen(f'http://127.0.0.1:8000/reports/custom/{cr.pk}/email-html/', timeout=10).read()
assert b'html' in b, 'custom email-html missing'
print('All e2e OK')
"
```

Expected: all four `print` lines appear, no assertion error.

- [ ] **Step 3: Django check + migrations clean**

```bash
python manage.py check
python manage.py makemigrations --dry-run --check
```

Both must report no pending changes and no issues.

- [ ] **Step 4: Final commit (if any cleanup was needed)**

If Steps 1-3 triggered no changes, skip. Otherwise:

```bash
git add -A
git commit -m "test(dashboard): finalize custom-range reports verification"
```

---

## Self-review

- **Spec coverage:**
  - `CustomReport` model → Task 1 ✓
  - UI presets + custom pickers → Task 7 ✓
  - Adaptive daily bucket (day/week/month) → Task 2 (`pick_bucket`, `aggregate_range`) ✓
  - Badges Weekly/Custom in unified list → Task 7 ✓
  - Email HTML generation for custom → Task 3 (writes both files) + Task 6 (endpoint) ✓
  - `start > end` validation + no-row-on-error → Task 6 (helper + view) + Task 7 (smoke) ✓
  - Weekly flow untouched end-to-end → Task 2 smoke step 4, Task 5 smoke, Task 8 ✓
  - Shared templates with `period_label` → Task 4 + Task 5 ✓
- **Placeholder scan:** no "TBD", "similar to", or "add appropriate error handling". All code shown.
- **Type consistency:** `generate_custom_report(start, end, preset, label)` signature matches between generator (Task 3) and view (Task 6). `aggregate_range` return dict keys match the template consumers. `resolve_preset` returns `(date, date, str)` consistently used by the view.
- **Known risk / accepted:** I chose to keep `monday`/`sunday` keys in the weekly view context as aliases to avoid having to audit every template snippet that might still reference them. If a later task removes them, search `grep -r "monday\|sunday" dashboard-v2/reports/templates/` first.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-13-custom-range-reports.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
