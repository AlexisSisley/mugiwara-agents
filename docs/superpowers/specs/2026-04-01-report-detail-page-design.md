# Report Detail Page — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Branch:** feat/token-usage-dashboard

## Summary

Redesign the reports section of dashboard-v2 so that clicking a report card navigates to a **full-screen detail page** (instead of a drawer). The page displays weekly activity data in the visual style of the v1 HTML reports, adapted to the dashboard v2 neon-glass design system. Data is queried dynamically (not from pre-generated HTML).

## Goals

- Reproduce the v1 report visual feel (gradient header, colored KPI cards, progress bars, badge pills) using the existing neon-glass CSS
- Show 6 KPIs: Sessions, Invocations, Total tokens, Total cost, Unique agents, Cache hit rate
- Unified view with category filters (Pro / POC / Perso)
- Interactive sessions table with sort, pagination, and first-prompt preview
- Reuse existing `session_detail` drawer from the tokens app
- Keep the email HTML export (Copy HTML Email) working as-is

## Non-goals

- Modifying the email template or the `generator.py` pre-generation pipeline
- Changing the v1 HTML report format
- Adding new data models

## Architecture

### Routes

| Method | URL | View | Purpose |
|--------|-----|------|---------|
| GET | `/reports/` | `report_list` | Grid of report cards (modified: `<a href>` instead of `data-drawer-url`) |
| GET | `/reports/<id>/detail/` | `report_detail_page` | **New** — full-screen detail page (URL name: `report_detail_page`) |
| GET | `/reports/<id>/sessions/` | `report_sessions` | **New** — HTMX partial for sessions table (URL name: `report_sessions`) |
| GET | `/reports/<id>/email-html/` | `report_email_html` | Existing — raw email HTML for clipboard copy |
| POST | `/reports/generate/` | `report_generate` | Existing — generate report for a week |

### Views

#### `report_detail_page(request, pk)`

Loads the `WeeklyReport` instance, then aggregates data for the week:

**KPIs** (from `Invocation`, `Session`, `TokenUsage`):
- `total_sessions` — `Session.objects.filter(timestamp__date__range=(monday, sunday)).count()`
- `total_invocations` — `Invocation.objects.filter(timestamp__date__range=(monday, sunday)).count()`
- `total_tokens` — `TokenUsage.objects.filter(timestamp__date__range=(monday, sunday)).aggregate(Sum(input + output + cache_creation + cache_read))`
- `total_cost` — `TokenUsage.objects.filter(...).aggregate(Sum('cost'))`
- `unique_agents` — `Invocation.objects.filter(...).values('agent').distinct().count()`
- `cache_hit_rate` — `cache_read / (cache_read + input) * 100`

**Top agents** (from `Invocation`):
- `values('agent').annotate(count=Count('id')).order_by('-count')[:10]`
- Max count used to compute bar widths as percentages

**Projects and subjects** (from `Invocation` and `Memory`):
- Projects: `values('project').annotate(count=Count('id')).order_by('-count')[:10]`
- Subjects: `Memory.objects.filter(date__range=(monday, sunday)).values_list('sujet', flat=True)[:15]`

**Category filter** applied via `?category=pro|poc|perso` query param on all aggregations.

#### `report_sessions(request, pk)`

HTMX partial returning the sessions table. Query params:
- `sort` — `cost` (default), `tokens`, `date`, `messages`
- `order` — `desc` (default), `asc`
- `page` — pagination (20 per page)
- `category` — optional filter

Aggregates `TokenUsage` by `session_id` for the week period:
- `total_cost`, `total_tokens`, `msg_count`, `first_ts`, `dominant_model`, `project`

For each session, fetches the first prompt:
- `Invocation.objects.filter(session_id=sid).order_by('timestamp').values_list('args_preview', flat=True).first()`
- Truncated to 120 chars in template

Click on a session row opens the existing drawer loading `/tokens/sessions/<session_id>/`.

### Templates

```
reports/templates/reports/
  detail.html                          # New — full page, extends base.html
  partials/
    _report_kpis.html                  # New — 6 KPI cards
    _report_agents_projects.html       # New — two-column: top agents + projects/subjects
    _report_sessions.html              # New — sessions table with pagination
    _report_detail.html                # Existing — kept for backward compat (unused)
```

#### `detail.html` structure

```
{% extends "base.html" %}

1. Back link (← Retour aux reports)
2. Header hero (gradient #E63946 → #38BDF8, title, dates, status badge)
3. KPI grid (6 cards, each with distinct border color)
   - Loaded inline (not HTMX, small data)
4. Filter bar (category pills + Copy HTML Email button)
   - Pills trigger hx-get on KPIs, agents/projects, and sessions sections
5. Two-column section (hx-get partial)
   - Left: Top agents with progress bars
   - Right: Projects badges + Subjects badges
6. Sessions table (hx-get partial, lazy-loaded)
   - Sort controls, session rows with prompt preview, pagination
```

### Category filter behavior

Category pills use HTMX:
- `hx-get="/reports/<id>/detail/?category=pro"`
- `hx-target="#report-content"` (wrapper around sections 3-6)
- `hx-push-url="true"` to update URL
- Active pill gets highlighted style

Alternatively (simpler): the category param is read server-side, the full page re-renders with filtered data. No partial reload needed since the page is lightweight.

**Decision:** Use full-page approach (simpler). The filter pills are `<a href="?category=pro">` links. The page re-renders with the category applied to all queries.

### Styling

All components use existing neon-glass CSS variables and classes:
- `glass-card` for containers
- CSS variables: `--text-primary`, `--text-secondary`, `--text-dimmed`
- KPI cards: custom inline styles matching v1 color scheme but using glass background (`rgba(color, 0.08)` + `1px solid rgba(color, 0.3)`)
- Progress bars: same pattern as v1 (background track `#1e293b`, colored fill)
- Badges: `neon-badge` class or custom pills (`rgba(color, 0.15)` bg)
- Sessions table: glass-card rows with border, hover state

### KPI color mapping

| KPI | Color | Hex |
|-----|-------|-----|
| Sessions | Sky blue | `#38BDF8` |
| Invocations | Orange | `#FB923C` |
| Tokens | Purple | `#A78BFA` |
| Cost | Green | `#10B981` |
| Agents | Pink | `#F472B6` |
| Cache Hit | Cyan | `#22D3EE` |

### Grid changes (report_list)

The `index.html` template is modified:
- Report cards use `<a href="{% url 'report_detail_page' report.pk %}">` instead of `data-drawer-url`
- Card content remains the same (week dates, status badge, generated timestamp)

### Export email

The "Copy HTML Email" button works identically to the current drawer implementation:
- Fetches `/reports/<id>/email-html/` via JS
- Copies raw HTML to clipboard
- Shows toast notification

The JS is moved from `_report_detail.html` to `detail.html`.

## Data flow

```
User clicks report card
  → GET /reports/<id>/detail/?category=all
    → Django view queries Invocation, Session, TokenUsage, Memory for the week
    → Renders detail.html with all data
    → Sessions section: hx-get="/reports/<id>/sessions/" (lazy loaded)

User clicks category pill
  → GET /reports/<id>/detail/?category=pro
    → Full page re-render with filtered data

User sorts/paginates sessions
  → hx-get="/reports/<id>/sessions/?sort=tokens&order=asc&page=2&category=pro"
    → Returns _report_sessions.html partial

User clicks session row
  → Drawer opens with hx-get="/tokens/sessions/<session_id>/"
    → Reuses existing session_detail partial
```

## Files to create/modify

**Create:**
- `reports/templates/reports/detail.html`
- `reports/templates/reports/partials/_report_kpis.html`
- `reports/templates/reports/partials/_report_agents_projects.html`
- `reports/templates/reports/partials/_report_sessions.html`

**Modify:**
- `reports/views.py` — add `report_detail_page` and `report_sessions` views
- `reports/urls.py` — add new routes
- `reports/templates/reports/index.html` — change cards from drawer to page links

## Mockup

Visual mockup available at `.superpowers/brainstorm/319-1775028187/content/report-detail-mockup.html`
