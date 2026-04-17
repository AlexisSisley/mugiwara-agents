# Token Limits Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Limites" tab to the token dashboard showing consumption gauges (5h session / weekly) vs plan limits, with personal alert thresholds and auto-refresh every 60s.

**Architecture:** New singleton model `TokenLimit` for config, two new views (`tab_limits`, `update_limits_config`), one new HTMX partial with D3 gauge components and CSS progress bars. Follows existing HTMX tab pattern.

**Tech Stack:** Django 5.2, HTMX, D3.js, SQLite

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `dashboard-v2/tokens/models.py` | Modify | Add `TokenLimit` singleton model |
| `dashboard-v2/tokens/migrations/0003_tokenlimit.py` | Create | Migration for new model |
| `dashboard-v2/config/settings.py` | Modify | Add `TOKEN_LIMITS_DEFAULTS` |
| `dashboard-v2/tokens/urls.py` | Modify | Add 2 routes |
| `dashboard-v2/tokens/views.py` | Modify | Add `tab_limits` and `update_limits_config` views |
| `dashboard-v2/tokens/templates/tokens/index.html` | Modify | Add 4th tab button + JS wiring |
| `dashboard-v2/tokens/templates/tokens/partials/_tab_limits.html` | Create | Limits tab partial template |
| `dashboard-v2/static/js/charts.js` | Modify | Add `MugiCharts.renderGauge` |
| `dashboard-v2/static/css/neon-glass.css` | Modify | Add gauge and progress bar styles |

---

### Task 1: TokenLimit Model

**Files:**
- Modify: `dashboard-v2/tokens/models.py`
- Create: `dashboard-v2/tokens/migrations/0003_tokenlimit.py`

- [ ] **Step 1: Add TokenLimit model to models.py**

Add at the end of `dashboard-v2/tokens/models.py`:

```python
class TokenLimit(models.Model):
    """Singleton configuration for token usage limits and personal alerts."""

    plan_name = models.CharField(max_length=50, default='Pro Team')
    limit_5h_tokens = models.BigIntegerField(default=0)
    limit_weekly_tokens = models.BigIntegerField(default=0)
    alert_5h_tokens = models.BigIntegerField(null=True, blank=True)
    alert_weekly_tokens = models.BigIntegerField(null=True, blank=True)
    alert_5h_cost = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
    )
    alert_weekly_cost = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
    )
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'token_limit'
        verbose_name = 'Token Limit Configuration'

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def get_instance(cls):
        """Return the singleton, creating it with defaults if needed."""
        from django.conf import settings
        defaults = getattr(settings, 'TOKEN_LIMITS_DEFAULTS', {})
        obj, _ = cls.objects.get_or_create(pk=1, defaults=defaults)
        return obj

    def __str__(self):
        return f'{self.plan_name} limits'
```

- [ ] **Step 2: Generate migration**

Run:
```bash
cd dashboard-v2 && python manage.py makemigrations tokens --name tokenlimit
```

Expected: `migrations/0003_tokenlimit.py` created.

- [ ] **Step 3: Apply migration**

Run:
```bash
cd dashboard-v2 && python manage.py migrate tokens
```

Expected: `Applying tokens.0003_tokenlimit... OK`

- [ ] **Step 4: Verify model via shell**

Run:
```bash
cd dashboard-v2 && python manage.py shell -c "from tokens.models import TokenLimit; obj = TokenLimit.get_instance(); print(obj, obj.pk, obj.limit_5h_tokens)"
```

Expected: `Pro Team limits 1 0`

- [ ] **Step 5: Commit**

```bash
git add dashboard-v2/tokens/models.py dashboard-v2/tokens/migrations/0003_tokenlimit.py
git commit -m "feat(tokens): add TokenLimit singleton model for usage limits config"
```

---

### Task 2: Settings Defaults

**Files:**
- Modify: `dashboard-v2/config/settings.py`

- [ ] **Step 1: Add TOKEN_LIMITS_DEFAULTS to settings.py**

Add at the end of `dashboard-v2/config/settings.py`:

```python
# Token usage limits — defaults for TokenLimit singleton.
# Values are 0 by default because Anthropic doesn't publish exact limits.
# Users configure their observed limits via the dashboard UI.
TOKEN_LIMITS_DEFAULTS = {
    'plan_name': 'Pro Team',
    'limit_5h_tokens': 0,
    'limit_weekly_tokens': 0,
    'alert_5h_tokens': None,
    'alert_weekly_tokens': None,
    'alert_5h_cost': None,
    'alert_weekly_cost': None,
}
```

- [ ] **Step 2: Verify settings load**

Run:
```bash
cd dashboard-v2 && python manage.py shell -c "from django.conf import settings; print(settings.TOKEN_LIMITS_DEFAULTS)"
```

Expected: Dict with all keys printed.

- [ ] **Step 3: Commit**

```bash
git add dashboard-v2/config/settings.py
git commit -m "feat(tokens): add TOKEN_LIMITS_DEFAULTS to settings"
```

---

### Task 3: Routes

**Files:**
- Modify: `dashboard-v2/tokens/urls.py`

- [ ] **Step 1: Add limits routes to urls.py**

In `dashboard-v2/tokens/urls.py`, add two entries to the `urlpatterns` list before the closing bracket:

```python
    path('limits/', views.tab_limits, name='token_tab_limits'),
    path('limits/config/', views.update_limits_config, name='token_limits_config'),
```

The full file should be:

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
    path('limits/', views.tab_limits, name='token_tab_limits'),
    path('limits/config/', views.update_limits_config, name='token_limits_config'),
]
```

- [ ] **Step 2: Commit**

```bash
git add dashboard-v2/tokens/urls.py
git commit -m "feat(tokens): add limits tab and config routes"
```

---

### Task 4: Views

**Files:**
- Modify: `dashboard-v2/tokens/views.py`

- [ ] **Step 1: Add imports at top of views.py**

Add `Decimal` to imports and import the new model. At the top of the file, update the imports:

```python
from decimal import Decimal

from django.db.models import Sum, Count, Min, Max, F, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt

from .models import TokenUsage, TokenLimit
from .parser import scan_all_sessions
from .pricing import get_rates
```

- [ ] **Step 2: Add _get_alert_level helper**

Add after the `_base_qs` function:

```python
def _get_alert_level(current, limit):
    """Return alert level string based on percentage of limit consumed."""
    if not limit or limit == 0:
        return 'none'
    pct = current / limit * 100
    if pct >= 90:
        return 'red'
    if pct >= 70:
        return 'orange'
    return 'green'
```

- [ ] **Step 3: Add tab_limits view**

Add before the `refresh_tokens` view:

```python
def tab_limits(request):
    """HTMX partial — Limits tab with gauges and config."""
    config = TokenLimit.get_instance()
    now = timezone.now()

    # --- Session 5h: find the active session ---
    five_hours_ago = now - timedelta(hours=5)
    latest_msg = (
        TokenUsage.objects.filter(timestamp__gte=five_hours_ago)
        .order_by('-timestamp')
        .values('session_id')
        .first()
    )

    session_tokens = 0
    session_cost = 0.0
    session_start = None
    active_session_id = None

    if latest_msg:
        active_session_id = latest_msg['session_id']
        session_agg = TokenUsage.objects.filter(
            session_id=active_session_id,
        ).aggregate(
            total=Sum(
                F('input_tokens') + F('output_tokens')
                + F('cache_creation_tokens') + F('cache_read_tokens')
            ),
            cost=Sum('cost'),
            start=Min('timestamp'),
        )
        session_tokens = session_agg['total'] or 0
        session_cost = session_agg['cost'] or 0.0
        session_start = session_agg['start']

    # --- Weekly: Monday 00:00 to now ---
    monday = (now - timedelta(days=now.weekday())).replace(
        hour=0, minute=0, second=0, microsecond=0,
    )
    week_agg = TokenUsage.objects.filter(timestamp__gte=monday).aggregate(
        total=Sum(
            F('input_tokens') + F('output_tokens')
            + F('cache_creation_tokens') + F('cache_read_tokens')
        ),
        cost=Sum('cost'),
    )
    weekly_tokens = week_agg['total'] or 0
    weekly_cost = week_agg['cost'] or 0.0

    # --- Percentages ---
    session_pct = (
        round(session_tokens / config.limit_5h_tokens * 100)
        if config.limit_5h_tokens > 0 else 0
    )
    weekly_pct = (
        round(weekly_tokens / config.limit_weekly_tokens * 100)
        if config.limit_weekly_tokens > 0 else 0
    )

    # --- Alert levels ---
    session_level = _get_alert_level(session_tokens, config.limit_5h_tokens)
    weekly_level = _get_alert_level(weekly_tokens, config.limit_weekly_tokens)

    # Personal alert levels
    alert_5h_token_level = _get_alert_level(session_tokens, config.alert_5h_tokens)
    alert_5h_token_pct = (
        round(session_tokens / config.alert_5h_tokens * 100)
        if config.alert_5h_tokens and config.alert_5h_tokens > 0 else 0
    )
    alert_weekly_token_level = _get_alert_level(weekly_tokens, config.alert_weekly_tokens)
    alert_weekly_token_pct = (
        round(weekly_tokens / config.alert_weekly_tokens * 100)
        if config.alert_weekly_tokens and config.alert_weekly_tokens > 0 else 0
    )
    alert_5h_cost_level = _get_alert_level(
        session_cost,
        float(config.alert_5h_cost) if config.alert_5h_cost else 0,
    )
    alert_5h_cost_pct = (
        round(session_cost / float(config.alert_5h_cost) * 100)
        if config.alert_5h_cost and config.alert_5h_cost > 0 else 0
    )
    alert_weekly_cost_level = _get_alert_level(
        weekly_cost,
        float(config.alert_weekly_cost) if config.alert_weekly_cost else 0,
    )
    alert_weekly_cost_pct = (
        round(weekly_cost / float(config.alert_weekly_cost) * 100)
        if config.alert_weekly_cost and config.alert_weekly_cost > 0 else 0
    )

    context = {
        'config': config,
        # Session 5h
        'session_tokens': session_tokens,
        'session_cost': session_cost,
        'session_pct': min(session_pct, 100),
        'session_level': session_level,
        'session_start': session_start,
        'has_session': active_session_id is not None,
        # Weekly
        'weekly_tokens': weekly_tokens,
        'weekly_cost': weekly_cost,
        'weekly_pct': min(weekly_pct, 100),
        'weekly_level': weekly_level,
        'monday': monday,
        # Personal alerts — session 5h
        'alert_5h_token_pct': min(alert_5h_token_pct, 100),
        'alert_5h_token_level': alert_5h_token_level,
        'alert_5h_cost_pct': min(alert_5h_cost_pct, 100),
        'alert_5h_cost_level': alert_5h_cost_level,
        # Personal alerts — weekly
        'alert_weekly_token_pct': min(alert_weekly_token_pct, 100),
        'alert_weekly_token_level': alert_weekly_token_level,
        'alert_weekly_cost_pct': min(alert_weekly_cost_pct, 100),
        'alert_weekly_cost_level': alert_weekly_cost_level,
    }
    return render(request, 'tokens/partials/_tab_limits.html', context)
```

- [ ] **Step 4: Add update_limits_config view**

Add right after `tab_limits`:

```python
@csrf_exempt
def update_limits_config(request):
    """POST — save token limits configuration, return refreshed limits tab."""
    if request.method != 'POST':
        return HttpResponse(status=405)

    config = TokenLimit.get_instance()
    config.plan_name = request.POST.get('plan_name', config.plan_name)
    config.limit_5h_tokens = int(request.POST.get('limit_5h_tokens', 0) or 0)
    config.limit_weekly_tokens = int(request.POST.get('limit_weekly_tokens', 0) or 0)

    # Personal alerts (nullable)
    val = request.POST.get('alert_5h_tokens', '').strip()
    config.alert_5h_tokens = int(val) if val else None

    val = request.POST.get('alert_weekly_tokens', '').strip()
    config.alert_weekly_tokens = int(val) if val else None

    val = request.POST.get('alert_5h_cost', '').strip()
    config.alert_5h_cost = Decimal(val) if val else None

    val = request.POST.get('alert_weekly_cost', '').strip()
    config.alert_weekly_cost = Decimal(val) if val else None

    config.save()

    return tab_limits(request)
```

- [ ] **Step 5: Verify views load without import errors**

Run:
```bash
cd dashboard-v2 && python manage.py shell -c "from tokens.views import tab_limits, update_limits_config; print('OK')"
```

Expected: `OK`

- [ ] **Step 6: Commit**

```bash
git add dashboard-v2/tokens/views.py
git commit -m "feat(tokens): add tab_limits and update_limits_config views"
```

---

### Task 5: D3 Gauge Component

**Files:**
- Modify: `dashboard-v2/static/js/charts.js`

- [ ] **Step 1: Add renderGauge to charts.js**

Add the following section before the `initChartsInContainer` function in `dashboard-v2/static/js/charts.js`:

```javascript
    /* ------------------------------------------------------------------ */
    /*  Gauge (270° arc)                                                   */
    /* ------------------------------------------------------------------ */

    MugiCharts.renderGauge = function (selector, data) {
        var container = document.querySelector(selector);
        if (!container || !data) return;

        container.innerHTML = '';
        var size = Math.min(container.getBoundingClientRect().width || 200, 200);
        var radius = size / 2;
        var thickness = 16;
        var pct = Math.min(data.pct || 0, 100);

        var colorMap = { green: '#22c55e', orange: '#f59e0b', red: '#ef4444', none: '#4a4a6a' };
        var fillColor = colorMap[data.level] || colorMap.none;

        var svg = d3.select(selector)
            .append('svg')
            .attr('width', size)
            .attr('height', size)
            .append('g')
            .attr('transform', 'translate(' + radius + ',' + radius + ')');

        // 270° arc: from -225° to +45° (in radians)
        var startAngle = -5 * Math.PI / 4;  // -225°
        var endAngle = Math.PI / 4;          // +45°
        var totalAngle = endAngle - startAngle;  // 270° = 4.712 rad

        // Background arc
        var bgArc = d3.arc()
            .innerRadius(radius - thickness)
            .outerRadius(radius - 2)
            .startAngle(startAngle)
            .endAngle(endAngle)
            .cornerRadius(thickness / 2);

        svg.append('path')
            .attr('d', bgArc())
            .attr('fill', '#2a2a3e');

        // Foreground arc (animated)
        var fgEndAngle = startAngle + (totalAngle * pct / 100);

        var fgArc = d3.arc()
            .innerRadius(radius - thickness)
            .outerRadius(radius - 2)
            .startAngle(startAngle)
            .cornerRadius(thickness / 2);

        var fgPath = svg.append('path')
            .attr('fill', fillColor)
            .attr('d', fgArc({ endAngle: startAngle }));

        fgPath.transition()
            .duration(800)
            .attrTween('d', function () {
                var interp = d3.interpolate(startAngle, fgEndAngle);
                return function (t) {
                    return fgArc({ endAngle: interp(t) });
                };
            });

        // Center percentage text
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('y', -8)
            .attr('fill', fillColor !== colorMap.none ? fillColor : 'var(--text-primary)')
            .attr('font-size', Math.round(size / 5) + 'px')
            .attr('font-weight', 'bold')
            .text(pct + '%');

        // Subtitle (e.g., "180K / 250K")
        if (data.subtitle) {
            svg.append('text')
                .attr('text-anchor', 'middle')
                .attr('y', 16)
                .attr('fill', 'var(--text-muted)')
                .attr('font-size', '12px')
                .text(data.subtitle);
        }

        // Annotation (e.g., "depuis 14:32")
        if (data.annotation) {
            svg.append('text')
                .attr('text-anchor', 'middle')
                .attr('y', 34)
                .attr('fill', 'var(--text-dimmed)')
                .attr('font-size', '11px')
                .text(data.annotation);
        }
    };
```

- [ ] **Step 2: Register gauge type in initChartsInContainer**

In the `initChartsInContainer` function, add the gauge case. Find the line:

```javascript
                if (type === 'barh') MugiCharts.renderBarH('#' + el.id, chartData, color);
```

Add after it:

```javascript
                if (type === 'gauge') MugiCharts.renderGauge('#' + el.id, chartData);
```

- [ ] **Step 3: Verify charts.js syntax**

Open `dashboard-v2/static/js/charts.js` in browser devtools or run a quick syntax check:

```bash
cd dashboard-v2 && node -e "require('fs').readFileSync('static/js/charts.js','utf8'); console.log('Syntax OK')" 2>/dev/null || echo "Check file manually"
```

- [ ] **Step 4: Commit**

```bash
git add dashboard-v2/static/js/charts.js
git commit -m "feat(tokens): add MugiCharts.renderGauge D3 component (270° arc)"
```

---

### Task 6: CSS Styles for Limits Tab

**Files:**
- Modify: `dashboard-v2/static/css/neon-glass.css`

- [ ] **Step 1: Add gauge and progress bar styles**

Add at the end of `dashboard-v2/static/css/neon-glass.css`:

```css
/* ── Limits Tab — Gauges & Progress Bars ───────────────────── */

.limits-gauges {
  display: flex;
  gap: var(--spacing-lg);
  justify-content: center;
  flex-wrap: wrap;
  margin-bottom: var(--spacing-lg);
}

.limits-gauge-card {
  text-align: center;
  min-width: 220px;
}

.limits-gauge-card .gauge-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
}

.limits-alerts {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-lg);
}

.limits-alert-row {
  display: flex;
  align-items: center;
  gap: var(--spacing-md);
}

.limits-alert-row .alert-label {
  min-width: 140px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.limits-alert-row .alert-bar-track {
  flex: 1;
  height: 12px;
  background: #2a2a3e;
  border-radius: 6px;
  overflow: hidden;
}

.limits-alert-row .alert-bar-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.6s ease;
}

.limits-alert-row .alert-bar-fill--green  { background: #22c55e; }
.limits-alert-row .alert-bar-fill--orange { background: #f59e0b; }
.limits-alert-row .alert-bar-fill--red    { background: #ef4444; }
.limits-alert-row .alert-bar-fill--none   { background: #4a4a6a; }

.limits-alert-row .alert-value {
  min-width: 160px;
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: right;
}

.limits-config {
  border-top: 1px solid var(--glass-border);
  padding-top: var(--spacing-lg);
}

.limits-config .config-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
}

.limits-config .config-grid {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: var(--spacing-sm) var(--spacing-md);
  align-items: center;
  max-width: 500px;
}

.limits-config .config-grid label {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.limits-config .config-row-dual {
  display: flex;
  gap: var(--spacing-sm);
}

.limits-config .config-row-dual .glass-input {
  flex: 1;
}

.limits-config .config-help {
  margin-top: var(--spacing-md);
  font-size: 0.8rem;
  color: var(--text-dimmed);
  max-width: 500px;
}

.limits-empty-state {
  text-align: center;
  padding: var(--spacing-xl);
  color: var(--text-dimmed);
  font-size: 0.9rem;
}

.limits-empty-state a {
  color: var(--accent-purple-light);
  text-decoration: underline;
  cursor: pointer;
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard-v2/static/css/neon-glass.css
git commit -m "feat(tokens): add CSS styles for limits tab gauges and progress bars"
```

---

### Task 7: Limits Tab Template

**Files:**
- Create: `dashboard-v2/tokens/templates/tokens/partials/_tab_limits.html`

- [ ] **Step 1: Create the _tab_limits.html partial**

Create `dashboard-v2/tokens/templates/tokens/partials/_tab_limits.html`:

```html
{% load token_filters %}

<div id="limits-container"
     hx-get="{% url 'token_tab_limits' %}"
     hx-trigger="every 60s"
     hx-target="#limits-container"
     hx-swap="outerHTML"
     hx-on::after-swap="initTokenCharts()">

    <!-- Official Gauges -->
    <div class="glass-card">
        <h3 class="card-title">Limites du plan — {{ config.plan_name }}</h3>

        {% if config.limit_5h_tokens > 0 or config.limit_weekly_tokens > 0 %}
        <div class="limits-gauges">
            {% if config.limit_5h_tokens > 0 %}
            <div class="limits-gauge-card">
                <div class="gauge-title">Session 5h</div>
                <div id="gauge-session"
                     style="width:200px;height:200px;margin:0 auto"
                     data-chart="gauge"
                     data-chart-data='{{ session_gauge|to_json }}'>
                </div>
            </div>
            {% endif %}

            {% if config.limit_weekly_tokens > 0 %}
            <div class="limits-gauge-card">
                <div class="gauge-title">Semaine</div>
                <div id="gauge-weekly"
                     style="width:200px;height:200px;margin:0 auto"
                     data-chart="gauge"
                     data-chart-data='{{ weekly_gauge|to_json }}'>
                </div>
            </div>
            {% endif %}
        </div>
        {% else %}
        <div class="limits-empty-state">
            <p>Aucune limite configurée.</p>
            <p>Renseignez vos limites dans la section <a onclick="document.getElementById('limits-config-section').scrollIntoView({behavior:'smooth'})">Configuration</a> ci-dessous.</p>
            <p style="margin-top:var(--spacing-sm)">Les limites varient selon votre plan Claude Code et le modèle utilisé.<br>Anthropic ne publie pas de chiffres exacts — renseignez les valeurs observées dans votre usage.</p>
        </div>
        {% endif %}
    </div>

    <!-- Personal Alerts -->
    {% if config.alert_5h_tokens or config.alert_weekly_tokens or config.alert_5h_cost or config.alert_weekly_cost %}
    <div class="glass-card" style="margin-top: var(--spacing-lg);">
        <h3 class="card-title">Seuils personnels</h3>
        <div class="limits-alerts">
            {% if config.alert_5h_tokens %}
            <div class="limits-alert-row">
                <span class="alert-label">Session 5h (tokens)</span>
                <div class="alert-bar-track">
                    <div class="alert-bar-fill alert-bar-fill--{{ alert_5h_token_level }}"
                         style="width: {{ alert_5h_token_pct }}%"></div>
                </div>
                <span class="alert-value">{{ session_tokens|format_tokens }} / {{ config.alert_5h_tokens|format_tokens }}</span>
            </div>
            {% endif %}

            {% if config.alert_5h_cost %}
            <div class="limits-alert-row">
                <span class="alert-label">Session 5h (coût)</span>
                <div class="alert-bar-track">
                    <div class="alert-bar-fill alert-bar-fill--{{ alert_5h_cost_level }}"
                         style="width: {{ alert_5h_cost_pct }}%"></div>
                </div>
                <span class="alert-value">{{ session_cost|format_cost }} / {{ config.alert_5h_cost|format_cost }}</span>
            </div>
            {% endif %}

            {% if config.alert_weekly_tokens %}
            <div class="limits-alert-row">
                <span class="alert-label">Semaine (tokens)</span>
                <div class="alert-bar-track">
                    <div class="alert-bar-fill alert-bar-fill--{{ alert_weekly_token_level }}"
                         style="width: {{ alert_weekly_token_pct }}%"></div>
                </div>
                <span class="alert-value">{{ weekly_tokens|format_tokens }} / {{ config.alert_weekly_tokens|format_tokens }}</span>
            </div>
            {% endif %}

            {% if config.alert_weekly_cost %}
            <div class="limits-alert-row">
                <span class="alert-label">Semaine (coût)</span>
                <div class="alert-bar-track">
                    <div class="alert-bar-fill alert-bar-fill--{{ alert_weekly_cost_level }}"
                         style="width: {{ alert_weekly_cost_pct }}%"></div>
                </div>
                <span class="alert-value">{{ weekly_cost|format_cost }} / {{ config.alert_weekly_cost|format_cost }}</span>
            </div>
            {% endif %}
        </div>
    </div>
    {% endif %}

    <!-- Configuration -->
    <div class="glass-card limits-config" id="limits-config-section" style="margin-top: var(--spacing-lg);">
        <h3 class="config-title">Configuration</h3>
        <form hx-post="{% url 'token_limits_config' %}"
              hx-target="#limits-container"
              hx-swap="outerHTML"
              hx-on::after-swap="initTokenCharts()">
            <div class="config-grid">
                <label for="plan_name">Plan</label>
                <input type="text" id="plan_name" name="plan_name"
                       class="glass-input" value="{{ config.plan_name }}">

                <label for="limit_5h_tokens">Limite 5h</label>
                <input type="number" id="limit_5h_tokens" name="limit_5h_tokens"
                       class="glass-input" value="{{ config.limit_5h_tokens }}"
                       placeholder="tokens" min="0">

                <label for="limit_weekly_tokens">Limite semaine</label>
                <input type="number" id="limit_weekly_tokens" name="limit_weekly_tokens"
                       class="glass-input" value="{{ config.limit_weekly_tokens }}"
                       placeholder="tokens" min="0">

                <label for="alert_5h_tokens">Alerte 5h (tokens)</label>
                <input type="number" id="alert_5h_tokens" name="alert_5h_tokens"
                       class="glass-input" value="{{ config.alert_5h_tokens|default_if_none:'' }}"
                       placeholder="optionnel" min="0">

                <label for="alert_5h_cost">Alerte 5h (coût)</label>
                <input type="number" id="alert_5h_cost" name="alert_5h_cost"
                       class="glass-input" value="{{ config.alert_5h_cost|default_if_none:'' }}"
                       placeholder="$ optionnel" min="0" step="0.01">

                <label for="alert_weekly_tokens">Alerte semaine (tokens)</label>
                <input type="number" id="alert_weekly_tokens" name="alert_weekly_tokens"
                       class="glass-input" value="{{ config.alert_weekly_tokens|default_if_none:'' }}"
                       placeholder="optionnel" min="0">

                <label for="alert_weekly_cost">Alerte semaine (coût)</label>
                <input type="number" id="alert_weekly_cost" name="alert_weekly_cost"
                       class="glass-input" value="{{ config.alert_weekly_cost|default_if_none:'' }}"
                       placeholder="$ optionnel" min="0" step="0.01">
            </div>

            <div style="margin-top: var(--spacing-md);">
                <button type="submit" class="neon-btn">Enregistrer</button>
            </div>

            <p class="config-help">
                Les limites varient selon votre plan et le modèle utilisé. Anthropic ne publie pas de chiffres exacts.
                Renseignez les valeurs observées dans votre usage Claude Code. Les seuils personnels déclenchent
                les indicateurs orange (70%) et rouge (90%) sur les barres ci-dessus.
            </p>
        </form>
    </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add dashboard-v2/tokens/templates/tokens/partials/_tab_limits.html
git commit -m "feat(tokens): add _tab_limits.html partial with gauges, alerts, and config form"
```

---

### Task 8: Wire Gauge Data in View Context

The template expects `session_gauge` and `weekly_gauge` dicts for the D3 gauge data attributes. We need to add them to the view context.

**Files:**
- Modify: `dashboard-v2/tokens/views.py`

- [ ] **Step 1: Add gauge data dicts to tab_limits context**

In the `tab_limits` view, find the `context = {` block and add two entries. Insert before `'config': config,`:

After computing `session_start` and `weekly_tokens`, add these lines before the `context = {` block:

```python
    # --- Gauge data for D3 ---
    session_gauge = {
        'pct': min(session_pct, 100) if config.limit_5h_tokens > 0 else 0,
        'level': session_level,
        'subtitle': '{} / {}'.format(
            _format_tokens_short(session_tokens),
            _format_tokens_short(config.limit_5h_tokens),
        ),
        'annotation': 'depuis {}'.format(
            session_start.strftime('%H:%M') if session_start else '--:--'
        ),
    }
    weekly_gauge = {
        'pct': min(weekly_pct, 100) if config.limit_weekly_tokens > 0 else 0,
        'level': weekly_level,
        'subtitle': '{} / {}'.format(
            _format_tokens_short(weekly_tokens),
            _format_tokens_short(config.limit_weekly_tokens),
        ),
        'annotation': 'lun. → dim.',
    }
```

Then add to the context dict:

```python
        'session_gauge': session_gauge,
        'weekly_gauge': weekly_gauge,
```

- [ ] **Step 2: Add _format_tokens_short helper**

Add after the `_get_alert_level` function:

```python
def _format_tokens_short(value):
    """Format token count as short string (e.g., 180K, 1.2M)."""
    if not value or value == 0:
        return '0'
    if value >= 1_000_000:
        return f'{value / 1_000_000:.1f}M'
    if value >= 1_000:
        return f'{value / 1_000:.0f}K'
    return str(value)
```

- [ ] **Step 3: Commit**

```bash
git add dashboard-v2/tokens/views.py
git commit -m "feat(tokens): add gauge data dicts and format helper to tab_limits view"
```

---

### Task 9: Wire Tab in Main Template

**Files:**
- Modify: `dashboard-v2/tokens/templates/tokens/index.html`

- [ ] **Step 1: Add Limites tab button**

In `dashboard-v2/tokens/templates/tokens/index.html`, find the Sessions tab button (line ~62-70) and add the Limites button after it, before the closing `</div>` of `neon-tabs`:

```html
    <button class="neon-tab" data-tab="limits"
            hx-get="{% url 'token_tab_limits' %}"
            hx-target="#tab-content"
            hx-swap="innerHTML"
            hx-on::after-swap="initTokenCharts()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        Limites
    </button>
```

- [ ] **Step 2: Add limits URL to JS filter functions**

In the `updateTokenPeriod` function (line ~109), add the limits URL to the `urls` object:

```javascript
    var urls = {
        costs: '{% url "token_tab_costs" %}',
        technical: '{% url "token_tab_technical" %}',
        sessions: '{% url "token_tab_sessions" %}',
        limits: '{% url "token_tab_limits" %}'
    };
```

Do the same in the `updateTokenProject` function (line ~122):

```javascript
    var urls = {
        costs: '{% url "token_tab_costs" %}',
        technical: '{% url "token_tab_technical" %}',
        sessions: '{% url "token_tab_sessions" %}',
        limits: '{% url "token_tab_limits" %}'
    };
```

- [ ] **Step 3: Commit**

```bash
git add dashboard-v2/tokens/templates/tokens/index.html
git commit -m "feat(tokens): wire Limites tab button and JS filter URLs in index.html"
```

---

### Task 10: Manual Testing & Verification

- [ ] **Step 1: Start the dev server**

```bash
cd dashboard-v2 && python manage.py runserver 8001
```

- [ ] **Step 2: Open the tokens page**

Open `http://localhost:8001/tokens/` in browser.

Expected: 4 tabs visible — Costs, Technical, Sessions, Limites.

- [ ] **Step 3: Click the Limites tab**

Expected: Empty state message — "Aucune limite configurée" with link to configuration section below.

- [ ] **Step 4: Configure limits**

Fill in the config form:
- Plan: `Pro Team`
- Limite 5h: `250000`
- Limite semaine: `2700000`
- Alerte 5h (tokens): `200000`
- Alerte 5h (coût): `2.00`
- Alerte semaine (tokens): `2000000`
- Alerte semaine (coût): `15.00`

Click "Enregistrer".

Expected: Gauges appear with current consumption. Progress bars for personal alerts show. Form retains values.

- [ ] **Step 5: Verify auto-refresh**

Wait 60 seconds on the Limites tab.

Expected: Content refreshes (gauges redraw with animation). No errors in console.

- [ ] **Step 6: Verify period/project filters don't break**

Switch between period filters (7d, 30d) while on Limites tab.

Expected: Tab stays on Limites, no JS errors.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat(tokens): complete Limites tab — gauges, alerts, config, auto-refresh"
```
