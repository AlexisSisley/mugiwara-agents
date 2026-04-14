# Token Subagent Accuracy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix token calculation to include subagent JSONL files, add visual distinction between main session and subagent tokens in the dashboard.

**Architecture:** Add 3 fields to TokenUsage model (is_subagent, parent_session_id, machine), make parser recursive to capture subagent files, update views to compute subagent aggregations, update 4 template partials to display the breakdown.

**Tech Stack:** Django 5.x, SQLite, HTMX, D3.js charts

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `dashboard-v2/tokens/models.py` | Modify:5-41 | Add 3 fields to TokenUsage |
| `dashboard-v2/tokens/migrations/0002_subagent_fields.py` | Create | Migration for new fields |
| `dashboard-v2/tokens/parser.py` | Modify:171-295 | Recursive scan + subagent detection |
| `dashboard-v2/tokens/views.py` | Modify:63-342 | Subagent aggregations in 4 views |
| `dashboard-v2/tokens/templates/tokens/partials/_tab_costs.html` | Modify | Subagent subtitle on KPIs |
| `dashboard-v2/tokens/templates/tokens/partials/_tab_technical.html` | Modify | New donut chart |
| `dashboard-v2/tokens/templates/tokens/partials/_tab_sessions.html` | Modify | Subagents column |
| `dashboard-v2/tokens/templates/tokens/partials/_session_detail.html` | Modify | Two-section message table |

---

### Task 1: Add new fields to TokenUsage model

**Files:**
- Modify: `dashboard-v2/tokens/models.py:5-41`
- Create: `dashboard-v2/tokens/migrations/0002_subagent_fields.py`

- [ ] **Step 1: Add 3 fields to the model**

In `dashboard-v2/tokens/models.py`, add after line 15 (`project` field):

```python
    # Subagent tracking
    is_subagent = models.BooleanField(default=False, db_index=True)
    parent_session_id = models.CharField(
        max_length=100, blank=True, default='', db_index=True,
    )

    # Machine identification (prepares multi-PC)
    machine = models.CharField(max_length=100, blank=True, default='')
```

And add a new index in `Meta.indexes` (after the existing two):

```python
            models.Index(fields=['is_subagent'], name='idx_token_subagent'),
            models.Index(fields=['parent_session_id'], name='idx_token_parent_sess'),
```

- [ ] **Step 2: Generate and run migration**

Run:
```bash
cd dashboard-v2
python manage.py makemigrations tokens --name subagent_fields
python manage.py migrate
```

Expected: Migration `0002_subagent_fields.py` created and applied. All 3 fields added with defaults, no data loss.

- [ ] **Step 3: Commit**

```bash
git add dashboard-v2/tokens/models.py dashboard-v2/tokens/migrations/0002_subagent_fields.py
git commit -m "feat(tokens): add is_subagent, parent_session_id, machine fields to TokenUsage"
```

---

### Task 2: Update parser for recursive scan + subagent detection

**Files:**
- Modify: `dashboard-v2/tokens/parser.py:1-295`

- [ ] **Step 1: Add socket import**

At the top of `dashboard-v2/tokens/parser.py`, add after `from pathlib import Path` (line 11):

```python
import socket
```

- [ ] **Step 2: Add subagent detection helper**

Add this function after `_derive_project_name()` (after line 168), before `_parse_session_file()`:

```python
def _detect_subagent_info(filepath: Path) -> tuple[bool, str]:
    """
    Detect if a JSONL file is a subagent log and extract parent session ID.

    Returns:
        (is_subagent, parent_session_id)
    """
    parts = filepath.parts
    # Look for 'subagents' in the path
    # Structure: .../<project>/<session-uuid>/subagents/agent-xxx.jsonl
    try:
        sa_idx = parts.index('subagents')
    except ValueError:
        return False, ''

    # parent_session_id is the directory just before 'subagents'
    if sa_idx > 0:
        return True, parts[sa_idx - 1]
    return False, ''
```

- [ ] **Step 3: Update `_parse_session_file()` signature and record injection**

Modify `_parse_session_file()` (line 171) to accept and inject the new fields:

Change the signature from:
```python
def _parse_session_file(filepath: Path, project_name: str) -> list[dict]:
```
to:
```python
def _parse_session_file(
    filepath: Path,
    project_name: str,
    *,
    is_subagent: bool = False,
    parent_session_id: str = '',
    machine: str = '',
) -> list[dict]:
```

In the `records.append({...})` block (around line 224-235), add the 3 new keys after `'cost': cost,`:

```python
                    'is_subagent': is_subagent,
                    'parent_session_id': parent_session_id,
                    'machine': machine,
```

- [ ] **Step 4: Update `scan_all_sessions()` to use rglob and pass subagent info**

Replace the file scanning loop in `scan_all_sessions()`. Change lines 274-286 from:

```python
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
```

to:

```python
            hostname = socket.gethostname()

            for session_file in proj_dir.rglob('*.jsonl'):
                # Skip old files if --recent mode
                if cutoff_time:
                    try:
                        mtime = session_file.stat().st_mtime
                        if mtime < cutoff_time:
                            continue
                    except OSError:
                        continue

                file_count += 1
                is_subagent, parent_session_id = _detect_subagent_info(
                    session_file,
                )
                records = _parse_session_file(
                    session_file,
                    project_name,
                    is_subagent=is_subagent,
                    parent_session_id=parent_session_id,
                    machine=hostname,
                )
                all_records.extend(records)
```

Note: `hostname` is computed once outside the inner loop for efficiency.

- [ ] **Step 5: Commit**

```bash
git add dashboard-v2/tokens/parser.py
git commit -m "feat(tokens): recursive JSONL scan with subagent detection and machine field"
```

---

### Task 3: Update `tab_costs` view — subagent subtitle on KPIs

**Files:**
- Modify: `dashboard-v2/tokens/views.py:63-131`
- Modify: `dashboard-v2/tokens/templates/tokens/partials/_tab_costs.html`

- [ ] **Step 1: Add subagent cost aggregation in `tab_costs` view**

In `dashboard-v2/tokens/views.py`, inside `tab_costs()`, after `cost_total` computation (line 79) and before the daily cost chart (line 82), add:

```python
    # Subagent breakdown
    sub_qs = qs.filter(is_subagent=True)
    sub_cost_today = sub_qs.filter(timestamp__gte=today_start).aggregate(
        s=Sum('cost'))['s'] or 0
    sub_cost_week = sub_qs.filter(timestamp__gte=week_start).aggregate(
        s=Sum('cost'))['s'] or 0
    sub_cost_month = sub_qs.filter(timestamp__gte=month_start).aggregate(
        s=Sum('cost'))['s'] or 0
    sub_cost_total = sub_qs.aggregate(s=Sum('cost'))['s'] or 0
```

Add these to the context dict (around line 120-130):

```python
        'sub_cost_today': sub_cost_today,
        'sub_cost_week': sub_cost_week,
        'sub_cost_month': sub_cost_month,
        'sub_cost_total': sub_cost_total,
```

- [ ] **Step 2: Update `_tab_costs.html` to show subagent subtitles**

Replace the KPI cards section (lines 3-9) in `dashboard-v2/tokens/templates/tokens/partials/_tab_costs.html`:

```html
<!-- KPI Cards -->
<div class="stats-grid">
    {% include "components/_stat_card.html" with title="Today" value=cost_today|format_cost icon="coin" subtitle=sub_cost_today|format_cost_sub:"subagents" %}
    {% include "components/_stat_card.html" with title="This Week" value=cost_week|format_cost icon="chart" subtitle=sub_cost_week|format_cost_sub:"subagents" %}
    {% include "components/_stat_card.html" with title="This Month" value=cost_month|format_cost icon="star" subtitle=sub_cost_month|format_cost_sub:"subagents" %}
    {% include "components/_stat_card.html" with title=period_label value=cost_total|format_cost icon="zap" subtitle=sub_cost_total|format_cost_sub:"subagents" %}
</div>
```

- [ ] **Step 3: Add `format_cost_sub` template filter**

In `dashboard-v2/tokens/templatetags/token_filters.py`, add:

```python
@register.filter
def format_cost_sub(value, label=''):
    """Format a cost as 'dont $X.XX label' for subtitle display. Returns '' if zero."""
    if not value or value == 0:
        return ''
    return f'dont ${value:,.2f} {label}'.strip()
```

- [ ] **Step 4: Verify the dashboard renders correctly**

Run:
```bash
cd dashboard-v2
python manage.py runserver
```

Open `http://localhost:8000/tokens/` — the Costs tab should show KPIs with "dont $X.XX subagents" under each card when subagent data exists.

- [ ] **Step 5: Commit**

```bash
git add dashboard-v2/tokens/views.py dashboard-v2/tokens/templates/tokens/partials/_tab_costs.html dashboard-v2/tokens/templatetags/token_filters.py
git commit -m "feat(tokens): show subagent cost breakdown in KPI cards"
```

---

### Task 4: Update `tab_technical` view — Main vs Subagents donut

**Files:**
- Modify: `dashboard-v2/tokens/views.py:134-217`
- Modify: `dashboard-v2/tokens/templates/tokens/partials/_tab_technical.html`

- [ ] **Step 1: Add subagent token split in `tab_technical` view**

In `dashboard-v2/tokens/views.py`, inside `tab_technical()`, after `total_all` computation (line 150) and before the cache hit rate section, add:

```python
    # Main vs Subagents split
    sub_agg = qs.filter(is_subagent=True).aggregate(
        sub_input=Sum('input_tokens'),
        sub_output=Sum('output_tokens'),
        sub_cc=Sum('cache_creation_tokens'),
        sub_cr=Sum('cache_read_tokens'),
    )
    sub_total = (
        (sub_agg['sub_input'] or 0)
        + (sub_agg['sub_output'] or 0)
        + (sub_agg['sub_cc'] or 0)
        + (sub_agg['sub_cr'] or 0)
    )
    main_total = total_all - sub_total

    subagent_split_chart = [
        {'label': 'Main', 'value': main_total},
        {'label': 'Subagents', 'value': sub_total},
    ]
```

Add to the context dict:

```python
        'subagent_split_chart': subagent_split_chart,
```

- [ ] **Step 2: Add the donut chart in `_tab_technical.html`**

In `dashboard-v2/tokens/templates/tokens/partials/_tab_technical.html`, add a new chart block after the closing `</div>` of the `two-col` div (after line 35), before the "Tokens by Model" section:

```html

<!-- Main vs Subagents split -->
{% if subagent_split_chart %}
<div class="glass-card" style="margin-top: var(--spacing-lg);">
    <h3 class="card-title">Main vs Subagents</h3>
    <div id="chart-subagent-split" style="height:220px"
         data-chart="donut"
         data-chart-data='{{ subagent_split_chart|to_json }}'>
    </div>
</div>
{% endif %}
```

- [ ] **Step 3: Verify the dashboard renders correctly**

Open `http://localhost:8000/tokens/` — the Technical tab should now show a "Main vs Subagents" donut chart between the existing charts and "Tokens by Model".

- [ ] **Step 4: Commit**

```bash
git add dashboard-v2/tokens/views.py dashboard-v2/tokens/templates/tokens/partials/_tab_technical.html
git commit -m "feat(tokens): add Main vs Subagents donut chart in technical tab"
```

---

### Task 5: Update `tab_sessions` view — subagent count column + inclusive totals

**Files:**
- Modify: `dashboard-v2/tokens/views.py:220-279`
- Modify: `dashboard-v2/tokens/templates/tokens/partials/_tab_sessions.html`

- [ ] **Step 1: Update session aggregation to include subagents**

In `dashboard-v2/tokens/views.py`, replace the `tab_sessions()` session aggregation (lines 238-249).

Replace from:
```python
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
```

to:

```python
    # Aggregate main sessions only (subagents will be counted separately)
    main_qs = qs.filter(is_subagent=False)
    sessions_qs = (
        main_qs.values('session_id', 'project')
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
```

- [ ] **Step 2: Add subagent counts and inclusive totals per session**

After the pagination computation (after line 258 `sessions = list(...)`), add post-processing to enrich each session dict with subagent data:

```python
    # Enrich sessions with subagent data
    for s in sessions:
        sid = s['session_id']
        sub = qs.filter(is_subagent=True, parent_session_id=sid)
        sub_agg = sub.aggregate(
            sub_cost=Sum('cost'),
            sub_tokens=Sum(F('input_tokens') + F('output_tokens')
                          + F('cache_creation_tokens') + F('cache_read_tokens')),
            sub_count=Count('session_id', distinct=True),
        )
        s['sub_count'] = sub_agg['sub_count'] or 0
        s['sub_cost'] = sub_agg['sub_cost'] or 0
        s['sub_tokens'] = sub_agg['sub_tokens'] or 0
        s['total_cost_inclusive'] = s['total_cost'] + s['sub_cost']
        s['total_tokens_inclusive'] = s['total_tokens'] + s['sub_tokens']
```

- [ ] **Step 3: Update `_tab_sessions.html` — add Subagents column and use inclusive totals**

In `dashboard-v2/tokens/templates/tokens/partials/_tab_sessions.html`:

Add a new `<th>` after the Msgs column header (after line 41):
```html
                    <th>Subagents</th>
```

Update the `<td>` cells in the session row (lines 51-56). Replace:
```html
                    <td>{{ s.first_ts|date:"d/m/Y H:i" }}</td>
                    <td>{{ s.project }}</td>
                    <td><span class="badge">{{ s.dominant_model }}</span></td>
                    <td>{{ s.total_tokens|format_tokens }}</td>
                    <td>{{ s.total_cost|format_cost }}</td>
                    <td>{{ s.msg_count }}</td>
```

with:
```html
                    <td>{{ s.first_ts|date:"d/m/Y H:i" }}</td>
                    <td>{{ s.project }}</td>
                    <td><span class="badge">{{ s.dominant_model }}</span></td>
                    <td>{{ s.total_tokens_inclusive|format_tokens }}</td>
                    <td>{{ s.total_cost_inclusive|format_cost }}</td>
                    <td>{{ s.msg_count }}</td>
                    <td>
                        {% if s.sub_count > 0 %}
                            <span class="badge badge--accent">{{ s.sub_count }} agent{{ s.sub_count|pluralize }}</span>
                        {% else %}
                            <span style="color:var(--text-muted)">&mdash;</span>
                        {% endif %}
                    </td>
```

Update the empty row colspan from 6 to 7:
```html
                    <td colspan="7" style="text-align:center;color:var(--text-muted);padding:24px">
```

- [ ] **Step 4: Verify the sessions tab renders correctly**

Open `http://localhost:8000/tokens/` and click the Sessions tab. Each session row should show inclusive totals and a subagent count badge.

- [ ] **Step 5: Commit**

```bash
git add dashboard-v2/tokens/views.py dashboard-v2/tokens/templates/tokens/partials/_tab_sessions.html
git commit -m "feat(tokens): sessions tab shows inclusive totals and subagent count"
```

---

### Task 6: Update `session_detail` view — two-section message table

**Files:**
- Modify: `dashboard-v2/tokens/views.py:282-297`
- Modify: `dashboard-v2/tokens/templates/tokens/partials/_session_detail.html`

- [ ] **Step 1: Update `session_detail` view to split main vs subagent messages**

In `dashboard-v2/tokens/views.py`, replace the entire `session_detail()` function (lines 282-297):

```python
def session_detail(request, session_id):
    """Drawer content — detail of a single session with subagent breakdown."""
    # Main session messages
    main_messages = list(
        TokenUsage.objects.filter(session_id=session_id, is_subagent=False)
        .order_by('timestamp')
    )

    # Subagent messages grouped by their session_id
    sub_messages = list(
        TokenUsage.objects.filter(parent_session_id=session_id, is_subagent=True)
        .order_by('session_id', 'timestamp')
    )

    # Group subagent messages by session_id for display
    from itertools import groupby
    from operator import attrgetter
    subagent_groups = []
    for sid, msgs in groupby(sub_messages, key=attrgetter('session_id')):
        msgs_list = list(msgs)
        group_cost = sum(m.cost for m in msgs_list)
        group_tokens = sum(m.total_tokens for m in msgs_list)
        subagent_groups.append({
            'session_id': sid,
            'short_id': sid[:12],
            'messages': msgs_list,
            'cost': group_cost,
            'tokens': group_tokens,
        })

    all_msgs = main_messages + sub_messages
    total_cost = sum(m.cost for m in all_msgs)
    total_tokens = sum(m.total_tokens for m in all_msgs)
    main_cost = sum(m.cost for m in main_messages)
    main_tokens = sum(m.total_tokens for m in main_messages)

    context = {
        'session_id': session_id,
        'main_messages': main_messages,
        'subagent_groups': subagent_groups,
        'subagent_count': len(subagent_groups),
        'total_cost': total_cost,
        'total_tokens': total_tokens,
        'main_cost': main_cost,
        'main_tokens': main_tokens,
    }
    return render(request, 'tokens/partials/_session_detail.html', context)
```

- [ ] **Step 2: Rewrite `_session_detail.html` with two-section layout**

Replace the entire content of `dashboard-v2/tokens/templates/tokens/partials/_session_detail.html`:

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
            <span class="mini-stat__label">Total Tokens{% if subagent_count > 0 %} (main + {{ subagent_count }} agent{{ subagent_count|pluralize }}){% endif %}</span>
            <span class="mini-stat__value">{{ total_tokens|format_tokens }}</span>
        </div>
    </div>

    <!-- Main session messages -->
    <h4 style="margin-top:16px;color:var(--text-secondary)">Main Session ({{ main_messages|length }} msgs &bull; {{ main_cost|format_cost }})</h4>
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
                {% for m in main_messages %}
                <tr>
                    <td>{{ m.timestamp|date:"H:i:s" }}</td>
                    <td><span class="badge badge--sm">{{ m.model }}</span></td>
                    <td>{{ m.input_tokens|format_tokens }}</td>
                    <td>{{ m.output_tokens|format_tokens }}</td>
                    <td>{{ m.cache_read_tokens|format_tokens }}</td>
                    <td>{{ m.cache_creation_tokens|format_tokens }}</td>
                    <td>{{ m.cost|format_cost }}</td>
                </tr>
                {% empty %}
                <tr><td colspan="7" style="text-align:center;color:var(--text-muted)">No main session messages</td></tr>
                {% endfor %}
            </tbody>
        </table>
    </div>

    <!-- Subagent messages -->
    {% if subagent_groups %}
    <h4 style="margin-top:24px;color:var(--text-secondary)">Subagents ({{ subagent_count }})</h4>
    {% for group in subagent_groups %}
    <div style="background:rgba(139,92,246,0.06);border-radius:8px;padding:12px;margin-top:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <span class="badge badge--accent">{{ group.short_id }}</span>
            <span style="font-size:0.85rem;color:var(--text-muted)">
                {{ group.tokens|format_tokens }} tokens &bull; {{ group.cost|format_cost }}
            </span>
        </div>
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
                    {% for m in group.messages %}
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
    {% endfor %}
    {% endif %}
</div>
```

- [ ] **Step 3: Verify the session drawer renders correctly**

Open `http://localhost:8000/tokens/`, go to Sessions tab, click a session row. The drawer should show:
1. Header with combined totals and "(main + N agents)" label
2. "Main Session" section with white background
3. "Subagents" section with each subagent in a purple-tinted card

- [ ] **Step 4: Commit**

```bash
git add dashboard-v2/tokens/views.py dashboard-v2/tokens/templates/tokens/partials/_session_detail.html
git commit -m "feat(tokens): session detail drawer shows main vs subagent message breakdown"
```

---

### Task 7: Re-ingest data and verify end-to-end

**Files:**
- No code changes — data verification only

- [ ] **Step 1: Run full re-ingestion to capture subagent data**

```bash
cd dashboard-v2
python manage.py ingest_tokens
```

Expected: Significantly more records than before (subagent files now included). Output should show something like: "Found XXXX token records" (much higher than previous runs) and "Ingested YYYY new records".

- [ ] **Step 2: Verify totals in the dashboard**

Open `http://localhost:8000/tokens/` and check:
1. **Costs tab**: KPI totals should be higher than before. Each card shows "dont $X.XX subagents".
2. **Technical tab**: "Main vs Subagents" donut should show a meaningful split (not 100%/0%).
3. **Sessions tab**: Sessions with mugiwara pipelines should show subagent badges (e.g., "5 agents").
4. **Session detail drawer**: Click a session with subagents — should see both sections populated.

- [ ] **Step 3: Commit any final fixes if needed**

Only if something was adjusted during verification:
```bash
git add -p
git commit -m "fix(tokens): adjustments from end-to-end verification"
```
