# Custom Range Reports — Design Spec

**Date:** 2026-04-13
**Scope:** `dashboard-v2/reports/`
**Status:** approved (brainstorm), pending implementation plan

## Context

The Reports tab currently supports only **weekly** reports: one report per Monday→Sunday window, with a unique constraint on `week_start`. Users need to generate reports over **arbitrary date ranges** (e.g. "last 30 days", "March 2026", "Q1 2026", or custom start→end) without disturbing the existing weekly flow.

The goal is to add a **custom-range report** capability that coexists with weekly reports: same visual richness, same email-HTML output, same detail/sessions views, but with a free start/end date and quick presets for common ranges.

## Decisions

Clarified in brainstorming:

1. **Coexistence** — new `CustomReport` model next to unchanged `WeeklyReport`.
2. **UI** — date pickers + quick-preset buttons (`Last 7d`, `Last 30d`, `This month`, `Last month`, `This quarter`, `Custom…`). The existing `Generate Current Week` button is kept.
3. **Content** — same metrics as weekly, with an **adaptive daily bucket** (day / week / month) based on range length.
4. **List display** — single grid, badge `Weekly` vs `Custom` on each card.
5. **Email HTML** — custom reports generate both preview HTML and email HTML, same as weekly.

## Architecture

### New model `CustomReport` (`core/models.py`)

```python
class CustomReport(models.Model):
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
```

- No unique constraint: the same range can be regenerated multiple times (each generation = one new row).
- `preset` = one of `last7`, `last30`, `this_month`, `last_month`, `this_quarter`, `custom`.
- `label` stores the human-friendly period name ("Last 30 days", "March 2026"); computed at generation time from the preset.

`WeeklyReport` is **not modified**.

### Generator (`reports/custom_generator.py`)

New module that:

1. Shares aggregation logic with `reports/generator.py` via a refactored helper `_aggregate_range(start, end, bucket)` placed in `reports/generator.py` or a new `reports/aggregations.py`. Both generators call this helper; only the breakdown bucket differs.
2. Picks the breakdown bucket adaptively:
   ```python
   def _pick_bucket(start, end):
       days = (end - start).days + 1
       if days <= 60:  return 'day'
       if days <= 365: return 'week'
       return 'month'
   ```
3. Renders the existing `reports/report_template.html` and `reports/email_template.html` via a unified context exposing `period_label` (e.g. "Week of 2026-04-06" or "Last 30 days • 2026-03-14 → 2026-04-13").
4. Writes `~/.mugiwara/reports/custom-{id}.html` and `~/.mugiwara/reports/custom-{id}-email.html`.
5. Creates and returns a `CustomReport` row (id first via `save()` before writing file paths).

Weekly generator keeps its existing file naming and logic; only the context keys change (add `period_label`, rename/duplicate `week_start`/`week_end` to also expose `start_date`/`end_date` for shared template usage).

### Preset resolution

Helper `resolve_preset(name, today=None) -> (start, end, label)`:

| Preset | Range | Label |
|---|---|---|
| `last7` | today-6 → today | "Last 7 days" |
| `last30` | today-29 → today | "Last 30 days" |
| `this_month` | 1st of month → today | "{MonthName YYYY} (MTD)" |
| `last_month` | 1st → last day of previous month | "{MonthName YYYY}" |
| `this_quarter` | 1st day of current quarter → today | "Q{n} YYYY (QTD)" |
| `custom` | user-provided start/end | "{start} → {end}" |

### Views (`reports/views.py`)

New:
- `custom_report_generate(request)` — POST. Reads `preset`, and for `custom` also `start_date`/`end_date`. Validates (`start <= end`, no future), generates, redirects to `report_list`.
- `custom_report_detail_page(request, pk)` — mirrors `report_detail_page` but operates on `CustomReport`. Filters by `start_date`/`end_date` (the existing queries already use date ranges).
- `custom_report_sessions(request, pk)` — HTMX partial, mirrors `report_sessions`.
- `custom_report_detail(request, pk)` — drawer partial, mirrors `report_detail` (optional; keep only if weekly drawer is used).
- `custom_report_email_html(request, pk)` — mirrors `report_email_html`.

Modified:
- `report_list(request)` — returns a unified list of dicts: `[{kind: 'weekly', item: WeeklyReport}, {kind: 'custom', item: CustomReport}, …]` sorted by `generated_at` desc. Keeps last 20 total.

Weekly views (`report_detail_page`, `report_sessions`, `report_email_html`, `report_generate`) are unchanged.

### URLs (`reports/urls.py`)

Added:
```python
path('custom/generate/', views.custom_report_generate, name='custom_report_generate'),
path('custom/<int:pk>/', views.custom_report_detail, name='custom_report_detail'),
path('custom/<int:pk>/detail/', views.custom_report_detail_page, name='custom_report_detail_page'),
path('custom/<int:pk>/sessions/', views.custom_report_sessions, name='custom_report_sessions'),
path('custom/<int:pk>/email-html/', views.custom_report_email_html, name='custom_report_email_html'),
```

### Templates

- `reports/templates/reports/index.html`:
  - Keep the existing "Generate Current Week" form.
  - Add a second form block: preset buttons (each = a POST to `custom_report_generate` with a `preset` hidden input), plus a collapsible "Custom…" panel with two `<input type="date">` + submit.
  - Card grid iterates over the unified list. Each card shows:
    - Title: weekly → `Week of {start}`; custom → `label` if present, else `{start} → {end}`.
    - Badge `Weekly` vs `Custom` (new CSS variant; reuse `neon-badge` system).
    - Same status badge as today.
    - Link → `report_detail_page` (weekly) or `custom_report_detail_page` (custom), chosen via `kind`.
- Detail templates (`reports/detail.html`, partials for sessions / email): adjusted to read `period_label` and generic `start_date`/`end_date` context keys alongside the existing `monday`/`sunday`. The weekly view passes `start_date=monday, end_date=sunday, period_label="Week of {monday}"`, the custom view passes its own values.

## Data flow

```
[User clicks preset "Last 30d"]
        │
        ▼
POST /reports/custom/generate/  (preset=last30)
        │
        ▼
resolve_preset("last30") → (start, end, label)
        │
        ▼
generate_custom_report(start, end, preset, label):
    bucket = _pick_bucket(start, end)
    agg    = _aggregate_range(start, end, bucket)
    html   = render(report_template, agg + period_label)
    email  = render(email_template,  agg + period_label)
    write files; create CustomReport row
        │
        ▼
redirect → /reports/  (card now appears with Custom badge)
```

## Error handling

- `start > end` → flash error via `django.contrib.messages`, redirect back.
- `end > today` → clamp to today + silent warning (or flash notice).
- Empty result range (no invocations/sessions) → still generate, report shows zeros gracefully (same as current weekly behavior).
- File write failure → transaction rollback via `try/except`, flash error, no stale DB row.

## Testing

Manual smoke tests (documented in the implementation plan):

1. Each preset button generates one `CustomReport`, visible in the grid with `Custom` badge.
2. Existing `Generate Current Week` still creates a `WeeklyReport` with `Weekly` badge.
3. Detail page for a custom report over 1 day → daily breakdown.
4. Detail page for a custom report over 90 days → weekly breakdown.
5. Detail page for a custom report over 2 years → monthly breakdown.
6. Session table filters/sorts/paginates identically on custom and weekly.
7. Copy-email button returns HTML for both kinds.
8. `start > end` submit → flash error, no row created.

## Non-goals

- Deleting or renaming `WeeklyReport`.
- Scheduled/automated custom report generation (manual only).
- Export formats other than HTML (no CSV/PDF).
- Per-project or per-category scoping at generation time (already handled inside the detail view via URL filters).
- Editing/regenerating an existing custom report in place — each run creates a new row; users delete manually if they want to clean up.

## Files touched

**Created**
- `dashboard-v2/reports/custom_generator.py`
- `dashboard-v2/reports/aggregations.py` (shared helper, if extracted)
- `dashboard-v2/core/migrations/000X_customreport.py` (auto)

**Modified**
- `dashboard-v2/core/models.py` — add `CustomReport`.
- `dashboard-v2/reports/views.py` — add 5 new views, modify `report_list`.
- `dashboard-v2/reports/urls.py` — add 5 routes.
- `dashboard-v2/reports/generator.py` — refactor to call shared aggregation helper; emit unified context keys (`period_label`, `start_date`, `end_date`).
- `dashboard-v2/reports/templates/reports/index.html` — preset UI + unified grid with badges.
- `dashboard-v2/reports/templates/reports/report_template.html` — use `period_label` + generic date keys.
- `dashboard-v2/reports/templates/reports/email_template.html` — same.
- `dashboard-v2/reports/templates/reports/detail.html` — same + kind-aware links.
- `dashboard-v2/reports/templates/reports/partials/_report_sessions.html` — use generic keys if needed.
