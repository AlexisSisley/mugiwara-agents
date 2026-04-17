# Token Usage & Costs Dashboard — Design Spec

## Context

The Mugiwara dashboard v2 (Django + HTMX + D3.js) currently has no visibility into Claude API token consumption or costs. Session data with full token usage metrics exists in `~/.claude/projects/` as JSONL files but is not parsed or surfaced. This feature adds a dedicated "Tokens" page and project-level integration to track costs and optimize usage.

## Decisions

- **Scope**: Full dashboard — costs + technical metrics (cache, token composition)
- **Location**: Dedicated `/tokens/` page with 3 HTMX tabs + summary block in project detail
- **Layout**: Tabbed layout (Costs / Technical / Sessions)
- **Data strategy**: Hybrid — management command for bulk ingestion + Refresh button for on-demand re-ingestion
- **Architecture**: New Django app `tokens/`

## Data Source

Claude Code session files live in `~/.claude/projects/<encoded-project-name>/`. Each session is a `.jsonl` file containing multiple entry types. Token data is found exclusively in `type: "assistant"` entries:

```json
{
  "type": "assistant",
  "timestamp": "2026-03-26T07:54:48.492Z",
  "sessionId": "2d2d8338-...",
  "message": {
    "model": "claude-opus-4-6",
    "id": "msg_01ECGqsrUQonP48gCffpgBqU",
    "usage": {
      "input_tokens": 3,
      "output_tokens": 23,
      "cache_creation_input_tokens": 38483,
      "cache_read_input_tokens": 0
    }
  }
}
```

Project name is derived from the encoded directory name: `C--Users-...-mugiwara-agents` -> `mugiwara-agents` (last path segment).

## 1. Data Model

File: `tokens/models.py` (also register in `core/models.py` migration if shared DB)

```python
class TokenUsage(models.Model):
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
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['project', 'timestamp']),
            models.Index(fields=['model', 'timestamp']),
        ]
```

- **Grain**: One row per assistant message (finest granularity with token data)
- **Idempotency**: `message_id` is unique — `bulk_create(ignore_conflicts=True)` prevents duplicates on re-ingestion
- **Cost**: Pre-calculated at ingestion time using pricing table

## 2. Pricing Table

File: `tokens/pricing.py`

```python
# Rates in USD per 1M tokens
PRICING = {
    'claude-opus-4-6': {
        'input': 15.0,
        'output': 75.0,
        'cache_creation': 18.75,   # 125% of input
        'cache_read': 1.50,        # 10% of input
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
DEFAULT_TIER = 'claude-sonnet-4-5'  # Fallback for unknown models
```

Cost formula per message:
```
cost = (input_tokens * input_rate
      + output_tokens * output_rate
      + cache_creation_tokens * cache_creation_rate
      + cache_read_tokens * cache_read_rate) / 1_000_000
```

Unknown models fall back to `DEFAULT_TIER` pricing with a logged warning.

## 3. Parser & Ingestion

### Parser — `tokens/parser.py`

Responsibilities:
1. Scan `~/.claude/projects/` for all project directories
2. In each directory, find all `.jsonl` files
3. Read line by line, filter `type: "assistant"` entries with `message.usage`
4. Extract: `message.id`, `sessionId`, `timestamp`, `message.model`, all usage fields
5. Derive project name from directory name (last path segment after decoding `--` to path separators)
6. Calculate cost using pricing table
7. Return list of `TokenUsage` model instances

### Management Command — `tokens/management/commands/ingest_tokens.py`

```bash
python manage.py ingest_tokens          # Full scan — all sessions
python manage.py ingest_tokens --recent  # Last 7 days only (by file mtime)
```

Uses `bulk_create(batch_size=500, ignore_conflicts=True)` for performance and idempotency.

### HTMX Refresh Endpoint — `POST /tokens/refresh/`

Calls the parser directly in-process (no subprocess). Returns `HX-Trigger: tokens-refreshed` header to reload active tab. Shows spinner during ingestion via `hx-indicator`.

## 4. URL Routing

File: `tokens/urls.py`

```
/tokens/                → token_index        (main page with tabs)
/tokens/costs/          → tab_costs          (HTMX partial)
/tokens/technical/      → tab_technical      (HTMX partial)
/tokens/sessions/       → tab_sessions       (HTMX partial)
/tokens/refresh/        → refresh_tokens     (POST, triggers re-ingestion)
```

Register in `config/urls.py`:
```python
path('tokens/', include('tokens.urls')),
```

Add to sidebar in `templates/components/_sidebar.html`.

## 5. Views & Templates

### 5.1 Main Page — `tokens/index.html`

- Page title: "Token Usage & Costs"
- Refresh button (top-right): `hx-post="/tokens/refresh/"` with spinner
- 3 tabs using HTMX: `hx-get="/tokens/costs/"` loaded by default
- Period filter dropdown: 7d / 30d / 90d / all (passed as `?period=30d` query param)

### 5.2 Tab: Costs

Template: `tokens/partials/_tab_costs.html`

Components:
- **3 KPI stat cards**: Cost today / this week / this month (reuse `_stat_card.html` component)
- **Bar chart**: Daily cost over selected period (`MugiCharts.renderSparkline`)
- **Donut chart**: Cost by model (`MugiCharts.renderDonut`)
- **Horizontal bar chart**: Cost by project top 10 (`MugiCharts.renderBarH`)

View aggregations (Django ORM):
```python
TokenUsage.objects.filter(timestamp__gte=start)
    .values('model')
    .annotate(total_cost=Sum('cost'))
```

### 5.3 Tab: Technical

Template: `tokens/partials/_tab_technical.html`

Components:
- **4 KPI stat cards**:
  - Total tokens (input + output + cache)
  - Cache hit rate: `cache_read / (cache_read + input_tokens) * 100`
  - Cache reads total
  - Estimated savings: cost of cache_read_tokens at full input rate minus actual cache_read cost
- **Donut chart**: Token composition (input / output / cache creation / cache read)
- **Sparkline**: Cache hit rate by day (trend)
- **Bar chart**: Tokens by model

### 5.4 Tab: Sessions

Template: `tokens/partials/_tab_sessions.html`

Components:
- **Paginated table** (20 rows/page):
  - Columns: Date, Project, Dominant model, Total tokens, Cost, Messages count
  - Default sort: cost descending
  - Column headers clickable for sort (HTMX reload with `?sort=cost&order=desc`)
- **Filters**: dropdown by project, dropdown by model
- **Row click**: opens drawer with session detail (token breakdown per message)

Session-level data is aggregated:
```python
TokenUsage.objects.values('session_id', 'project')
    .annotate(
        total_cost=Sum('cost'),
        total_tokens=Sum(F('input_tokens') + F('output_tokens')),
        msg_count=Count('id'),
        first_ts=Min('timestamp'),
        dominant_model=Max('model'),  # approximation — most expensive model
    )
```

### 5.5 Project Detail Integration

In `projects/templates/projects/detail.html`, add a "Token Usage" section:
- 3 mini stat cards: total cost, total tokens, cache hit rate (for this project only)
- Link to `/tokens/?project=<name>` for full details
- Data fetched via HTMX partial: `hx-get="/tokens/project-summary/<project_name>/"`

Add endpoint: `GET /tokens/project-summary/<project_name>/` returning a partial template.

## 6. Sidebar Integration

Add "Tokens" entry in `templates/components/_sidebar.html` between "Reports" and the existing items:
- Icon: coin/token emoji or SVG
- Label: "Tokens"
- URL: `/tokens/`
- Active class when on `/tokens/*`

## 7. File Structure

```
dashboard-v2/tokens/
    __init__.py
    apps.py
    models.py              # TokenUsage model
    pricing.py             # PRICING dict + cost calculation
    parser.py              # JSONL scanner + parser
    views.py               # All views (index, 3 tabs, refresh, project-summary)
    urls.py                # URL routing
    management/
        __init__.py
        commands/
            __init__.py
            ingest_tokens.py   # Management command
    migrations/
        __init__.py
        0001_initial.py
    templates/
        tokens/
            index.html                     # Main page
            partials/
                _tab_costs.html            # Costs tab
                _tab_technical.html        # Technical tab
                _tab_sessions.html         # Sessions tab
                _session_detail.html       # Session drawer
                _project_summary.html      # Mini block for project detail
```

## 8. Verification

1. Run `python manage.py makemigrations tokens && python manage.py migrate`
2. Run `python manage.py ingest_tokens` — verify it parses JSONL files and populates DB
3. Start server: `python manage.py runserver 0.0.0.0:8000`
4. Navigate to `http://localhost:8000/tokens/` — verify 3 tabs render with data
5. Click Refresh button — verify re-ingestion works
6. Navigate to a project detail page — verify token summary block appears
7. Test period filter (7d/30d/90d) — verify charts update
8. Test Sessions tab sorting and filtering
