# Report Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the report drawer with a full-screen detail page showing weekly KPIs, top agents/projects, and an interactive sessions table with first-prompt preview — styled like the v1 report but using the dashboard v2 neon-glass design system.

**Architecture:** Dynamic Django page (not pre-generated HTML). The detail page queries `Invocation`, `Session`, `TokenUsage`, and `Memory` for the given week. Category filters use full-page reload via `<a href>` links. The sessions table is a lazy-loaded HTMX partial with sort/pagination. Session row clicks open the existing `session_detail` drawer from the tokens app.

**Tech Stack:** Django 5, HTMX, neon-glass CSS, existing `token_filters` and `dashboard_tags` template tags.

**Spec:** `docs/superpowers/specs/2026-04-01-report-detail-page-design.md`

---

## File Structure

**Create:**
- `dashboard-v2/reports/templates/reports/detail.html` — full page, extends `base.html`, contains header hero, KPI grid, filter bar, includes partials
- `dashboard-v2/reports/templates/reports/partials/_report_kpis.html` — 6 KPI cards grid
- `dashboard-v2/reports/templates/reports/partials/_report_agents_projects.html` — two-column: top agents bars + projects/subjects badges
- `dashboard-v2/reports/templates/reports/partials/_report_sessions.html` — sessions table with sort, pagination, prompt preview

**Modify:**
- `dashboard-v2/reports/urls.py` — add 2 new routes
- `dashboard-v2/reports/views.py` — add `report_detail_page` and `report_sessions` views
- `dashboard-v2/reports/templates/reports/index.html` — change cards from drawer to page links

---

### Task 1: Add routes for detail page and sessions partial

**Files:**
- Modify: `dashboard-v2/reports/urls.py`

- [ ] **Step 1: Add the two new URL patterns**

In `dashboard-v2/reports/urls.py`, add these two paths after the existing `report_detail` path:

```python
from django.urls import path
from . import views

urlpatterns = [
    path('', views.report_list, name='report_list'),
    path('generate/', views.report_generate, name='report_generate'),
    path('<int:pk>/', views.report_detail, name='report_detail'),
    path('<int:pk>/detail/', views.report_detail_page, name='report_detail_page'),
    path('<int:pk>/sessions/', views.report_sessions, name='report_sessions'),
    path('<int:pk>/email-html/', views.report_email_html, name='report_email_html'),
]
```

- [ ] **Step 2: Verify no import errors**

Run: `cd dashboard-v2 && python -c "from reports import urls; print('OK')"`

This will fail because the views don't exist yet — that's expected. Just confirm the syntax is valid. If it fails with `ImportError` on the view names, that's fine — we'll add them in Task 2.

- [ ] **Step 3: Commit**

```bash
git add dashboard-v2/reports/urls.py
git commit -m "feat(reports): add URL routes for detail page and sessions partial"
```

---

### Task 2: Implement `report_detail_page` view

**Files:**
- Modify: `dashboard-v2/reports/views.py`

- [ ] **Step 1: Add imports at the top of `views.py`**

Add these imports to the existing ones at the top of `dashboard-v2/reports/views.py`:

```python
from django.db.models import Count, Sum, F

from tokens.models import TokenUsage
```

The file already imports `Invocation`, `Session`, `Memory` via `core.models` and `WeeklyReport`.

- [ ] **Step 2: Add the `report_detail_page` view**

Add this function after the existing `report_detail` view (after line 45):

```python
def report_detail_page(request, pk):
    """Full-screen detail page for a weekly report."""
    try:
        report = WeeklyReport.objects.get(pk=pk)
    except WeeklyReport.DoesNotExist:
        return render(request, 'components/_empty_state.html', {
            'title': 'Not found', 'message': 'Report not found.'
        })

    monday = report.week_start
    sunday = report.week_end
    category = request.GET.get('category', '')

    # Base querysets filtered by week
    inv_qs = Invocation.objects.filter(
        timestamp__date__gte=monday, timestamp__date__lte=sunday
    )
    sess_qs = Session.objects.filter(
        timestamp__date__gte=monday, timestamp__date__lte=sunday
    )
    token_qs = TokenUsage.objects.filter(
        timestamp__date__gte=monday, timestamp__date__lte=sunday
    )
    mem_qs = Memory.objects.filter(date__gte=monday, date__lte=sunday)

    # Apply category filter
    if category:
        inv_qs = inv_qs.filter(category=category)
        sess_qs = sess_qs.filter(category=category)
        mem_qs = mem_qs.filter(category=category)
        # TokenUsage doesn't have category — filter by session_ids from filtered sessions
        filtered_session_ids = list(
            sess_qs.values_list('session_id', flat=True)
        )
        token_qs = token_qs.filter(session_id__in=filtered_session_ids)

    # KPIs
    total_sessions = sess_qs.count()
    total_invocations = inv_qs.count()

    token_agg = token_qs.aggregate(
        total_tokens=Sum(
            F('input_tokens') + F('output_tokens')
            + F('cache_creation_tokens') + F('cache_read_tokens')
        ),
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

    # Top agents with bar widths
    top_agents = list(
        inv_qs.values('agent')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    max_agent_count = top_agents[0]['count'] if top_agents else 1
    for agent in top_agents:
        agent['width'] = round(agent['count'] / max_agent_count * 100)

    # Top projects
    top_projects = list(
        inv_qs.exclude(project='')
        .values('project')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )

    # Subjects from Memory
    subjects = list(
        mem_qs.exclude(sujet='')
        .values_list('sujet', flat=True)[:15]
    )

    context = {
        'active_page': 'reports',
        'page_title': f'Report — {monday}',
        'report': report,
        'monday': monday,
        'sunday': sunday,
        'category': category,
        # KPIs
        'total_sessions': total_sessions,
        'total_invocations': total_invocations,
        'total_tokens': total_tokens,
        'total_cost': total_cost,
        'unique_agents': unique_agents,
        'cache_hit_rate': cache_hit_rate,
        # Content
        'top_agents': top_agents,
        'top_projects': top_projects,
        'subjects': subjects,
    }
    return render(request, 'reports/detail.html', context)
```

- [ ] **Step 3: Verify syntax**

Run: `cd dashboard-v2 && python -c "from reports.views import report_detail_page; print('OK')"`

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add dashboard-v2/reports/views.py
git commit -m "feat(reports): add report_detail_page view with KPIs and aggregations"
```

---

### Task 3: Implement `report_sessions` view

**Files:**
- Modify: `dashboard-v2/reports/views.py`

- [ ] **Step 1: Add the `report_sessions` view**

Add this function after `report_detail_page` in `dashboard-v2/reports/views.py`:

```python
def report_sessions(request, pk):
    """HTMX partial — sessions table for a weekly report."""
    try:
        report = WeeklyReport.objects.get(pk=pk)
    except WeeklyReport.DoesNotExist:
        return render(request, 'components/_empty_state.html', {
            'title': 'Not found', 'message': 'Report not found.'
        })

    monday = report.week_start
    sunday = report.week_end
    category = request.GET.get('category', '')

    token_qs = TokenUsage.objects.filter(
        timestamp__date__gte=monday, timestamp__date__lte=sunday
    )

    # Category filter via session IDs
    if category:
        filtered_session_ids = list(
            Session.objects.filter(
                timestamp__date__gte=monday, timestamp__date__lte=sunday,
                category=category,
            ).values_list('session_id', flat=True)
        )
        token_qs = token_qs.filter(session_id__in=filtered_session_ids)

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
    from django.db.models import Min, Max
    sessions_qs = (
        token_qs.values('session_id', 'project')
        .annotate(
            total_cost=Sum('cost'),
            total_tokens=Sum(
                F('input_tokens') + F('output_tokens')
                + F('cache_creation_tokens') + F('cache_read_tokens')
            ),
            msg_count=Count('id'),
            first_ts=Min('timestamp'),
            dominant_model=Max('model'),
        )
        .order_by(db_sort)
    )

    # Pagination
    page = int(request.GET.get('page', 1))
    per_page = 20
    total_sessions = sessions_qs.count()
    total_pages = max(1, (total_sessions + per_page - 1) // per_page)
    page = max(1, min(page, total_pages))
    offset = (page - 1) * per_page
    sessions = list(sessions_qs[offset:offset + per_page])

    # Fetch first prompt for each session
    for s in sessions:
        first_prompt = (
            Invocation.objects
            .filter(session_id=s['session_id'])
            .exclude(args_preview='')
            .order_by('timestamp')
            .values_list('args_preview', flat=True)
            .first()
        )
        s['first_prompt'] = first_prompt or ''

        # Resolve category from Session model
        sess_obj = Session.objects.filter(session_id=s['session_id']).first()
        s['category'] = sess_obj.category if sess_obj else ''

    context = {
        'report': report,
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

- [ ] **Step 2: Verify syntax**

Run: `cd dashboard-v2 && python -c "from reports.views import report_sessions; print('OK')"`

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add dashboard-v2/reports/views.py
git commit -m "feat(reports): add report_sessions view with sort, pagination, prompt preview"
```

---

### Task 4: Create `detail.html` — main detail page template

**Files:**
- Create: `dashboard-v2/reports/templates/reports/detail.html`

- [ ] **Step 1: Create the template**

Create `dashboard-v2/reports/templates/reports/detail.html`:

```html
{% extends "base.html" %}
{% load static dashboard_tags token_filters %}

{% block title %}Report — {{ monday }}{% endblock %}

{% block content %}
<!-- Back link -->
<a href="{% url 'report_list' %}" style="display:inline-flex;align-items:center;gap:6px;color:var(--accent-purple-light);font-size:13px;margin-bottom:var(--spacing-md);">
    &larr; Retour aux reports
</a>

<!-- Header hero -->
<div style="background:linear-gradient(135deg,#E63946,#38BDF8);padding:20px 24px;border-radius:var(--radius-md);margin-bottom:var(--spacing-lg);">
    <div style="font-size:22px;font-weight:bold;color:white;">&#9781; Mugiwara Weekly</div>
    <div style="font-size:13px;color:rgba(255,255,255,0.8);margin-top:4px;">
        Semaine du {{ monday }} &mdash; {{ sunday }}
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-top:10px;">
        <span class="neon-badge neon-badge--{{ report.status|badge_class }}">{{ report.status }}</span>
        {% if report.generated_at %}
        <span style="font-size:11px;color:rgba(255,255,255,0.7);">
            G&eacute;n&eacute;r&eacute; {{ report.generated_at|timeago }}
        </span>
        {% endif %}
    </div>
</div>

<!-- KPIs -->
{% include "reports/partials/_report_kpis.html" %}

<!-- Filter bar -->
<div style="display:flex;gap:8px;margin-bottom:var(--spacing-md);align-items:center;flex-wrap:wrap;">
    <span style="font-size:12px;color:var(--text-dimmed);">Cat&eacute;gorie :</span>
    {% with cats=":|Pro:pro|POC:poc|Perso:perso" %}
    {% for cat_pair in cats|split:"|" %}
        {% with parts=cat_pair|split:":" %}
            {% with label=parts.0 display=parts.1|default:"Toutes" %}
                {% if label == category or label == "" and category == "" %}
                <span style="background:rgba(139,92,246,0.2);color:#c4b5fd;padding:4px 12px;border-radius:16px;font-size:12px;border:1px solid rgba(139,92,246,0.4);">
                    {% if label %}{{ label }}{% else %}Toutes{% endif %}
                </span>
                {% else %}
                <a href="?{% if label %}category={{ label }}{% endif %}"
                   style="background:rgba(139,92,246,0.06);color:var(--text-muted);padding:4px 12px;border-radius:16px;font-size:12px;text-decoration:none;">
                    {% if label %}{{ label }}{% else %}Toutes{% endif %}
                </a>
                {% endif %}
            {% endwith %}
        {% endwith %}
    {% endfor %}
    {% endwith %}

    <div style="margin-left:auto;">
        <button type="button" class="neon-btn neon-btn--sm" id="copy-email-html-btn"
                data-report-id="{{ report.pk }}" title="Copy email-ready HTML to clipboard">
            &#128203; Copy HTML for Email
        </button>
    </div>
</div>

<!-- Top agents & Projects -->
{% include "reports/partials/_report_agents_projects.html" %}

<!-- Sessions table (lazy-loaded via HTMX) -->
<div id="report-sessions"
     hx-get="{% url 'report_sessions' report.pk %}{% if category %}?category={{ category }}{% endif %}"
     hx-trigger="load"
     hx-swap="innerHTML">
    <div class="glass-card" style="text-align:center;padding:32px;">
        <span class="text-dimmed">Loading sessions...</span>
    </div>
</div>

<!-- Toast notification -->
<div id="copy-toast" style="display:none;position:fixed;bottom:24px;right:24px;z-index:9999;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;backdrop-filter:blur(16px);border:1px solid rgba(139,92,246,0.3);box-shadow:0 0 20px rgba(139,92,246,0.15);transition:opacity 0.3s ease;"></div>
{% endblock %}

{% block extra_js %}
<script>
(function() {
    const btn = document.getElementById('copy-email-html-btn');
    if (!btn) return;

    btn.addEventListener('click', async function() {
        const reportId = this.dataset.reportId;
        const toast = document.getElementById('copy-toast');
        const originalText = this.innerHTML;
        this.innerHTML = '&#8987; Copying...';
        this.disabled = true;

        try {
            const resp = await fetch(`/reports/${reportId}/email-html/`);
            if (!resp.ok) throw new Error('Failed to fetch email HTML');
            const data = await resp.json();
            if (!data.html) throw new Error('No HTML content');

            await navigator.clipboard.writeText(data.html);
            this.innerHTML = '&#10003; Copied!';
            showToast(toast, 'Email HTML copied to clipboard!', 'success');
            setTimeout(() => { this.innerHTML = originalText; this.disabled = false; }, 2000);
        } catch (err) {
            console.error('Copy failed:', err);
            this.innerHTML = '&#10007; Error';
            showToast(toast, 'Failed to copy: ' + err.message, 'error');
            setTimeout(() => { this.innerHTML = originalText; this.disabled = false; }, 2000);
        }
    });

    function showToast(el, message, type) {
        el.textContent = message;
        if (type === 'success') {
            el.style.background = 'rgba(16, 185, 129, 0.15)';
            el.style.color = '#34D399';
            el.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        } else {
            el.style.background = 'rgba(248, 113, 113, 0.15)';
            el.style.color = '#F87171';
            el.style.borderColor = 'rgba(248, 113, 113, 0.3)';
        }
        el.style.display = 'block';
        el.style.opacity = '1';
        setTimeout(() => {
            el.style.opacity = '0';
            setTimeout(() => { el.style.display = 'none'; }, 300);
        }, 3000);
    }
})();
</script>
{% endblock %}
```

**Important note on the filter bar:** The Django template language doesn't have a built-in `split` filter. The category filter pills need a simpler approach. Replace the `{% with cats=... %}` block with explicit links:

```html
<!-- Filter bar -->
<div style="display:flex;gap:8px;margin-bottom:var(--spacing-md);align-items:center;flex-wrap:wrap;">
    <span style="font-size:12px;color:var(--text-dimmed);">Cat&eacute;gorie :</span>

    {% if not category %}
    <span style="background:rgba(139,92,246,0.2);color:#c4b5fd;padding:4px 12px;border-radius:16px;font-size:12px;border:1px solid rgba(139,92,246,0.4);">Toutes</span>
    {% else %}
    <a href="{% url 'report_detail_page' report.pk %}" style="background:rgba(139,92,246,0.06);color:var(--text-muted);padding:4px 12px;border-radius:16px;font-size:12px;text-decoration:none;">Toutes</a>
    {% endif %}

    {% if category == "pro" %}
    <span style="background:rgba(59,130,246,0.2);color:#93C5FD;padding:4px 12px;border-radius:16px;font-size:12px;border:1px solid rgba(59,130,246,0.4);">Pro</span>
    {% else %}
    <a href="?category=pro" style="background:rgba(59,130,246,0.06);color:var(--text-muted);padding:4px 12px;border-radius:16px;font-size:12px;text-decoration:none;">Pro</a>
    {% endif %}

    {% if category == "poc" %}
    <span style="background:rgba(245,158,11,0.2);color:#FCD34D;padding:4px 12px;border-radius:16px;font-size:12px;border:1px solid rgba(245,158,11,0.4);">POC</span>
    {% else %}
    <a href="?category=poc" style="background:rgba(245,158,11,0.06);color:var(--text-muted);padding:4px 12px;border-radius:16px;font-size:12px;text-decoration:none;">POC</a>
    {% endif %}

    {% if category == "perso" %}
    <span style="background:rgba(16,185,129,0.2);color:#6EE7B7;padding:4px 12px;border-radius:16px;font-size:12px;border:1px solid rgba(16,185,129,0.4);">Perso</span>
    {% else %}
    <a href="?category=perso" style="background:rgba(16,185,129,0.06);color:var(--text-muted);padding:4px 12px;border-radius:16px;font-size:12px;text-decoration:none;">Perso</a>
    {% endif %}

    <div style="margin-left:auto;">
        <button type="button" class="neon-btn neon-btn--sm" id="copy-email-html-btn"
                data-report-id="{{ report.pk }}" title="Copy email-ready HTML to clipboard">
            &#128203; Copy HTML for Email
        </button>
    </div>
</div>
```

Use this explicit version in `detail.html` instead of the `{% with cats=... %}` block.

- [ ] **Step 2: Verify template renders without syntax errors**

Run: `cd dashboard-v2 && python -c "from django.template.loader import get_template; get_template('reports/detail.html'); print('OK')"`

Expected: `OK` (or Django settings error if not configured for CLI — that's fine, we'll test in browser)

- [ ] **Step 3: Commit**

```bash
git add dashboard-v2/reports/templates/reports/detail.html
git commit -m "feat(reports): create detail.html full-page report template"
```

---

### Task 5: Create `_report_kpis.html` partial

**Files:**
- Create: `dashboard-v2/reports/templates/reports/partials/_report_kpis.html`

- [ ] **Step 1: Create the KPI partial**

Create `dashboard-v2/reports/templates/reports/partials/_report_kpis.html`:

```html
{% load token_filters %}

<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:var(--spacing-lg);">
    <!-- Sessions -->
    <div class="glass-card" style="padding:14px;text-align:center;border-color:rgba(56,189,248,0.3);background:rgba(56,189,248,0.06);">
        <div style="font-size:22px;font-weight:bold;color:#38BDF8;">{{ total_sessions }}</div>
        <div style="font-size:10px;color:var(--text-dimmed);text-transform:uppercase;letter-spacing:1px;margin-top:2px;">Sessions</div>
    </div>
    <!-- Invocations -->
    <div class="glass-card" style="padding:14px;text-align:center;border-color:rgba(251,146,60,0.3);background:rgba(251,146,60,0.06);">
        <div style="font-size:22px;font-weight:bold;color:#FB923C;">{{ total_invocations }}</div>
        <div style="font-size:10px;color:var(--text-dimmed);text-transform:uppercase;letter-spacing:1px;margin-top:2px;">Invocations</div>
    </div>
    <!-- Tokens -->
    <div class="glass-card" style="padding:14px;text-align:center;border-color:rgba(167,139,250,0.3);background:rgba(167,139,250,0.06);">
        <div style="font-size:22px;font-weight:bold;color:#A78BFA;">{{ total_tokens|format_tokens }}</div>
        <div style="font-size:10px;color:var(--text-dimmed);text-transform:uppercase;letter-spacing:1px;margin-top:2px;">Tokens</div>
    </div>
    <!-- Cost -->
    <div class="glass-card" style="padding:14px;text-align:center;border-color:rgba(16,185,129,0.3);background:rgba(16,185,129,0.06);">
        <div style="font-size:22px;font-weight:bold;color:#10B981;">{{ total_cost|format_cost }}</div>
        <div style="font-size:10px;color:var(--text-dimmed);text-transform:uppercase;letter-spacing:1px;margin-top:2px;">Co&ucirc;t</div>
    </div>
    <!-- Agents -->
    <div class="glass-card" style="padding:14px;text-align:center;border-color:rgba(244,114,182,0.3);background:rgba(244,114,182,0.06);">
        <div style="font-size:22px;font-weight:bold;color:#F472B6;">{{ unique_agents }}</div>
        <div style="font-size:10px;color:var(--text-dimmed);text-transform:uppercase;letter-spacing:1px;margin-top:2px;">Agents</div>
    </div>
    <!-- Cache Hit -->
    <div class="glass-card" style="padding:14px;text-align:center;border-color:rgba(34,211,238,0.3);background:rgba(34,211,238,0.06);">
        <div style="font-size:22px;font-weight:bold;color:#22D3EE;">{{ cache_hit_rate|floatformat:0 }}%</div>
        <div style="font-size:10px;color:var(--text-dimmed);text-transform:uppercase;letter-spacing:1px;margin-top:2px;">Cache Hit</div>
    </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add dashboard-v2/reports/templates/reports/partials/_report_kpis.html
git commit -m "feat(reports): create KPI cards partial with 6 colored metrics"
```

---

### Task 6: Create `_report_agents_projects.html` partial

**Files:**
- Create: `dashboard-v2/reports/templates/reports/partials/_report_agents_projects.html`

- [ ] **Step 1: Create the agents/projects partial**

Create `dashboard-v2/reports/templates/reports/partials/_report_agents_projects.html`:

```html
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:var(--spacing-lg);">
    <!-- Top Agents -->
    <div class="glass-card" style="padding:16px;">
        <div style="font-size:11px;font-weight:bold;color:var(--text-dimmed);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Top Agents</div>
        {% for agent in top_agents %}
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
            <span style="color:var(--text-primary);font-size:12px;width:110px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">{{ agent.agent }}</span>
            <div style="flex:1;background:rgba(255,255,255,0.06);border-radius:4px;height:16px;">
                <div style="background:var(--accent-purple);border-radius:4px;height:16px;width:{{ agent.width }}%;min-width:4px;"></div>
            </div>
            <span style="color:var(--text-dimmed);font-size:11px;width:28px;text-align:right;">{{ agent.count }}</span>
        </div>
        {% empty %}
        <p class="text-dimmed" style="font-size:12px;font-style:italic;">Aucune invocation cette semaine</p>
        {% endfor %}
    </div>

    <!-- Projects & Subjects -->
    <div class="glass-card" style="padding:16px;">
        <div style="font-size:11px;font-weight:bold;color:var(--text-dimmed);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Projets</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
            {% for proj in top_projects %}
            <span style="background:rgba(59,130,246,0.12);color:#93C5FD;padding:3px 10px;border-radius:12px;font-size:11px;">{{ proj.project }}</span>
            {% empty %}
            <span class="text-dimmed" style="font-size:12px;font-style:italic;">Aucun projet</span>
            {% endfor %}
        </div>

        <div style="font-size:11px;font-weight:bold;color:var(--text-dimmed);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Sujets</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;">
            {% for sujet in subjects %}
            <span style="background:rgba(16,185,129,0.12);color:#6EE7B7;padding:3px 10px;border-radius:12px;font-size:11px;">{{ sujet|truncatechars:60 }}</span>
            {% empty %}
            <span class="text-dimmed" style="font-size:12px;font-style:italic;">Aucun sujet</span>
            {% endfor %}
        </div>
    </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add dashboard-v2/reports/templates/reports/partials/_report_agents_projects.html
git commit -m "feat(reports): create agents/projects partial with progress bars and badges"
```

---

### Task 7: Create `_report_sessions.html` partial

**Files:**
- Create: `dashboard-v2/reports/templates/reports/partials/_report_sessions.html`

- [ ] **Step 1: Create the sessions table partial**

Create `dashboard-v2/reports/templates/reports/partials/_report_sessions.html`:

```html
{% load token_filters %}

<div class="glass-card" style="padding:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-size:11px;font-weight:bold;color:var(--text-dimmed);text-transform:uppercase;letter-spacing:1px;">
            Sessions de la semaine ({{ total_sessions }})
        </div>
        <div style="display:flex;gap:6px;">
            <a href="#" class="table-sort"
               hx-get="{% url 'report_sessions' report.pk %}?sort=cost&order={% if sort_field == 'cost' and sort_order == 'desc' %}asc{% else %}desc{% endif %}&category={{ category }}"
               hx-target="#report-sessions" hx-swap="innerHTML"
               style="font-size:11px;padding:3px 8px;border-radius:4px;text-decoration:none;{% if sort_field == 'cost' %}background:rgba(139,92,246,0.15);color:#a78bfa;{% else %}color:var(--text-dimmed);{% endif %}">
                Co&ucirc;t {% if sort_field == 'cost' %}{% if sort_order == 'desc' %}&darr;{% else %}&uarr;{% endif %}{% endif %}
            </a>
            <a href="#" class="table-sort"
               hx-get="{% url 'report_sessions' report.pk %}?sort=tokens&order={% if sort_field == 'tokens' and sort_order == 'desc' %}asc{% else %}desc{% endif %}&category={{ category }}"
               hx-target="#report-sessions" hx-swap="innerHTML"
               style="font-size:11px;padding:3px 8px;border-radius:4px;text-decoration:none;{% if sort_field == 'tokens' %}background:rgba(139,92,246,0.15);color:#a78bfa;{% else %}color:var(--text-dimmed);{% endif %}">
                Tokens {% if sort_field == 'tokens' %}{% if sort_order == 'desc' %}&darr;{% else %}&uarr;{% endif %}{% endif %}
            </a>
            <a href="#" class="table-sort"
               hx-get="{% url 'report_sessions' report.pk %}?sort=date&order={% if sort_field == 'date' and sort_order == 'desc' %}asc{% else %}desc{% endif %}&category={{ category }}"
               hx-target="#report-sessions" hx-swap="innerHTML"
               style="font-size:11px;padding:3px 8px;border-radius:4px;text-decoration:none;{% if sort_field == 'date' %}background:rgba(139,92,246,0.15);color:#a78bfa;{% else %}color:var(--text-dimmed);{% endif %}">
                Date {% if sort_field == 'date' %}{% if sort_order == 'desc' %}&darr;{% else %}&uarr;{% endif %}{% endif %}
            </a>
            <a href="#" class="table-sort"
               hx-get="{% url 'report_sessions' report.pk %}?sort=messages&order={% if sort_field == 'messages' and sort_order == 'desc' %}asc{% else %}desc{% endif %}&category={{ category }}"
               hx-target="#report-sessions" hx-swap="innerHTML"
               style="font-size:11px;padding:3px 8px;border-radius:4px;text-decoration:none;{% if sort_field == 'messages' %}background:rgba(139,92,246,0.15);color:#a78bfa;{% else %}color:var(--text-dimmed);{% endif %}">
                Msgs {% if sort_field == 'messages' %}{% if sort_order == 'desc' %}&darr;{% else %}&uarr;{% endif %}{% endif %}
            </a>
        </div>
    </div>

    {% for s in sessions %}
    <div style="border:1px solid rgba(255,255,255,0.06);border-radius:6px;padding:12px;margin-bottom:8px;cursor:pointer;transition:border-color 0.2s;"
         onmouseover="this.style.borderColor='rgba(139,92,246,0.3)'"
         onmouseout="this.style.borderColor='rgba(255,255,255,0.06)'"
         hx-get="{% url 'token_session_detail' s.session_id %}"
         hx-target="#drawer-body"
         hx-swap="innerHTML"
         onclick="document.getElementById('drawer').classList.add('open');document.getElementById('drawer-overlay').classList.add('open');document.getElementById('drawer-title').textContent='Session {{ s.session_id|truncatechars:20 }}';">

        <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="display:flex;align-items:center;gap:8px;">
                <span style="color:var(--text-primary);font-size:13px;font-weight:500;font-family:var(--font-mono);">{{ s.session_id|truncatechars:14 }}</span>
                <span style="color:var(--text-dimmed);font-size:11px;">{{ s.project }}</span>
                {% if s.category %}
                <span style="padding:1px 6px;border-radius:8px;font-size:10px;
                    {% if s.category == 'pro' %}background:rgba(59,130,246,0.12);color:#93C5FD;
                    {% elif s.category == 'poc' %}background:rgba(245,158,11,0.12);color:#FCD34D;
                    {% elif s.category == 'perso' %}background:rgba(16,185,129,0.12);color:#6EE7B7;
                    {% endif %}">{{ s.category }}</span>
                {% endif %}
            </div>
            <div style="display:flex;gap:16px;align-items:center;">
                <span style="color:#A78BFA;font-size:12px;">{{ s.total_tokens|format_tokens }} tok</span>
                <span style="color:#10B981;font-size:12px;font-weight:500;">{{ s.total_cost|format_cost }}</span>
                <span style="color:var(--text-dimmed);font-size:11px;">{{ s.first_ts|date:"d/m" }}</span>
            </div>
        </div>

        {% if s.first_prompt %}
        <div style="margin-top:6px;color:var(--text-muted);font-size:12px;font-style:italic;border-left:2px solid rgba(139,92,246,0.3);padding-left:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            {{ s.first_prompt|truncatechars:120 }}
        </div>
        {% endif %}
    </div>
    {% empty %}
    <div style="text-align:center;color:var(--text-dimmed);padding:24px;">
        Aucune session trouv&eacute;e pour cette semaine.
    </div>
    {% endfor %}

    <!-- Pagination -->
    {% if total_pages > 1 %}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06);">
        <span style="color:var(--text-dimmed);font-size:11px;">{{ total_sessions }} sessions &mdash; page {{ page }}/{{ total_pages }}</span>
        <div style="display:flex;gap:6px;">
            {% if has_prev %}
            <a href="#" class="table-sort"
               hx-get="{% url 'report_sessions' report.pk %}?page={{ prev_page }}&sort={{ sort_field }}&order={{ sort_order }}&category={{ category }}"
               hx-target="#report-sessions" hx-swap="innerHTML"
               style="font-size:11px;padding:3px 8px;border-radius:4px;text-decoration:none;color:#a78bfa;">
                &larr; Prev
            </a>
            {% else %}
            <span style="font-size:11px;padding:3px 8px;color:var(--text-dimmed);">&larr; Prev</span>
            {% endif %}

            {% if has_next %}
            <a href="#" class="table-sort"
               hx-get="{% url 'report_sessions' report.pk %}?page={{ next_page }}&sort={{ sort_field }}&order={{ sort_order }}&category={{ category }}"
               hx-target="#report-sessions" hx-swap="innerHTML"
               style="font-size:11px;padding:3px 8px;border-radius:4px;text-decoration:none;background:rgba(139,92,246,0.15);color:#a78bfa;">
                Next &rarr;
            </a>
            {% else %}
            <span style="font-size:11px;padding:3px 8px;color:var(--text-dimmed);">Next &rarr;</span>
            {% endif %}
        </div>
    </div>
    {% endif %}
</div>
```

- [ ] **Step 2: Commit**

```bash
git add dashboard-v2/reports/templates/reports/partials/_report_sessions.html
git commit -m "feat(reports): create sessions table partial with sort, pagination, prompt preview"
```

---

### Task 8: Modify `index.html` — change report cards to page links

**Files:**
- Modify: `dashboard-v2/reports/templates/reports/index.html`

- [ ] **Step 1: Replace drawer cards with page links**

In `dashboard-v2/reports/templates/reports/index.html`, replace the report card `<div>` (lines 21-41) with an `<a>` tag. Change this:

```html
    <div class="glass-card crew-card"
         data-drawer-url="{% url 'report_detail' report.pk %}"
         data-drawer-title="Report — {{ report.week_start }}"
         role="button"
         tabindex="0">

        <div class="crew-card__header">
            <span class="crew-card__name">Week of {{ report.week_start }}</span>
            <span class="neon-badge neon-badge--{{ report.status|badge_class }}">{{ report.status }}</span>
        </div>

        <p class="crew-card__desc">
            {{ report.week_start }} &mdash; {{ report.week_end }}
        </p>

        <div class="crew-card__footer">
            {% if report.generated_at %}
            <span class="crew-card__stat">Generated {{ report.generated_at|timeago }}</span>
            {% endif %}
        </div>
    </div>
```

To this:

```html
    <a href="{% url 'report_detail_page' report.pk %}" class="glass-card crew-card" style="text-decoration:none;color:inherit;display:block;">
        <div class="crew-card__header">
            <span class="crew-card__name">Week of {{ report.week_start }}</span>
            <span class="neon-badge neon-badge--{{ report.status|badge_class }}">{{ report.status }}</span>
        </div>

        <p class="crew-card__desc">
            {{ report.week_start }} &mdash; {{ report.week_end }}
        </p>

        <div class="crew-card__footer">
            {% if report.generated_at %}
            <span class="crew-card__stat">Generated {{ report.generated_at|timeago }}</span>
            {% endif %}
        </div>
    </a>
```

- [ ] **Step 2: Commit**

```bash
git add dashboard-v2/reports/templates/reports/index.html
git commit -m "refactor(reports): change report cards from drawer to full-page links"
```

---

### Task 9: Manual test in browser

- [ ] **Step 1: Start the dev server**

Run: `cd dashboard-v2 && python manage.py runserver`

- [ ] **Step 2: Test the reports list page**

Navigate to `http://localhost:8000/reports/`. Verify:
- Report cards are clickable links (not drawer triggers)
- Clicking a card navigates to `/reports/<id>/detail/`

- [ ] **Step 3: Test the detail page**

On the detail page, verify:
- Back link works (returns to `/reports/`)
- Header hero shows gradient, title, dates, status badge
- 6 KPI cards display with correct colors
- Category filter pills are visible
- Top agents show progress bars
- Projects and subjects show as badge pills
- Sessions table loads via HTMX

- [ ] **Step 4: Test category filters**

Click each category pill (Pro, POC, Perso, Toutes). Verify:
- KPIs update to reflect filtered data
- Top agents/projects update
- Sessions table reloads with filtered data
- Active pill is highlighted

- [ ] **Step 5: Test sessions table**

Verify:
- Sort buttons work (Cost, Tokens, Date, Msgs)
- Pagination works (if more than 20 sessions)
- First prompt preview appears under session rows
- Clicking a session row opens the drawer with session detail

- [ ] **Step 6: Test Copy HTML Email button**

Click the Copy HTML Email button. Verify:
- Toast appears with success message
- Clipboard contains email HTML

- [ ] **Step 7: Commit any fixes**

If any fixes were needed during testing:
```bash
git add -u
git commit -m "fix(reports): address issues found during manual testing"
```
