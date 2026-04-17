# Token Usage & Costs Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Token Usage & Costs" page to the Mugiwara dashboard v2, parsing Claude Code JSONL sessions to display token consumption, costs, and cache performance across all projects.

**Architecture:** New Django app `tokens/` with a `TokenUsage` model (one row per assistant message), a JSONL parser scanning `~/.claude/projects/`, pricing module for cost calculation, and 3 HTMX tabs (Costs, Technical, Sessions) with D3.js charts.

**Tech Stack:** Django 5.2, HTMX, D3.js (MugiCharts), SQLite

**Spec:** `docs/superpowers/specs/2026-03-30-token-usage-dashboard-design.md`

---

## File Structure

```
dashboard-v2/tokens/
    __init__.py                        # Empty init
    apps.py                            # TokensConfig
    models.py                          # TokenUsage model
    pricing.py                         # PRICING dict + calculate_cost()
    parser.py                          # JSONL scanner + parser
    views.py                           # All views (index, 3 tabs, refresh, project-summary)
    urls.py                            # URL routing
    templatetags/
        __init__.py
        token_filters.py               # Custom template filters (format_cost, format_tokens)
    management/
        __init__.py
        commands/
            __init__.py
            ingest_tokens.py           # Management command
    migrations/
        __init__.py
        0001_initial.py                # Auto-generated
    templates/
        tokens/
            index.html                 # Main page with tabs + refresh button
            partials/
                _tab_costs.html        # Costs tab content
                _tab_technical.html    # Technical tab content
                _tab_sessions.html     # Sessions tab content
                _session_detail.html   # Session detail drawer
                _project_summary.html  # Mini block for project detail page
```

Files modified:
- `config/settings.py` — add `'tokens'` to INSTALLED_APPS
- `config/urls.py` — add `path('tokens/', include('tokens.urls'))`
- `templates/components/_sidebar.html` — add Tokens nav link
- `templates/components/_stat_card.html` — add `coin` and `cache` icon cases
- `projects/templates/projects/detail.html` — add token summary HTMX block

---

### Task 1: Create tokens app scaffold

**Files:**
- Create: `dashboard-v2/tokens/__init__.py`
- Create: `dashboard-v2/tokens/apps.py`
- Create: `dashboard-v2/tokens/urls.py`
- Create: `dashboard-v2/tokens/templatetags/__init__.py`
- Create: `dashboard-v2/tokens/templatetags/token_filters.py`
- Create: `dashboard-v2/tokens/management/__init__.py`
- Create: `dashboard-v2/tokens/management/commands/__init__.py`
- Modify: `dashboard-v2/config/settings.py`

- [ ] **Step 1: Create the app directory structure**

```bash
cd dashboard-v2
mkdir -p tokens/templatetags tokens/management/commands tokens/migrations tokens/templates/tokens/partials
touch tokens/__init__.py tokens/templatetags/__init__.py tokens/management/__init__.py tokens/management/commands/__init__.py tokens/migrations/__init__.py
```

- [ ] **Step 2: Create apps.py**

```python
# tokens/apps.py
from django.apps import AppConfig


class TokensConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tokens'
    verbose_name = 'Token Usage & Costs'
```

- [ ] **Step 3: Create urls.py (empty for now)**

```python
# tokens/urls.py
from django.urls import path

urlpatterns = []
```

- [ ] **Step 4: Create template filters**

```python
# tokens/templatetags/token_filters.py
from django import template

register = template.Library()


@register.filter
def format_cost(value):
    """Format a float cost as $X.XX."""
    if value is None:
        return '$0.00'
    return f'${value:,.2f}'


@register.filter
def format_tokens(value):
    """Format token count with K/M suffix."""
    if value is None or value == 0:
        return '0'
    if value >= 1_000_000:
        return f'{value / 1_000_000:.1f}M'
    if value >= 1_000:
        return f'{value / 1_000:.1f}K'
    return str(value)


@register.filter
def format_pct(value):
    """Format a percentage value."""
    if value is None:
        return '0%'
    return f'{value:.0f}%'
```

- [ ] **Step 5: Register app in settings.py**

In `config/settings.py`, add `'tokens'` to `INSTALLED_APPS`:

```python
INSTALLED_APPS = [
    'django.contrib.staticfiles',
    'core',
    'agents',
    'orchestrator',
    'pipelines',
    'projects',
    'reports',
    'tokens',
]
```

- [ ] **Step 6: Register URLs in config/urls.py**

```python
# Add to urlpatterns:
path('tokens/', include('tokens.urls')),
```

- [ ] **Step 7: Verify Django loads the app**

```bash
cd dashboard-v2
venv/Scripts/python manage.py check
```

Expected: `System check identified no issues`

- [ ] **Step 8: Commit**

```bash
git add tokens/ config/settings.py config/urls.py
git commit -m "feat(tokens): scaffold tokens Django app with filters and URL registration"
```

---

### Task 2: TokenUsage model + migration

**Files:**
- Create: `dashboard-v2/tokens/models.py`

- [ ] **Step 1: Create the model**

```python
# tokens/models.py
"""Token usage tracking — one row per Claude assistant message with token data."""
from django.db import models


class TokenUsage(models.Model):
    """Tracks token consumption per assistant message from Claude Code sessions."""

    # Identity (idempotency key)
    message_id = models.CharField(max_length=100, unique=True)
    session_id = models.CharField(max_length=100, db_index=True)

    # Dimensions
    timestamp = models.DateTimeField(db_index=True)
    model = models.CharField(max_length=50)
    project = models.CharField(max_length=200, db_index=True)

    # Token metrics
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    cache_creation_tokens = models.IntegerField(default=0)
    cache_read_tokens = models.IntegerField(default=0)

    # Computed cost (USD)
    cost = models.FloatField(default=0.0)

    class Meta:
        db_table = 'token_usage'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['project', 'timestamp'], name='idx_token_proj_ts'),
            models.Index(fields=['model', 'timestamp'], name='idx_token_model_ts'),
        ]

    def __str__(self):
        return f'{self.model} @ {self.timestamp} — ${self.cost:.4f}'

    @property
    def total_tokens(self):
        return (self.input_tokens + self.output_tokens
                + self.cache_creation_tokens + self.cache_read_tokens)
```

- [ ] **Step 2: Generate and run migration**

```bash
cd dashboard-v2
venv/Scripts/python manage.py makemigrations tokens
venv/Scripts/python manage.py migrate
```

Expected: `Migrations for 'tokens': tokens/migrations/0001_initial.py` then `Applying tokens.0001_initial... OK`

- [ ] **Step 3: Verify table exists**

```bash
venv/Scripts/python manage.py shell -c "from tokens.models import TokenUsage; print(TokenUsage.objects.count())"
```

Expected: `0`

- [ ] **Step 4: Commit**

```bash
git add tokens/models.py tokens/migrations/
git commit -m "feat(tokens): add TokenUsage model with indexes and migration"
```

---

### Task 3: Pricing module

**Files:**
- Create: `dashboard-v2/tokens/pricing.py`

- [ ] **Step 1: Create pricing.py**

```python
# tokens/pricing.py
"""Claude API pricing table and cost calculation."""
import logging

logger = logging.getLogger(__name__)

# Rates in USD per 1M tokens
PRICING = {
    'claude-opus-4-6': {
        'input': 15.0,
        'output': 75.0,
        'cache_creation': 18.75,    # 125% of input
        'cache_read': 1.50,         # 10% of input
    },
    'claude-sonnet-4-5': {
        'input': 3.0,
        'output': 15.0,
        'cache_creation': 3.75,
        'cache_read': 0.30,
    },
    'claude-haiku-3-5': {
        'input': 0.80,
        'output': 4.0,
        'cache_creation': 1.0,
        'cache_read': 0.08,
    },
}

DEFAULT_TIER = 'claude-sonnet-4-5'


def get_rates(model_name: str) -> dict:
    """Get pricing rates for a model. Falls back to DEFAULT_TIER for unknown models."""
    rates = PRICING.get(model_name)
    if rates is None:
        logger.warning('Unknown model %r, using default tier %s', model_name, DEFAULT_TIER)
        rates = PRICING[DEFAULT_TIER]
    return rates


def calculate_cost(
    model_name: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    cache_creation_tokens: int = 0,
    cache_read_tokens: int = 0,
) -> float:
    """Calculate cost in USD for a single message."""
    rates = get_rates(model_name)
    cost = (
        input_tokens * rates['input']
        + output_tokens * rates['output']
        + cache_creation_tokens * rates['cache_creation']
        + cache_read_tokens * rates['cache_read']
    ) / 1_000_000
    return cost
```

- [ ] **Step 2: Verify pricing module**

```bash
cd dashboard-v2
venv/Scripts/python -c "
from tokens.pricing import calculate_cost
# 1000 input tokens on opus = 1000 * 15 / 1_000_000 = 0.015
cost = calculate_cost('claude-opus-4-6', input_tokens=1000)
assert abs(cost - 0.015) < 0.0001, f'Expected 0.015 got {cost}'
# 1000 output on sonnet = 1000 * 15 / 1_000_000 = 0.015
cost2 = calculate_cost('claude-sonnet-4-5', output_tokens=1000)
assert abs(cost2 - 0.015) < 0.0001, f'Expected 0.015 got {cost2}'
# Unknown model uses default tier
cost3 = calculate_cost('unknown-model', input_tokens=1000)
assert abs(cost3 - 0.003) < 0.0001, f'Expected 0.003 got {cost3}'
print('All pricing tests passed')
"
```

Expected: `All pricing tests passed`

- [ ] **Step 3: Commit**

```bash
git add tokens/pricing.py
git commit -m "feat(tokens): add pricing table with per-model cost calculation"
```

---

### Task 4: JSONL parser

**Files:**
- Create: `dashboard-v2/tokens/parser.py`

- [ ] **Step 1: Create parser.py**

```python
# tokens/parser.py
"""
Parse Claude Code JSONL session files for token usage data.

Scans ~/.claude/projects/ for all project directories.
Extracts type:assistant entries that contain message.usage.
"""
import json
import logging
import time
from datetime import datetime, timedelta
from pathlib import Path

from .pricing import calculate_cost

logger = logging.getLogger(__name__)


def _derive_project_name(dir_name: str) -> str:
    """
    Derive project name from encoded directory name.
    Example: 'C--Users-alexis-mugiwara-agents' -> 'mugiwara-agents'
    """
    # Replace -- with path separator, then take last segment
    decoded = dir_name.replace('-', '/')
    # Get the last meaningful segment
    parts = [p for p in decoded.split('/') if p]
    return parts[-1] if parts else dir_name


def _parse_session_file(filepath: Path, project_name: str) -> list[dict]:
    """
    Parse a single .jsonl session file.
    Returns list of dicts ready for TokenUsage model creation.
    """
    records = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue

                # Only process assistant messages with usage data
                if entry.get('type') != 'assistant':
                    continue

                msg = entry.get('message', {})
                usage = msg.get('usage')
                if not usage:
                    continue

                message_id = msg.get('id', '')
                if not message_id:
                    continue

                session_id = entry.get('sessionId', '')
                model_name = msg.get('model', '')

                # Parse timestamp
                ts_str = entry.get('timestamp', '')
                try:
                    timestamp = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                except (ValueError, TypeError):
                    continue

                input_tokens = usage.get('input_tokens', 0) or 0
                output_tokens = usage.get('output_tokens', 0) or 0
                cache_creation = usage.get('cache_creation_input_tokens', 0) or 0
                cache_read = usage.get('cache_read_input_tokens', 0) or 0

                cost = calculate_cost(
                    model_name,
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    cache_creation_tokens=cache_creation,
                    cache_read_tokens=cache_read,
                )

                records.append({
                    'message_id': message_id,
                    'session_id': session_id,
                    'timestamp': timestamp,
                    'model': model_name,
                    'project': project_name,
                    'input_tokens': input_tokens,
                    'output_tokens': output_tokens,
                    'cache_creation_tokens': cache_creation,
                    'cache_read_tokens': cache_read,
                    'cost': cost,
                })

    except (OSError, PermissionError) as e:
        logger.warning('Error reading %s: %s', filepath, e)

    return records


def scan_all_sessions(recent_days: int | None = None) -> list[dict]:
    """
    Scan all Claude Code session files and return token usage records.

    Args:
        recent_days: If set, only scan files modified within the last N days.

    Returns:
        List of dicts with keys matching TokenUsage model fields.
    """
    claude_dir = Path.home() / '.claude' / 'projects'
    if not claude_dir.exists():
        logger.info('Claude projects directory not found: %s', claude_dir)
        return []

    cutoff_time = None
    if recent_days:
        cutoff_time = time.time() - (recent_days * 86400)

    all_records = []
    project_count = 0
    file_count = 0

    try:
        for proj_dir in claude_dir.iterdir():
            if not proj_dir.is_dir():
                continue

            project_name = _derive_project_name(proj_dir.name)
            project_count += 1

            for session_file in proj_dir.glob('*.jsonl'):
                # Skip old files if --recent mode
                if cutoff_time:
                    try:
                        mtime = session_file.stat().st_mtime
                        if mtime < cutoff_time:
                            continue
                    except OSError:
                        continue

                file_count += 1
                records = _parse_session_file(session_file, project_name)
                all_records.extend(records)

    except (PermissionError, OSError) as e:
        logger.error('Error scanning claude dir: %s', e)

    logger.info(
        'Scanned %d projects, %d files, found %d token records',
        project_count, file_count, len(all_records),
    )
    return all_records
```

- [ ] **Step 2: Verify parser runs without error**

```bash
cd dashboard-v2
venv/Scripts/python -c "
from tokens.parser import scan_all_sessions
records = scan_all_sessions()
print(f'Found {len(records)} token records')
if records:
    r = records[0]
    print(f'First: model={r[\"model\"]}, project={r[\"project\"]}, cost={r[\"cost\"]:.6f}')
"
```

Expected: `Found N token records` with N > 0 (given existing sessions)

- [ ] **Step 3: Commit**

```bash
git add tokens/parser.py
git commit -m "feat(tokens): add JSONL parser for Claude session token data"
```

---

### Task 5: Management command ingest_tokens

**Files:**
- Create: `dashboard-v2/tokens/management/commands/ingest_tokens.py`

- [ ] **Step 1: Create the management command**

```python
# tokens/management/commands/ingest_tokens.py
"""
Management command to ingest token usage data from Claude Code sessions.

Usage:
    python manage.py ingest_tokens          # Full scan
    python manage.py ingest_tokens --recent  # Last 7 days only
"""
from django.core.management.base import BaseCommand

from tokens.models import TokenUsage
from tokens.parser import scan_all_sessions


class Command(BaseCommand):
    help = 'Ingest token usage data from Claude Code JSONL sessions'

    def add_arguments(self, parser):
        parser.add_argument(
            '--recent',
            action='store_true',
            help='Only scan files modified in the last 7 days',
        )

    def handle(self, *args, **options):
        recent_days = 7 if options['recent'] else None

        self.stdout.write(
            f'Scanning Claude sessions'
            f'{" (last 7 days)" if recent_days else " (all)"}...'
        )

        records = scan_all_sessions(recent_days=recent_days)
        self.stdout.write(f'Found {len(records)} token records')

        if not records:
            self.stdout.write(self.style.WARNING('No records to ingest'))
            return

        # Build model instances
        instances = [TokenUsage(**r) for r in records]

        # Bulk create with idempotency (ignore duplicates on message_id)
        created = TokenUsage.objects.bulk_create(
            instances,
            batch_size=500,
            ignore_conflicts=True,
        )

        self.stdout.write(self.style.SUCCESS(
            f'Ingested {len(created)} new records '
            f'({len(records) - len(created)} duplicates skipped)'
        ))
```

- [ ] **Step 2: Run the ingestion command**

```bash
cd dashboard-v2
venv/Scripts/python manage.py ingest_tokens
```

Expected: `Scanning Claude sessions (all)...` then `Found N token records` then `Ingested X new records`

- [ ] **Step 3: Verify data in DB**

```bash
venv/Scripts/python manage.py shell -c "
from tokens.models import TokenUsage
from django.db.models import Sum, Count
print(f'Total records: {TokenUsage.objects.count()}')
print(f'Total cost: \${TokenUsage.objects.aggregate(s=Sum(\"cost\"))[\"s\"]:.2f}')
print(f'Unique projects: {TokenUsage.objects.values(\"project\").distinct().count()}')
print(f'Unique models: {TokenUsage.objects.values(\"model\").distinct().count()}')
"
```

- [ ] **Step 4: Test --recent flag (re-run should show 0 new)**

```bash
venv/Scripts/python manage.py ingest_tokens --recent
```

Expected: `Ingested 0 new records (N duplicates skipped)` since data was just ingested.

- [ ] **Step 5: Commit**

```bash
git add tokens/management/
git commit -m "feat(tokens): add ingest_tokens management command with --recent flag"
```

---

### Task 6: Views + URL routing

**Files:**
- Create: `dashboard-v2/tokens/views.py`
- Modify: `dashboard-v2/tokens/urls.py`

- [ ] **Step 1: Create views.py with all view functions**

```python
# tokens/views.py
"""Views for Token Usage & Costs dashboard."""
from datetime import timedelta

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

    context = {
        'cost_today': cost_today,
        'cost_week': cost_week,
        'cost_month': cost_month,
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

    # Cache hit rate
    cache_denominator = total_cache_read + total_input
    cache_hit_rate = (total_cache_read / cache_denominator * 100) if cache_denominator > 0 else 0

    # Estimated savings: what cache reads would cost at full input rate
    # We need per-model calculation for accuracy, but approximate with weighted avg
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

    # Aggregate by session
    sessions_qs = (
        qs.values('session_id', 'project')
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
    """Drawer content — detail of a single session."""
    messages = (
        TokenUsage.objects.filter(session_id=session_id)
        .order_by('timestamp')
    )
    total_cost = sum(m.cost for m in messages)
    total_tokens = sum(m.total_tokens for m in messages)

    context = {
        'session_id': session_id,
        'messages': messages,
        'total_cost': total_cost,
        'total_tokens': total_tokens,
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
```

- [ ] **Step 2: Update urls.py with all routes**

```python
# tokens/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('', views.token_index, name='token_index'),
    path('costs/', views.tab_costs, name='token_tab_costs'),
    path('technical/', views.tab_technical, name='token_tab_technical'),
    path('sessions/', views.tab_sessions, name='token_tab_sessions'),
    path('sessions/<str:session_id>/', views.session_detail, name='token_session_detail'),
    path('refresh/', views.refresh_tokens, name='token_refresh'),
    path('project-summary/<str:project_name>/', views.project_summary, name='token_project_summary'),
]
```

- [ ] **Step 3: Verify URL resolution**

```bash
cd dashboard-v2
venv/Scripts/python manage.py shell -c "
from django.urls import reverse
print(reverse('token_index'))
print(reverse('token_tab_costs'))
print(reverse('token_refresh'))
print(reverse('token_project_summary', args=['mugiwara-agents']))
print('All URLs resolve OK')
"
```

Expected: `/tokens/`, `/tokens/costs/`, `/tokens/refresh/`, `/tokens/project-summary/mugiwara-agents/`, `All URLs resolve OK`

- [ ] **Step 4: Commit**

```bash
git add tokens/views.py tokens/urls.py
git commit -m "feat(tokens): add views and URL routing for all token endpoints"
```

---

### Task 7: Main page template (index.html)

**Files:**
- Create: `dashboard-v2/tokens/templates/tokens/index.html`

- [ ] **Step 1: Create index.html**

```html
{% extends "base.html" %}
{% load token_filters %}

{% block title %}Token Usage & Costs{% endblock %}

{% block content %}
<div class="page-header">
    <div class="page-header__left">
        <h1 class="page-title">{{ page_title }}</h1>
    </div>
    <div class="page-header__right" style="display:flex;gap:8px;align-items:center">
        <!-- Period filter -->
        <select class="glass-select" id="period-select"
                onchange="updateTokenPeriod(this.value)">
            <option value="7d" {% if current_period == '7d' %}selected{% endif %}>7 days</option>
            <option value="30d" {% if current_period == '30d' %}selected{% endif %}>30 days</option>
            <option value="90d" {% if current_period == '90d' %}selected{% endif %}>90 days</option>
            <option value="all" {% if current_period == 'all' %}selected{% endif %}>All time</option>
        </select>

        <!-- Project filter -->
        {% if projects %}
        <select class="glass-select" id="project-select"
                onchange="updateTokenProject(this.value)">
            <option value="">All projects</option>
            {% for p in projects %}
            <option value="{{ p }}" {% if current_project == p %}selected{% endif %}>{{ p }}</option>
            {% endfor %}
        </select>
        {% endif %}

        <!-- Refresh button -->
        <button class="glass-btn glass-btn--sm"
                hx-post="{% url 'token_refresh' %}"
                hx-swap="none"
                hx-indicator="#refresh-spinner">
            <span id="refresh-spinner" class="htmx-indicator" style="display:none">
                &#8987;
            </span>
            &#x21BB; Refresh
        </button>
    </div>
</div>

<!-- Tabs -->
<div class="glass-tabs" id="token-tabs">
    <button class="glass-tab active" data-tab="costs"
            hx-get="{% url 'token_tab_costs' %}?period={{ current_period }}&project={{ current_project }}"
            hx-target="#tab-content"
            hx-swap="innerHTML"
            hx-trigger="click, tokens-refreshed from:body"
            hx-on::after-swap="initTokenCharts()">
        &#128176; Costs
    </button>
    <button class="glass-tab" data-tab="technical"
            hx-get="{% url 'token_tab_technical' %}?period={{ current_period }}&project={{ current_project }}"
            hx-target="#tab-content"
            hx-swap="innerHTML"
            hx-on::after-swap="initTokenCharts()">
        &#9889; Technical
    </button>
    <button class="glass-tab" data-tab="sessions"
            hx-get="{% url 'token_tab_sessions' %}?period={{ current_period }}&project={{ current_project }}"
            hx-target="#tab-content"
            hx-swap="innerHTML">
        &#128203; Sessions
    </button>
</div>

<!-- Tab content container -->
<div id="tab-content"
     hx-get="{% url 'token_tab_costs' %}?period={{ current_period }}&project={{ current_project }}"
     hx-trigger="load"
     hx-swap="innerHTML"
     hx-on::after-swap="initTokenCharts()">
    <div class="loading-skeleton">Loading...</div>
</div>
{% endblock %}

{% block extra_js %}
<script src="{% static 'js/charts.js' %}"></script>
<script>
// Tab switching
document.querySelectorAll('.glass-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
        document.querySelectorAll('.glass-tab').forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
    });
});

// Init D3 charts after HTMX swap
function initTokenCharts() {
    var container = document.getElementById('tab-content');
    if (container && window.MugiCharts) {
        MugiCharts.initChartsInContainer(container);
    }
}

// Period filter
function updateTokenPeriod(period) {
    var project = document.getElementById('project-select');
    var projVal = project ? project.value : '';
    var activeTab = document.querySelector('.glass-tab.active');
    var tabName = activeTab ? activeTab.getAttribute('data-tab') : 'costs';
    var urls = {
        costs: '{% url "token_tab_costs" %}',
        technical: '{% url "token_tab_technical" %}',
        sessions: '{% url "token_tab_sessions" %}'
    };
    var url = urls[tabName] + '?period=' + period + '&project=' + encodeURIComponent(projVal);
    htmx.ajax('GET', url, {target: '#tab-content', swap: 'innerHTML'}).then(initTokenCharts);
}

// Project filter
function updateTokenProject(project) {
    var period = document.getElementById('period-select').value;
    var activeTab = document.querySelector('.glass-tab.active');
    var tabName = activeTab ? activeTab.getAttribute('data-tab') : 'costs';
    var urls = {
        costs: '{% url "token_tab_costs" %}',
        technical: '{% url "token_tab_technical" %}',
        sessions: '{% url "token_tab_sessions" %}'
    };
    var url = urls[tabName] + '?period=' + period + '&project=' + encodeURIComponent(project);
    htmx.ajax('GET', url, {target: '#tab-content', swap: 'innerHTML'}).then(initTokenCharts);
}
</script>
{% endblock %}
```

- [ ] **Step 2: Verify page loads (start server)**

```bash
cd dashboard-v2
venv/Scripts/python manage.py runserver 0.0.0.0:8000
```

Navigate to `http://localhost:8000/tokens/` — verify the page frame loads with tabs (content will be empty until tab templates exist).

- [ ] **Step 3: Commit**

```bash
git add tokens/templates/tokens/index.html
git commit -m "feat(tokens): add main page template with tabs, filters, and refresh"
```

---

### Task 8: Costs tab partial

**Files:**
- Create: `dashboard-v2/tokens/templates/tokens/partials/_tab_costs.html`

- [ ] **Step 1: Create _tab_costs.html**

```html
{% load token_filters %}

<!-- KPI Cards -->
<div class="stat-grid stat-grid--3">
    {% include "components/_stat_card.html" with title="Today" value=cost_today|format_cost icon="coin" %}
    {% include "components/_stat_card.html" with title="This Week" value=cost_week|format_cost icon="chart" %}
    {% include "components/_stat_card.html" with title="This Month" value=cost_month|format_cost icon="star" %}
</div>

<!-- Daily cost sparkline -->
{% if daily_chart %}
<div class="glass-card" style="margin-top:16px">
    <h3 class="card-title">Daily Cost Trend</h3>
    <div id="chart-daily-cost" style="height:120px"
         data-chart="sparkline"
         data-chart-data='{{ daily_chart|safe }}'
         data-chart-color="#10B981">
    </div>
</div>
{% endif %}

<!-- Breakdowns -->
<div class="grid-2col" style="margin-top:16px">
    {% if model_chart %}
    <div class="glass-card">
        <h3 class="card-title">Cost by Model</h3>
        <div id="chart-cost-model" style="height:200px"
             data-chart="donut"
             data-chart-data='{{ model_chart|safe }}'>
        </div>
    </div>
    {% endif %}

    {% if project_chart %}
    <div class="glass-card">
        <h3 class="card-title">Cost by Project (Top 10)</h3>
        <div id="chart-cost-project" style="height:300px"
             data-chart="barh"
             data-chart-data='{{ project_chart|safe }}'
             data-chart-color="#8B5CF6">
        </div>
    </div>
    {% endif %}
</div>
```

- [ ] **Step 2: Verify the costs tab renders**

Navigate to `http://localhost:8000/tokens/` — the Costs tab should auto-load with KPI cards and charts.

- [ ] **Step 3: Commit**

```bash
git add tokens/templates/tokens/partials/_tab_costs.html
git commit -m "feat(tokens): add costs tab with KPIs, daily trend, and breakdowns"
```

---

### Task 9: Technical tab partial

**Files:**
- Create: `dashboard-v2/tokens/templates/tokens/partials/_tab_technical.html`

- [ ] **Step 1: Create _tab_technical.html**

```html
{% load token_filters %}

<!-- KPI Cards -->
<div class="stat-grid stat-grid--4">
    {% include "components/_stat_card.html" with title="Total Tokens" value=total_tokens|format_tokens icon="zap" %}
    {% include "components/_stat_card.html" with title="Cache Hit Rate" value=cache_hit_rate|format_pct icon="cpu" %}
    {% include "components/_stat_card.html" with title="Cache Reads" value=total_cache_read|format_tokens icon="shield" %}
    {% include "components/_stat_card.html" with title="Est. Savings" value=estimated_savings|format_cost icon="star" %}
</div>

<!-- Charts row -->
<div class="grid-2col" style="margin-top:16px">
    <!-- Token composition donut -->
    {% if composition_chart %}
    <div class="glass-card">
        <h3 class="card-title">Token Composition</h3>
        <div id="chart-composition" style="height:220px"
             data-chart="donut"
             data-chart-data='{{ composition_chart|safe }}'>
        </div>
    </div>
    {% endif %}

    <!-- Cache hit rate sparkline -->
    {% if cache_sparkline %}
    <div class="glass-card">
        <h3 class="card-title">Cache Hit Rate Trend</h3>
        <div id="chart-cache-trend" style="height:120px"
             data-chart="sparkline"
             data-chart-data='{{ cache_sparkline|safe }}'
             data-chart-color="#F59E0B">
        </div>
    </div>
    {% endif %}
</div>

<!-- Tokens by model -->
{% if model_chart %}
<div class="glass-card" style="margin-top:16px">
    <h3 class="card-title">Tokens by Model</h3>
    <div id="chart-tokens-model" style="height:200px"
         data-chart="barh"
         data-chart-data='{{ model_chart|safe }}'
         data-chart-color="#EC4899">
    </div>
</div>
{% endif %}
```

- [ ] **Step 2: Verify the Technical tab renders**

Navigate to `http://localhost:8000/tokens/`, click "Technical" tab — verify KPIs, donut chart, and sparkline appear.

- [ ] **Step 3: Commit**

```bash
git add tokens/templates/tokens/partials/_tab_technical.html
git commit -m "feat(tokens): add technical tab with cache metrics and token composition"
```

---

### Task 10: Sessions tab partial

**Files:**
- Create: `dashboard-v2/tokens/templates/tokens/partials/_tab_sessions.html`

- [ ] **Step 1: Create _tab_sessions.html**

```html
{% load token_filters %}

<div class="glass-card">
    <div class="table-header" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 class="card-title" style="margin:0">Sessions ({{ total_sessions }})</h3>
    </div>

    <div class="table-responsive">
        <table class="glass-table">
            <thead>
                <tr>
                    <th>
                        <a href="#" class="table-sort"
                           hx-get="{% url 'token_tab_sessions' %}?sort=date&order={% if sort_field == 'date' and sort_order == 'desc' %}asc{% else %}desc{% endif %}&period={{ current_period }}"
                           hx-target="#tab-content" hx-swap="innerHTML">
                            Date {% if sort_field == 'date' %}{% if sort_order == 'desc' %}&darr;{% else %}&uarr;{% endif %}{% endif %}
                        </a>
                    </th>
                    <th>Project</th>
                    <th>Model</th>
                    <th>
                        <a href="#" class="table-sort"
                           hx-get="{% url 'token_tab_sessions' %}?sort=tokens&order={% if sort_field == 'tokens' and sort_order == 'desc' %}asc{% else %}desc{% endif %}&period={{ current_period }}"
                           hx-target="#tab-content" hx-swap="innerHTML">
                            Tokens {% if sort_field == 'tokens' %}{% if sort_order == 'desc' %}&darr;{% else %}&uarr;{% endif %}{% endif %}
                        </a>
                    </th>
                    <th>
                        <a href="#" class="table-sort"
                           hx-get="{% url 'token_tab_sessions' %}?sort=cost&order={% if sort_field == 'cost' and sort_order == 'desc' %}asc{% else %}desc{% endif %}&period={{ current_period }}"
                           hx-target="#tab-content" hx-swap="innerHTML">
                            Cost {% if sort_field == 'cost' %}{% if sort_order == 'desc' %}&darr;{% else %}&uarr;{% endif %}{% endif %}
                        </a>
                    </th>
                    <th>
                        <a href="#" class="table-sort"
                           hx-get="{% url 'token_tab_sessions' %}?sort=messages&order={% if sort_field == 'messages' and sort_order == 'desc' %}asc{% else %}desc{% endif %}&period={{ current_period }}"
                           hx-target="#tab-content" hx-swap="innerHTML">
                            Msgs {% if sort_field == 'messages' %}{% if sort_order == 'desc' %}&darr;{% else %}&uarr;{% endif %}{% endif %}
                        </a>
                    </th>
                </tr>
            </thead>
            <tbody>
                {% for s in sessions %}
                <tr class="clickable-row"
                    hx-get="{% url 'token_session_detail' s.session_id %}"
                    hx-target="#drawer-body"
                    hx-swap="innerHTML"
                    onclick="document.getElementById('drawer').classList.add('open');document.getElementById('drawer-overlay').classList.add('open');">
                    <td>{{ s.first_ts|date:"d/m/Y H:i" }}</td>
                    <td>{{ s.project }}</td>
                    <td><span class="badge">{{ s.dominant_model }}</span></td>
                    <td>{{ s.total_tokens|format_tokens }}</td>
                    <td>{{ s.total_cost|format_cost }}</td>
                    <td>{{ s.msg_count }}</td>
                </tr>
                {% empty %}
                <tr>
                    <td colspan="6" style="text-align:center;color:var(--text-muted);padding:24px">
                        No session data found for this period.
                    </td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>

    <!-- Pagination -->
    {% if total_pages > 1 %}
    <nav class="pagination" style="margin-top:12px">
        {% if has_prev %}
        <a href="#" class="pagination-link"
           hx-get="{% url 'token_tab_sessions' %}?page={{ prev_page }}&sort={{ sort_field }}&order={{ sort_order }}&period={{ current_period }}"
           hx-target="#tab-content" hx-swap="innerHTML">
            &laquo; Prev
        </a>
        {% else %}
        <span class="pagination-link pagination-link--disabled">&laquo; Prev</span>
        {% endif %}

        <span class="pagination-info">Page {{ page }} / {{ total_pages }}</span>

        {% if has_next %}
        <a href="#" class="pagination-link"
           hx-get="{% url 'token_tab_sessions' %}?page={{ next_page }}&sort={{ sort_field }}&order={{ sort_order }}&period={{ current_period }}"
           hx-target="#tab-content" hx-swap="innerHTML">
            Next &raquo;
        </a>
        {% else %}
        <span class="pagination-link pagination-link--disabled">Next &raquo;</span>
        {% endif %}
    </nav>
    {% endif %}
</div>
```

- [ ] **Step 2: Verify the Sessions tab renders**

Navigate to `http://localhost:8000/tokens/`, click "Sessions" tab — verify the table appears with sortable columns and data.

- [ ] **Step 3: Commit**

```bash
git add tokens/templates/tokens/partials/_tab_sessions.html
git commit -m "feat(tokens): add sessions tab with sortable paginated table"
```

---

### Task 11: Session detail drawer

**Files:**
- Create: `dashboard-v2/tokens/templates/tokens/partials/_session_detail.html`

- [ ] **Step 1: Create _session_detail.html**

```html
{% load token_filters %}

<div class="drawer-section">
    <h3>Session: {{ session_id|truncatechars:20 }}</h3>
    <div class="stat-grid stat-grid--2" style="margin-bottom:16px">
        <div class="mini-stat">
            <span class="mini-stat__label">Total Cost</span>
            <span class="mini-stat__value" style="color:var(--neon-green)">{{ total_cost|format_cost }}</span>
        </div>
        <div class="mini-stat">
            <span class="mini-stat__label">Total Tokens</span>
            <span class="mini-stat__value">{{ total_tokens|format_tokens }}</span>
        </div>
    </div>

    <h4 style="margin-top:16px;color:var(--text-secondary)">Messages ({{ messages|length }})</h4>
    <div class="table-responsive">
        <table class="glass-table glass-table--compact">
            <thead>
                <tr>
                    <th>Time</th>
                    <th>Model</th>
                    <th>In</th>
                    <th>Out</th>
                    <th>Cache R</th>
                    <th>Cache W</th>
                    <th>Cost</th>
                </tr>
            </thead>
            <tbody>
                {% for m in messages %}
                <tr>
                    <td>{{ m.timestamp|date:"H:i:s" }}</td>
                    <td><span class="badge badge--sm">{{ m.model }}</span></td>
                    <td>{{ m.input_tokens|format_tokens }}</td>
                    <td>{{ m.output_tokens|format_tokens }}</td>
                    <td>{{ m.cache_read_tokens|format_tokens }}</td>
                    <td>{{ m.cache_creation_tokens|format_tokens }}</td>
                    <td>{{ m.cost|format_cost }}</td>
                </tr>
                {% endfor %}
            </tbody>
        </table>
    </div>
</div>
```

- [ ] **Step 2: Verify drawer works**

On the Sessions tab, click any row — the drawer should slide open with message-level token breakdown.

- [ ] **Step 3: Commit**

```bash
git add tokens/templates/tokens/partials/_session_detail.html
git commit -m "feat(tokens): add session detail drawer with per-message breakdown"
```

---

### Task 12: Sidebar integration

**Files:**
- Modify: `dashboard-v2/templates/components/_sidebar.html`
- Modify: `dashboard-v2/templates/components/_stat_card.html`

- [ ] **Step 1: Add Tokens link to sidebar**

In `templates/components/_sidebar.html`, add the Tokens nav link after the Reports link (before the closing `</nav>` tag):

```html
        <a href="{% url 'token_index' %}"
           class="sidebar-link{% if active_page == 'tokens' %} active{% endif %}"
           aria-current="{% if active_page == 'tokens' %}page{% endif %}">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M14.5 9a3.5 3.5 0 0 0-5 0"/>
                <path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>
                <line x1="12" y1="9" x2="12" y2="15"/>
            </svg>
            <span class="sidebar-link-text">Tokens</span>
        </a>
```

- [ ] **Step 2: Add coin icon to stat_card.html**

In `templates/components/_stat_card.html`, add the `coin` icon case inside the icon span, after the existing icons:

```html
            {% if icon == "coin" %}&#128176;{% endif %}
            {% if icon == "cache" %}&#9881;{% endif %}
```

- [ ] **Step 3: Verify sidebar shows Tokens link**

Navigate to `http://localhost:8000/tokens/` — verify the Tokens link appears in the sidebar and is highlighted as active.

- [ ] **Step 4: Commit**

```bash
git add templates/components/_sidebar.html templates/components/_stat_card.html
git commit -m "feat(tokens): add Tokens link to sidebar and coin icon to stat cards"
```

---

### Task 13: Project detail integration

**Files:**
- Create: `dashboard-v2/tokens/templates/tokens/partials/_project_summary.html`
- Modify: `dashboard-v2/projects/templates/projects/detail.html`

- [ ] **Step 1: Create _project_summary.html**

```html
{% load token_filters %}

<div class="glass-card" style="margin-top:16px">
    <h3 class="card-title">&#128176; Token Usage</h3>
    <div class="stat-grid stat-grid--3">
        {% include "components/_stat_card.html" with title="Total Cost" value=total_cost|format_cost icon="coin" %}
        {% include "components/_stat_card.html" with title="Total Tokens" value=total_tokens|format_tokens icon="zap" %}
        {% include "components/_stat_card.html" with title="Cache Hit Rate" value=cache_hit_rate|format_pct icon="cpu" %}
    </div>
    <a href="{% url 'token_index' %}?project={{ project_name }}"
       class="glass-btn glass-btn--sm" style="margin-top:8px">
        View full token details &rarr;
    </a>
</div>
```

- [ ] **Step 2: Add HTMX block to project detail page**

In `projects/templates/projects/detail.html`, add the following block where the token summary should appear (typically after the existing project info sections):

```html
<!-- Token Usage Summary -->
<div hx-get="{% url 'token_project_summary' project.name %}"
     hx-trigger="load"
     hx-swap="innerHTML">
</div>
```

Note: Read the actual `projects/detail.html` first to find the right insertion point. The block should go after the existing project detail sections (git info, docs, sessions).

- [ ] **Step 3: Verify project detail shows token summary**

Navigate to `http://localhost:8000/projects/` and click on a project — verify the token summary block appears with cost, tokens, and cache hit rate.

- [ ] **Step 4: Commit**

```bash
git add tokens/templates/tokens/partials/_project_summary.html projects/templates/projects/detail.html
git commit -m "feat(tokens): add token usage summary to project detail page"
```

---

### Task 14: End-to-end verification

- [ ] **Step 1: Fresh ingestion**

```bash
cd dashboard-v2
venv/Scripts/python manage.py ingest_tokens
```

- [ ] **Step 2: Start server**

```bash
venv/Scripts/python manage.py runserver 0.0.0.0:8000
```

- [ ] **Step 3: Verify Costs tab**

Navigate to `http://localhost:8000/tokens/` — verify:
- 3 KPI cards show (today, week, month costs)
- Daily cost sparkline renders
- Cost by model donut renders
- Cost by project barH renders
- Period filter (7d/30d/90d/all) updates charts

- [ ] **Step 4: Verify Technical tab**

Click "Technical" tab — verify:
- 4 KPI cards (total tokens, cache hit rate, cache reads, est. savings)
- Token composition donut
- Cache hit rate sparkline
- Tokens by model barH

- [ ] **Step 5: Verify Sessions tab**

Click "Sessions" tab — verify:
- Table shows sessions with columns
- Sort by clicking column headers
- Click a row → drawer opens with message breakdown
- Pagination works if >20 sessions

- [ ] **Step 6: Verify Refresh**

Click "Refresh" button — verify spinner shows, then tabs reload.

- [ ] **Step 7: Verify sidebar**

Verify "Tokens" appears in sidebar with active state on `/tokens/` pages.

- [ ] **Step 8: Verify project integration**

Navigate to a project detail page — verify token summary mini-block loads via HTMX.

- [ ] **Step 9: Final commit (if any remaining changes)**

```bash
git add -A
git status
# Only commit if there are changes
git commit -m "feat(tokens): end-to-end verification and polish"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | App scaffold | `tokens/__init__`, `apps`, `urls`, `templatetags`, config |
| 2 | Model + migration | `tokens/models.py`, migration |
| 3 | Pricing module | `tokens/pricing.py` |
| 4 | JSONL parser | `tokens/parser.py` |
| 5 | Management command | `tokens/management/commands/ingest_tokens.py` |
| 6 | Views + URL routing | `tokens/views.py`, `tokens/urls.py` |
| 7 | Main page template | `tokens/templates/tokens/index.html` |
| 8 | Costs tab | `tokens/templates/tokens/partials/_tab_costs.html` |
| 9 | Technical tab | `tokens/templates/tokens/partials/_tab_technical.html` |
| 10 | Sessions tab | `tokens/templates/tokens/partials/_tab_sessions.html` |
| 11 | Session detail drawer | `tokens/templates/tokens/partials/_session_detail.html` |
| 12 | Sidebar + icons | `_sidebar.html`, `_stat_card.html` |
| 13 | Project detail integration | `_project_summary.html`, `projects/detail.html` |
| 14 | End-to-end verification | All files |
