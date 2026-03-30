# Dashboard v2 — Django + HTMX + Neon Glass

## Context

Le dashboard Mugiwara v1 (Svelte 4 + Express.js + sql.js) est fonctionnel mais utilise une stack JS lourde pour un outil local. L'utilisateur souhaite une refonte complete en Django pour simplifier la stack, eliminer la dependance Node.js du dashboard, et appliquer un nouveau style glassmorphisme Neon Glass.

**Objectif :** Reproduire les 6 pages existantes (Overview, Crew, Orchestrator, Pipelines, Projects, Reports) dans une architecture Django templates + HTMX + D3.js, en reutilisant la BDD SQLite existante (`~/.mugiwara/mugiwara.db`).

---

## Decisions de design

| Decision | Choix | Justification |
|----------|-------|---------------|
| Framework | Django (templates + HTMX) | Full-stack Python, server-rendered, pas de build step JS |
| Interactivite | HTMX pour filtres/pagination/drawers | Dynamisme sans framework JS, HTML-over-the-wire |
| Charts | D3.js (vanilla) | Controle total SVG pour heatmaps, sparklines, donuts custom |
| Style | Neon Glass (purple/pink neon glassmorphisme) | Fond violet profond, accents #8B5CF6/#EC4899, glows neon |
| Structure Django | Multi-apps (core, agents, orchestrator, pipelines, projects, reports) | Separation des domaines, chaque page = 1 app |
| ORM | Managed models, migrations Django | Schema gere par Django, hook-writer via ORM |
| Hook bridge | Python standalone (remplace hook-writer.ts) | Elimine dependance Node.js |
| BDD | SQLite existante (`~/.mugiwara/mugiwara.db`) | 5 tables, schema conserve a l'identique |
| Deploiement | `manage.py runserver` (local uniquement) | Outil dev local, pas de prod externe |

---

## Architecture

```
dashboard-v2/
├── manage.py
├── requirements.txt
├── config/                        # Projet Django (settings, urls, wsgi)
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── core/                          # App: models partages, hook-writer, utils
│   ├── __init__.py
│   ├── apps.py
│   ├── models.py                  # Invocation, Session, Memory, DailyStats, WeeklyReport
│   ├── admin.py                   # Admin optionnel pour debug
│   ├── hook_writer.py             # CLI bridge: stdin JSON → ORM insert
│   ├── category_detector.py       # Auto-categorisation pro/poc/perso
│   ├── registry.py                # Lecture de registry.yaml (metadata agents)
│   ├── templatetags/
│   │   ├── __init__.py
│   │   └── dashboard_tags.py      # Filtres: timeago, badge_class, json_data, neon_glow
│   └── management/
│       └── commands/
│           ├── __init__.py
│           ├── ingest_hook.py     # manage.py ingest_hook (alternative CLI)
│           └── aggregate_stats.py # manage.py aggregate_stats
├── agents/                        # App: Overview + Crew pages
│   ├── __init__.py
│   ├── apps.py
│   ├── views.py                   # overview(), crew_list(), crew_detail_partial()
│   ├── urls.py
│   └── templates/agents/
│       ├── overview.html
│       ├── crew.html
│       └── partials/
│           ├── _kpi_cards.html
│           ├── _sparklines.html
│           ├── _heatmap.html
│           ├── _activity_feed.html
│           ├── _crew_grid.html
│           └── _crew_detail.html
├── orchestrator/                  # App: One Piece routing decisions
│   ├── __init__.py
│   ├── apps.py
│   ├── views.py                   # orchestrator_index(), decisions_partial(), decision_detail()
│   ├── urls.py
│   └── templates/orchestrator/
│       ├── index.html
│       └── partials/
│           ├── _stats_panel.html
│           ├── _confidence_donut.html
│           ├── _decisions_table.html
│           └── _decision_detail.html
├── pipelines/                     # App: Pipeline executions
│   ├── __init__.py
│   ├── apps.py
│   ├── views.py                   # pipeline_list(), pipeline_detail_partial()
│   ├── urls.py
│   └── templates/pipelines/
│       ├── index.html
│       └── partials/
│           ├── _pipeline_list.html
│           └── _pipeline_steps.html
├── projects/                      # App: Project management
│   ├── __init__.py
│   ├── apps.py
│   ├── views.py                   # project_list(), project_detail(), project_timeline()
│   ├── scanner.py                 # Filesystem scanner (port de projects-scanner.ts)
│   ├── urls.py
│   └── templates/projects/
│       ├── index.html
│       └── partials/
│           ├── _project_grid.html
│           ├── _project_detail.html
│           └── _project_timeline.html
├── reports/                       # App: Weekly reports
│   ├── __init__.py
│   ├── apps.py
│   ├── views.py                   # report_list(), report_detail(), report_generate()
│   ├── generator.py               # Generation HTML des rapports hebdo
│   ├── urls.py
│   └── templates/reports/
│       ├── index.html
│       └── partials/
│           ├── _report_list.html
│           └── _report_detail.html
├── static/
│   ├── css/
│   │   └── neon-glass.css         # Design tokens + glassmorphisme complet
│   ├── js/
│   │   ├── htmx.min.js           # HTMX 2.x
│   │   ├── charts.js              # D3.js: sparklines, heatmap, donut, bar charts
│   │   └── app.js                 # Sidebar, drawer, toasts, theme
│   └── vendor/
│       └── d3.min.js              # D3.js v7
└── templates/
    ├── base.html                  # Layout: sidebar + topbar + content + drawer
    ├── components/
    │   ├── _sidebar.html          # Navigation glass sidebar
    │   ├── _topbar.html           # Breadcrumbs + actions
    │   ├── _stat_card.html        # KPI card reusable (title, value, change%, sparkline)
    │   ├── _badge.html            # Neon badge (confidence, status, type)
    │   ├── _drawer.html           # Slide-over detail panel
    │   ├── _pagination.html       # HTMX pagination controls
    │   ├── _empty_state.html      # Empty state illustration
    │   └── _filters.html          # Reusable filter bar component
    └── _messages.html             # Toast notifications (Django messages)
```

---

## Models Django (core/models.py)

Les 5 models mappent exactement le schema SQLite existant :

### Invocation

```python
class Invocation(models.Model):
    timestamp = models.DateTimeField(db_index=True)
    event = models.CharField(max_length=50, default='agent_invocation')
    agent = models.CharField(max_length=100, db_index=True)
    tool = models.CharField(max_length=100, blank=True, default='')
    tool_type = models.CharField(max_length=20, blank=True, default='')
    args_preview = models.CharField(max_length=200, blank=True, default='')
    output_summary = models.CharField(max_length=500, blank=True, default='')
    session_id = models.CharField(max_length=100, db_index=True, blank=True, default='')
    is_pipeline = models.BooleanField(default=False)
    pipeline_detected = models.CharField(max_length=100, blank=True, default='')
    trigger_file = models.CharField(max_length=500, blank=True, default='')
    exit_code = models.IntegerField(null=True, blank=True)
    summary = models.TextField(blank=True, default='')
    reason = models.TextField(blank=True, default='')
    project = models.CharField(max_length=200, db_index=True, blank=True, default='')
    category = models.CharField(max_length=20, db_index=True, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'invocations'
        unique_together = [('timestamp', 'session_id', 'event', 'agent')]
```

### Session

```python
class Session(models.Model):
    timestamp = models.DateTimeField(db_index=True)
    event = models.CharField(max_length=50, default='session_start')
    session_id = models.CharField(max_length=100, unique=True, db_index=True)
    reason = models.TextField(blank=True, default='')
    project = models.CharField(max_length=200, blank=True, default='')
    category = models.CharField(max_length=20, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'sessions'
```

### Memory

```python
class Memory(models.Model):
    date = models.DateField(db_index=True)
    demande = models.TextField(blank=True, default='')
    route = models.CharField(max_length=100, blank=True, default='')
    route_agent = models.CharField(max_length=100, blank=True, default='')
    confiance = models.CharField(max_length=20, blank=True, default='')
    sujet = models.CharField(max_length=500, blank=True, default='')
    projet = models.CharField(max_length=200, blank=True, default='')
    resultat = models.CharField(max_length=50, blank=True, default='')
    resultat_detail = models.TextField(blank=True, default='')
    contexte = models.TextField(blank=True, default='')
    category = models.CharField(max_length=20, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'memory'
```

### DailyStats

```python
class DailyStats(models.Model):
    date = models.DateField(primary_key=True)
    total_invocations = models.IntegerField(default=0)
    total_sessions = models.IntegerField(default=0)
    unique_agents = models.IntegerField(default=0)
    unique_projects = models.IntegerField(default=0)
    top_agent = models.CharField(max_length=100, blank=True, default='')
    top_project = models.CharField(max_length=200, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'daily_stats'
```

### WeeklyReport

```python
class WeeklyReport(models.Model):
    week_start = models.DateField(unique=True)
    week_end = models.DateField()
    generated_at = models.DateTimeField(null=True, blank=True)
    html_path = models.CharField(max_length=500, blank=True, default='')
    draft_id = models.CharField(max_length=100, blank=True, default='')
    status = models.CharField(max_length=50, default='generated')

    class Meta:
        db_table = 'weekly_reports'
```

### Migration initiale

La migration initiale cree les tables avec exactement le meme schema que l'existant. Si la BDD existe deja avec les tables, on utilise `python manage.py migrate --fake-initial` pour marquer la migration comme appliquee sans recreer les tables.

---

## Design System : Neon Glass

### Tokens CSS

```css
:root {
  /* Backgrounds */
  --bg-primary: #0f0f23;
  --bg-secondary: #1a0a2e;
  --bg-tertiary: #0a1628;
  --bg-gradient: linear-gradient(160deg, #0f0f23 0%, #1a0a2e 40%, #0a1628 100%);

  /* Accents */
  --accent-purple: #8B5CF6;
  --accent-pink: #EC4899;
  --accent-purple-light: #A78BFA;
  --accent-purple-dim: rgba(139, 92, 246, 0.3);
  --accent-pink-light: #F9A8D4;
  --accent-gradient: linear-gradient(135deg, var(--accent-purple), var(--accent-pink));

  /* Glass */
  --glass-bg: rgba(139, 92, 246, 0.08);
  --glass-bg-hover: rgba(139, 92, 246, 0.14);
  --glass-bg-active: rgba(139, 92, 246, 0.18);
  --glass-border: 1px solid rgba(139, 92, 246, 0.20);
  --glass-border-hover: 1px solid rgba(139, 92, 246, 0.35);
  --glass-blur: blur(16px);
  --glass-glow: 0 0 20px rgba(139, 92, 246, 0.10);
  --glass-glow-hover: 0 0 30px rgba(139, 92, 246, 0.18);
  --glass-glow-active: 0 0 40px rgba(139, 92, 246, 0.25);

  /* Pink glass variant (for pipelines, special cards) */
  --glass-pink-bg: rgba(236, 72, 153, 0.10);
  --glass-pink-border: 1px solid rgba(236, 72, 153, 0.20);
  --glass-pink-glow: 0 0 20px rgba(236, 72, 153, 0.08);

  /* Text */
  --text-primary: #FAFAFA;
  --text-secondary: #A78BFA;
  --text-muted: #A1A1AA;
  --text-dimmed: #71717A;

  /* Semantic */
  --color-success: #34D399;
  --color-warning: #FBBF24;
  --color-error: #F87171;
  --color-info: #A78BFA;

  /* Badges neon */
  --badge-haute: var(--color-success);
  --badge-moyenne: var(--color-warning);
  --badge-basse: var(--color-error);
  --badge-subagent: var(--accent-purple);
  --badge-skill: var(--accent-pink);
  --badge-pipeline: linear-gradient(135deg, var(--accent-purple), var(--accent-pink));

  /* Layout */
  --sidebar-width: 240px;
  --sidebar-collapsed: 64px;
  --topbar-height: 56px;
  --drawer-width: 480px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;

  /* Typography */
  --font-sans: 'Inter', -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
}
```

### Composants Glass

| Composant | Utilisation | Proprietes clefs |
|-----------|-------------|------------------|
| `.glass-card` | KPI cards, agent cards, toute carte | bg + border + blur + glow + radius-lg |
| `.glass-card--pink` | Variante rose pour pipelines | pink-bg + pink-border + pink-glow |
| `.glass-sidebar` | Navigation laterale | bg plus opaque (0.95), blur 20px |
| `.glass-input` | Champs de recherche, selects | bg transparent, border purple subtile |
| `.glass-table` | Tableaux de donnees | rows alternees avec glass subtil |
| `.glass-drawer` | Panel lateral detail | slide-in, fond blur 20px, glow lateral |
| `.neon-badge` | Badges confiance/type/status | text-shadow glow, border glow |
| `.neon-stat` | Valeur KPI principale | font-size 28px, text-shadow purple |
| `.neon-link` | Liens actifs sidebar | border-left accent-gradient, glow |

### Layout base.html

```
┌─────────────────────────────────────────────────────────────┐
│ body: background var(--bg-gradient), min-height 100vh       │
│                                                             │
│ ┌──────────┐ ┌────────────────────────────────────────────┐ │
│ │ SIDEBAR  │ │ TOPBAR (breadcrumbs + actions)             │ │
│ │ (glass)  │ ├────────────────────────────────────────────┤ │
│ │          │ │                                            │ │
│ │ Logo     │ │ MAIN CONTENT                               │ │
│ │ Nav      │ │ ({% block content %})                     │ │
│ │ items    │ │                                            │ │
│ │          │ │                                            │ │
│ │          │ │                              ┌────────────┐│ │
│ │          │ │                              │ DRAWER     ││ │
│ │          │ │                              │ (detail)   ││ │
│ │          │ │                              │ glass-blur ││ │
│ │          │ │                              └────────────┘│ │
│ └──────────┘ └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Pattern HTMX

### Principes

1. **Full page load** initial via Django template classique
2. **Filtres/recherche** : `hx-get` avec `hx-trigger="input changed delay:300ms"` retourne un fragment HTML
3. **Pagination** : `hx-get` avec query params `?page=N` retourne la liste paginee
4. **Drawer detail** : `hx-get` cible un `<div id="drawer">`, `hx-swap="innerHTML"`, toggle CSS class pour animer
5. **Actions** (generate report, scan projects) : `hx-post` avec `hx-indicator` pour loading state

### Conventions

- Chaque view Django a une version "full page" et une version "partial"
- Si `request.headers.get('HX-Request')` est truthy, retourner le partial
- Sinon retourner le template complet (navigation directe par URL)
- Les partials sont prefixes par `_` : `_crew_grid.html`, `_decisions_table.html`

### Exemple complet : Crew page

```python
# agents/views.py
def crew_list(request):
    search = request.GET.get('search', '')
    agent_type = request.GET.get('type', '')
    sort = request.GET.get('sort', 'name')

    members = get_crew_members(search=search, agent_type=agent_type, sort=sort)
    context = {'members': members, 'search': search, 'type': agent_type, 'sort': sort}

    if request.headers.get('HX-Request'):
        return render(request, 'agents/partials/_crew_grid.html', context)
    return render(request, 'agents/crew.html', context)
```

```html
<!-- agents/crew.html -->
{% extends "base.html" %}
{% block content %}
<div class="page-header">
  <h1 class="neon-title">Equipage</h1>
</div>
<div class="filters glass-card"
     hx-get="{% url 'crew-list' %}"
     hx-trigger="input changed delay:300ms from:find input, change from:find select"
     hx-target="#crew-grid">
  <input type="text" name="search" value="{{ search }}" class="glass-input" placeholder="Rechercher un agent...">
  <select name="type" class="glass-input">
    <option value="">Tous</option>
    <option value="subagent" {% if type == 'subagent' %}selected{% endif %}>Subagents</option>
    <option value="skill" {% if type == 'skill' %}selected{% endif %}>Skills</option>
    <option value="pipeline" {% if type == 'pipeline' %}selected{% endif %}>Pipelines</option>
  </select>
  <select name="sort" class="glass-input">
    <option value="name">Nom</option>
    <option value="invocations" {% if sort == 'invocations' %}selected{% endif %}>Invocations</option>
    <option value="lastUsed" {% if sort == 'lastUsed' %}selected{% endif %}>Dernier usage</option>
  </select>
</div>
<div id="crew-grid">
  {% include "agents/partials/_crew_grid.html" %}
</div>
{% endblock %}
```

---

## D3.js Charts (static/js/charts.js)

### Graphiques a implementer

| Chart | Page | Type D3 | Donnees |
|-------|------|---------|---------|
| **Sparkline** | Overview | `d3.line()` + `d3.area()` | `invocations7d[]`, `sessions7d[]` (array de counts) |
| **Heatmap** | Overview | `d3.scaleBand()` + `rect` | `HeatmapCell[]` (day x hour x count) |
| **Donut** | Orchestrator | `d3.arc()` + `d3.pie()` | `confidenceDistribution` (haute/moyenne/basse counts) |
| **Bar horizontal** | Orchestrator, Crew | `d3.scaleBand()` + `rect` | `topAgents[]`, `topProjects[]` (name + count) |
| **Timeline** | Projects | `d3.scaleTime()` + `circle` | `entries[]` avec timestamps |
| **Pie** | Projects | `d3.arc()` + `d3.pie()` | `agentDistribution[]` (agent + count) |

### Pattern d'injection des donnees

```html
<!-- Dans le template Django -->
{{ sparkline_data|json_script:"sparkline-invocations" }}

<!-- Dans charts.js -->
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('sparkline-invocations');
  if (el) {
    const data = JSON.parse(el.textContent);
    renderSparkline('#sparkline-container', data, {
      color: 'var(--accent-purple)',
      glowColor: 'rgba(139, 92, 246, 0.3)',
      height: 40
    });
  }
});
```

### Reinitialisation apres HTMX swap

```javascript
// Recharger les charts apres un swap HTMX
document.body.addEventListener('htmx:afterSwap', (event) => {
  initChartsInContainer(event.detail.target);
});
```

---

## Hook-Writer Python (core/hook_writer.py)

### Architecture

```python
#!/usr/bin/env python3
"""
CLI bridge: bash hooks -> Django ORM -> SQLite
Remplace hook-writer.ts (Node.js)

Usage:
  echo '{"tool_input": {...}, ...}' | python hook_writer.py invocation
  echo '{"session_id": "...", ...}' | python hook_writer.py session
"""
import sys, json, os
from datetime import datetime, timezone
from pathlib import Path

# Bootstrap Django ORM
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
DASHBOARD_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(DASHBOARD_DIR))

import django
django.setup()

from core.models import Invocation, Session, DailyStats
from core.category_detector import detect_category

# 5-second timeout (cross-platform, Windows-compatible)
import threading
timer = threading.Timer(5.0, lambda: os._exit(0))
timer.daemon = True
timer.start()


def ingest_invocation(payload: dict) -> None:
    """Parse hook JSON and insert invocation via ORM."""
    tool_input = payload.get('tool_input', {})
    agent = tool_input.get('skill') or tool_input.get('subagent_type') or 'unknown'
    args = (tool_input.get('args') or tool_input.get('prompt') or '')[:200]
    output = (payload.get('tool_response') or '')[:500]
    cwd = payload.get('cwd', '')
    project = os.path.basename(cwd) if cwd else ''
    category = detect_category(project=project, agent=agent, args=args, cwd=cwd)

    ts = payload.get('timestamp') or datetime.now(timezone.utc).isoformat()

    Invocation.objects.get_or_create(
        timestamp=ts,
        session_id=payload.get('session_id', ''),
        event='agent_invocation',
        agent=agent,
        defaults={
            'tool': tool_input.get('tool_name') or payload.get('tool_name', ''),
            'tool_type': 'subagent' if tool_input.get('subagent_type') else 'skill',
            'args_preview': args,
            'output_summary': output,
            'is_pipeline': agent in PIPELINE_NAMES,
            'pipeline_detected': '',
            'project': project,
            'category': category,
        }
    )
    aggregate_daily(ts)


def ingest_session(payload: dict) -> None:
    """Parse session hook JSON and insert via ORM."""
    session_id = payload.get('session_id', '')
    if not session_id:
        return
    cwd = payload.get('cwd', '')
    project = os.path.basename(cwd) if cwd else ''
    category = detect_category(project=project, cwd=cwd)
    ts = payload.get('timestamp') or datetime.now(timezone.utc).isoformat()

    Session.objects.get_or_create(
        session_id=session_id,
        defaults={
            'timestamp': ts,
            'event': payload.get('event', 'session_start'),
            'reason': payload.get('reason', ''),
            'project': project,
            'category': category,
        }
    )
    aggregate_daily(ts)


def aggregate_daily(ts_str: str) -> None:
    """Pre-aggregate daily stats for heatmap/sparklines."""
    date = datetime.fromisoformat(ts_str.replace('Z', '+00:00')).date()
    stats, _ = DailyStats.objects.get_or_create(date=date)
    # Recalculate from raw data
    from django.db.models import Count
    day_invocations = Invocation.objects.filter(timestamp__date=date)
    stats.total_invocations = day_invocations.count()
    stats.total_sessions = Session.objects.filter(timestamp__date=date).count()
    stats.unique_agents = day_invocations.values('agent').distinct().count()
    stats.unique_projects = day_invocations.values('project').exclude(project='').distinct().count()
    top = day_invocations.values('agent').annotate(c=Count('id')).order_by('-c').first()
    stats.top_agent = top['agent'] if top else ''
    top_p = day_invocations.values('project').exclude(project='').annotate(c=Count('id')).order_by('-c').first()
    stats.top_project = top_p['project'] if top_p else ''
    stats.save()


PIPELINE_NAMES = {
    'mugiwara', 'incident', 'pre-launch', 'onboard', 'modernize',
    'discovery', 'doc-hunt', 'api-postman'
}

if __name__ == '__main__':
    try:
        raw = sys.stdin.read()
        payload = json.loads(raw)
        command = sys.argv[1] if len(sys.argv) > 1 else 'invocation'
        if command == 'session':
            ingest_session(payload)
        else:
            ingest_invocation(payload)
    except Exception:
        pass  # Silent failure (never break hook chain)
    sys.exit(0)
```

### Modification du hook bash

Dans `.claude/hooks/log-agent-output.sh`, remplacer l'appel Node.js :

```bash
# Avant (v1)
HOOK_WRITER_JS="$PROJECT_DIR/dashboard/dist/server/db/hook-writer.js"
echo "$INPUT" | node "$HOOK_WRITER_JS" invocation 2>/dev/null &

# Apres (v2)
HOOK_WRITER_PY="$PROJECT_DIR/dashboard-v2/core/hook_writer.py"
echo "$INPUT" | python "$HOOK_WRITER_PY" invocation 2>/dev/null &
```

---

## Data Flow par page

### Overview (agents/views.py)

| Donnee | Query ORM | Rendu |
|--------|-----------|-------|
| KPIs | `Invocation.objects.count()`, `Session.objects.count()`, agents distincts, projets distincts | 4 stat cards glass |
| Sparkline 7j | `DailyStats.objects.filter(date__gte=7d_ago).values_list('date', 'total_invocations')` | D3 sparkline SVG |
| Heatmap | `Invocation.objects.filter(last 7d).annotate(hour=ExtractHour('timestamp'), dow=ExtractWeekDay('timestamp')).values('hour', 'dow').annotate(count=Count('id'))` | D3 heatmap grid |
| Feed | `Invocation.objects.order_by('-timestamp')[:20]` | Liste HTMX paginee |

### Crew (agents/views.py)

| Donnee | Query ORM | Rendu |
|--------|-----------|-------|
| Members | `Invocation.objects.values('agent').annotate(count=Count('id'), last=Max('timestamp'))` + registry.yaml merge | Grid de glass cards |
| Filtres | search sur agent name/desc, type filter, sort | HTMX partial reload |
| Detail | Stats agent + top projects + derniers 10 calls | Drawer glass |

### Orchestrator (orchestrator/views.py)

| Donnee | Query ORM | Rendu |
|--------|-----------|-------|
| Stats | `Memory.objects.aggregate(total=Count('id'))`, confiance distribution | Panel stats + donut D3 |
| Top agents/projets | `Memory.objects.values('route_agent').annotate(c=Count('id')).order_by('-c')[:10]` | D3 bar horizontal |
| Decisions | `Memory.objects.all().order_by('-date')` avec filtres search/agent/project/confiance | Table HTMX paginee |
| Detail | Memory entry complete (contexte, resultat_detail) | Drawer glass |

### Pipelines (pipelines/views.py)

| Donnee | Query ORM | Rendu |
|--------|-----------|-------|
| Runs | `Invocation.objects.filter(is_pipeline=True)` groupes par session_id, reconstitues en runs | Liste paginee |
| Filtres | name, status | HTMX partial |
| Steps | Invocations du meme session_id ordonnees par timestamp | Expansion inline |

### Projects (projects/views.py)

| Donnee | Source | Rendu |
|--------|--------|-------|
| Liste projets | Filesystem scanner + `Invocation.objects.values('project')` merge | Grid par categorie (PRO/POC/PERSO) |
| Detail | Git info (subprocess), doc files, Mugiwara stats ORM, Claude sessions | Drawer glass multi-sections |
| Timeline | `Invocation.objects.filter(project=X).order_by('timestamp')` + git log | D3 timeline |
| Actions | Open Claude, Open Explorer, Run Agent | Boutons avec POST HTMX |

### Reports (reports/views.py)

| Donnee | Query ORM | Rendu |
|--------|-----------|-------|
| Liste | `WeeklyReport.objects.all().order_by('-week_start')` | Grille de cards |
| Detail | Lecture du fichier HTML genere (`html_path`) | Drawer avec iframe/HTML inline |
| Generate | Aggregation Invocations + Sessions + Memory par semaine | POST → generation HTML |

---

## Settings Django (config/settings.py)

```python
import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
MUGIWARA_HOME = Path(os.environ.get('MUGIWARA_HOME', Path.home() / '.mugiwara'))

SECRET_KEY = 'mugiwara-dashboard-local-only'
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1']

INSTALLED_APPS = [
    'django.contrib.staticfiles',
    'core',
    'agents',
    'orchestrator',
    'pipelines',
    'projects',
    'reports',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.middleware.common.CommonMiddleware',
]

# No auth, no CSRF (local tool), no sessions framework
# Minimal middleware for performance

ROOT_URLCONF = 'config.urls'
TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'templates'],
    'APP_DIRS': True,
    'OPTIONS': {
        'context_processors': [
            'django.template.context_processors.request',
            'django.template.context_processors.static',
        ],
    },
}]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': MUGIWARA_HOME / 'mugiwara.db',
    }
}

STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
```

---

## Dependencies (requirements.txt)

```
django>=5.1,<6.0
pyyaml>=6.0            # Pour lire registry.yaml
```

Pas de DRF, pas de django-htmx (on gere HTMX manuellement), pas de Pillow, pas de Celery. Stack minimale.

---

## URLs routing (config/urls.py)

```python
from django.urls import path, include

urlpatterns = [
    path('', include('agents.urls')),            # / = overview, /crew = crew
    path('orchestrator/', include('orchestrator.urls')),
    path('pipelines/', include('pipelines.urls')),
    path('projects/', include('projects.urls')),
    path('reports/', include('reports.urls')),
]
```

---

## Migration strategy

1. `python manage.py makemigrations core` cree la migration initiale avec les 5 models
2. Un script `setup.py` (ou section dans manage.py) detecte le cas :
   - Si `~/.mugiwara/mugiwara.db` existe ET contient la table `invocations` : `python manage.py migrate --fake-initial` (marque la migration comme appliquee sans toucher aux tables)
   - Si BDD vierge ou absente : `python manage.py migrate` cree les tables normalement
3. Detection via : `sqlite3.connect(db_path).execute("SELECT name FROM sqlite_master WHERE type='table' AND name='invocations'").fetchone()`

---

## Scope explicite

### Inclus (v2.0)
- 6 pages identiques a la v1 (Overview, Crew, Orchestrator, Pipelines, Projects, Reports)
- Hook-writer Python remplacant Node.js
- Design system Neon Glass complet
- HTMX pour interactivite (filtres, pagination, drawers)
- D3.js pour tous les graphiques
- Lecture de registry.yaml pour metadata agents

### Exclus (hors scope v2.0)
- Authentification / multi-utilisateur
- Deploiement Docker ou cloud
- WebSocket / real-time updates (polling HTMX suffit)
- Export PDF/CSV des rapports
- Mode light / theme switching
- Tests unitaires Django (phase ulterieure)
- Admin Django (optionnel, pas prioritaire)
