# Init Mugiwara Enhanced — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the Init Mugiwara modal with two-column agent/pipeline selection, dual Init/Config mode, and CLAUDE.md diff preview.

**Architecture:** Extend the existing `initializer.py` backend with new functions (`list_all_agents`, `read_current_config`, `build_claude_md_section`). Enrich existing endpoints and add one new endpoint (`init-preview-diff/`). Replace the current modal HTML/JS in `index.html` with the enhanced two-column version. Add CSS for the new layout.

**Tech Stack:** Django 5.2, vanilla JS, YAML (pyyaml), existing neon-glass CSS framework.

---

### Task 1: Backend — Add `list_all_agents()` and `read_current_config()` to initializer.py

**Files:**
- Modify: `dashboard-v2/projects/initializer.py`

- [ ] **Step 1: Add `list_all_agents()` function**

Add after the `list_presets()` function (line 143):

```python
def list_all_agents() -> list[dict]:
    """Return all known agents from registry with name, type, description."""
    from core.registry import load_registry
    registry = load_registry()
    agents = []
    for name, meta in sorted(registry.items()):
        if meta.get('alias_of'):
            continue  # skip aliases
        agents.append({
            'name': name,
            'type': 'elevated' if meta.get('elevated') else 'skill',
            'description': meta.get('description', ''),
            'category': meta.get('category', ''),
            'role': meta.get('role', 'agent'),
        })
    return agents


def list_all_pipelines() -> list[dict]:
    """Return all known pipelines from registry."""
    from core.registry import load_registry
    registry = load_registry()
    pipelines = []
    for name, meta in sorted(registry.items()):
        if meta.get('role') == 'pipeline' and not meta.get('alias_of'):
            pipelines.append({
                'name': name,
                'description': meta.get('description', ''),
            })
    return pipelines
```

- [ ] **Step 2: Add `read_current_config()` function**

Add after `list_all_pipelines()`:

```python
def read_current_config(project_path: Path) -> dict | None:
    """Read .mugiwara/project.yaml and return current config, or None if not initialized."""
    config_file = project_path / '.mugiwara' / 'project.yaml'
    if not config_file.exists():
        return None
    try:
        data = yaml.safe_load(config_file.read_text(encoding='utf-8'))
        agents_section = data.get('agents', {})
        return {
            'preset': data.get('preset', 'minimal'),
            'stacks': data.get('project', {}).get('detected_stack', []),
            'agents': agents_section.get('active', []),
            'pipelines': agents_section.get('pipelines', []),
        }
    except (yaml.YAMLError, OSError):
        return None
```

- [ ] **Step 3: Verify the module loads without errors**

Run: `cd dashboard-v2 && ./venv/Scripts/python -c "from projects.initializer import list_all_agents, list_all_pipelines, read_current_config; print('OK:', len(list_all_agents()), 'agents,', len(list_all_pipelines()), 'pipelines')"`

Expected: `OK: N agents, M pipelines` (no import errors)

- [ ] **Step 4: Commit**

```bash
git add dashboard-v2/projects/initializer.py
git commit -m "feat(init): add list_all_agents, list_all_pipelines, read_current_config"
```

---

### Task 2: Backend — Add `build_claude_md_section()` and `diff_claude_md()`

**Files:**
- Modify: `dashboard-v2/projects/initializer.py`

- [ ] **Step 1: Refactor `generate_claude_md` to extract section building**

Add a new function `build_claude_md_section()` that builds the markdown string without writing to disk. Then modify `generate_claude_md()` to use it. Add after `read_current_config()`:

```python
def build_claude_md_section(agents: list[str], pipelines: list[str], preset_name: str) -> str:
    """Build the mugiwara-config markdown section from agent/pipeline lists."""
    today = date.today().isoformat()

    agent_rows = []
    for agent in agents:
        agent_type = '[S]' if agent in ELEVATED_AGENTS else 'skill'
        agent_rows.append(f'| {agent} | {agent_type} |')

    pipeline_items = [f'- `/{p}`' for p in pipelines]

    return (
        f'<!-- mugiwara-config:start v2 preset={preset_name} updated={today} -->\n'
        f'## Mugiwara Agents\n\n'
        f'**Pour TOUTE demande d\'ingenierie logicielle**, utilise le skill `one_piece` '
        f'(via l\'outil Skill) qui routera automatiquement vers le bon agent specialise.\n\n'
        f'### Invocation directe\n'
        f'Si l\'utilisateur nomme un agent (ex: `/chopper`, `/franky`), '
        f'invoque directement ce skill sans passer par one_piece.\n\n'
        f'### Agents actifs pour ce projet\n'
        f'| Agent | Type |\n'
        f'|-------|------|\n'
        + '\n'.join(agent_rows) + '\n\n'
        f'### Pipelines disponibles\n'
        + '\n'.join(pipeline_items) + '\n\n'
        f'### Subagents eleves [S]\n'
        f'chopper, franky, nami, jinbe, robin, zorro, sanji, luffy, brook, usopp, vivi\n'
        f'Ces agents peuvent etre invoques via l\'outil Agent pour tourner dans leur propre contexte.\n'
        f'<!-- mugiwara-config:end -->'
    )
```

- [ ] **Step 2: Refactor `generate_claude_md` to accept custom agents/pipelines**

Replace the existing `generate_claude_md` function:

```python
def generate_claude_md(project_path: Path, preset_name: str,
                       custom_agents: list[str] | None = None,
                       custom_pipelines: list[str] | None = None) -> Path:
    """Generate or update CLAUDE.md with mugiwara config section."""
    if custom_agents is not None and custom_pipelines is not None:
        agents = custom_agents
        pipelines = custom_pipelines
    else:
        preset = load_preset(preset_name)
        agents = preset['agents']
        pipelines = preset['pipelines']

    section = build_claude_md_section(agents, pipelines, preset_name)
    claude_md = project_path / 'CLAUDE.md'

    if claude_md.exists():
        content = claude_md.read_text(encoding='utf-8')
        if 'mugiwara-config:start' in content:
            content = re.sub(
                r'<!-- mugiwara-config:start.*?-->.*?<!-- mugiwara-config:end -->',
                section,
                content,
                flags=re.DOTALL,
            )
        else:
            content = section + '\n\n' + content
    else:
        content = section

    claude_md.write_text(content, encoding='utf-8')
    return claude_md
```

- [ ] **Step 3: Add `diff_claude_md()` function**

Add after `build_claude_md_section()`:

```python
def diff_claude_md(project_path: Path, new_agents: list[str],
                   new_pipelines: list[str], preset_name: str) -> dict:
    """Return current and new mugiwara-config sections for diff preview."""
    claude_md = project_path / 'CLAUDE.md'

    current_section = ''
    if claude_md.exists():
        content = claude_md.read_text(encoding='utf-8')
        match = re.search(
            r'(<!-- mugiwara-config:start.*?-->.*?<!-- mugiwara-config:end -->)',
            content,
            flags=re.DOTALL,
        )
        if match:
            current_section = match.group(1)

    new_section = build_claude_md_section(new_agents, new_pipelines, preset_name)

    return {
        'current_md': current_section,
        'new_md': new_section,
        'has_changes': current_section != new_section,
    }
```

- [ ] **Step 4: Update `init_project()` to accept custom agents/pipelines**

Replace the existing `init_project` function:

```python
def init_project(project_path: Path, preset_override: str | None = None,
                 custom_agents: list[str] | None = None,
                 custom_pipelines: list[str] | None = None) -> dict:
    """
    Full project initialization/update:
    1. Detect stacks
    2. Select preset (or use override)
    3. Generate .mugiwara/project.yaml (with custom agents if provided)
    4. Generate/update CLAUDE.md

    Returns summary dict.
    """
    project_path = Path(project_path)
    stacks = detect_stacks(project_path)
    preset_name = preset_override or suggest_preset(stacks)
    preset_data = load_preset(preset_name)

    agents = custom_agents if custom_agents is not None else preset_data['agents']
    pipelines = custom_pipelines if custom_pipelines is not None else preset_data['pipelines']

    yaml_path = generate_project_yaml(project_path, preset_name, stacks,
                                       custom_agents=agents, custom_pipelines=pipelines)
    claude_path = generate_claude_md(project_path, preset_name,
                                      custom_agents=agents, custom_pipelines=pipelines)

    return {
        'project': project_path.name,
        'stacks': stacks,
        'preset': preset_name,
        'preset_description': preset_data['description'],
        'agents': agents,
        'pipelines': pipelines,
        'yaml_path': str(yaml_path),
        'claude_md_path': str(claude_path),
    }
```

- [ ] **Step 5: Update `generate_project_yaml()` to accept custom agents/pipelines**

Replace the existing function:

```python
def generate_project_yaml(project_path: Path, preset_name: str, stacks: list[str],
                           custom_agents: list[str] | None = None,
                           custom_pipelines: list[str] | None = None) -> Path:
    """Create .mugiwara/project.yaml from preset or custom lists."""
    if custom_agents is not None and custom_pipelines is not None:
        agents = custom_agents
        pipelines = custom_pipelines
    else:
        preset = load_preset(preset_name)
        agents = preset['agents']
        pipelines = preset['pipelines']

    mugiwara_dir = project_path / '.mugiwara'
    mugiwara_dir.mkdir(parents=True, exist_ok=True)

    config = {
        'version': 2,
        'preset': preset_name,
        'project': {
            'name': project_path.name,
            'detected_stack': stacks,
        },
        'agents': {
            'active': agents,
            'pipelines': pipelines,
        },
        'settings': {
            'auto_route_only': True,
            'direct_invoke_all': True,
        },
    }

    output = mugiwara_dir / 'project.yaml'
    output.write_text(
        f"# Mugiwara Project Configuration\n"
        f"# Generated: {date.today().isoformat()}\n"
        f"# Preset: {preset_name}\n\n"
        + yaml.dump(config, default_flow_style=False, allow_unicode=True, sort_keys=False),
        encoding='utf-8',
    )
    return output
```

- [ ] **Step 6: Verify the module loads and new functions work**

Run: `cd dashboard-v2 && ./venv/Scripts/python -c "from projects.initializer import build_claude_md_section, diff_claude_md; print(build_claude_md_section(['chopper','franky'], ['mugiwara'], 'minimal')[:80])"`

Expected: Prints beginning of the generated section (no errors)

- [ ] **Step 7: Commit**

```bash
git add dashboard-v2/projects/initializer.py
git commit -m "feat(init): add build_claude_md_section, diff_claude_md, custom agent support"
```

---

### Task 3: Backend — Enrich views and add diff endpoint

**Files:**
- Modify: `dashboard-v2/projects/views.py`
- Modify: `dashboard-v2/projects/urls.py`

- [ ] **Step 1: Update imports in views.py**

Replace the initializer import line:

```python
from .initializer import init_project, list_presets, detect_stacks, suggest_preset, load_preset, list_all_agents, list_all_pipelines, read_current_config, diff_claude_md
```

- [ ] **Step 2: Enrich `project_init_preview` view**

Replace the existing `project_init_preview` function:

```python
def project_init_preview(request, project_name):
    """GET — return all agents, pipelines, stacks, presets, and current config if initialized."""
    projects = scan_projects()
    project = next((p for p in projects if p.name == project_name), None)
    if not project:
        return JsonResponse({'error': 'Project not found'}, status=404)

    project_path = Path(project.path)
    stacks = detect_stacks(project_path)
    current_config = read_current_config(project_path)
    is_initialized = current_config is not None

    preset_name = request.GET.get('preset') or (
        current_config['preset'] if is_initialized else suggest_preset(stacks)
    )
    preset_data = load_preset(preset_name)
    presets = list_presets()
    all_agents = list_all_agents()
    all_pipelines = list_all_pipelines()

    if is_initialized and not request.GET.get('preset'):
        active_agents = current_config['agents']
        active_pipelines = current_config['pipelines']
    else:
        active_agents = preset_data['agents']
        active_pipelines = preset_data['pipelines']

    return JsonResponse({
        'stacks': stacks,
        'suggested_preset': preset_name,
        'preset_description': preset_data['description'],
        'available_presets': presets,
        'all_agents': all_agents,
        'all_pipelines': all_pipelines,
        'active_agents': active_agents,
        'active_pipelines': active_pipelines,
        'is_initialized': is_initialized,
    })
```

- [ ] **Step 3: Enrich `project_init_mugiwara` view to accept custom agents/pipelines**

Replace the existing function:

```python
@csrf_exempt
@require_POST
def project_init_mugiwara(request, project_name):
    """Initialize or update Mugiwara config for a project."""
    projects = scan_projects()
    project = next((p for p in projects if p.name == project_name), None)
    if not project:
        return JsonResponse({'error': 'Project not found'}, status=404)

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        body = {}

    preset_override = body.get('preset') or None
    custom_agents = body.get('agents')  # list[str] or None
    custom_pipelines = body.get('pipelines')  # list[str] or None
    project_path = Path(project.path)

    try:
        result = init_project(project_path, preset_override=preset_override,
                              custom_agents=custom_agents, custom_pipelines=custom_pipelines)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({
        'ok': True,
        'action': 'init',
        'project': project_name,
        **result,
    })
```

- [ ] **Step 4: Add `project_init_diff` view**

Add after `project_init_preview`:

```python
@csrf_exempt
@require_POST
def project_init_diff(request, project_name):
    """Return current vs new CLAUDE.md section for diff preview."""
    projects = scan_projects()
    project = next((p for p in projects if p.name == project_name), None)
    if not project:
        return JsonResponse({'error': 'Project not found'}, status=404)

    try:
        body = json.loads(request.body) if request.body else {}
    except json.JSONDecodeError:
        body = {}

    agents = body.get('agents', [])
    pipelines = body.get('pipelines', [])
    preset = body.get('preset', 'minimal')

    result = diff_claude_md(Path(project.path), agents, pipelines, preset)
    return JsonResponse(result)
```

- [ ] **Step 5: Add URL route for diff endpoint**

In `urls.py`, add before the closing `]`:

```python
    path('<str:project_name>/init-preview-diff/', views.project_init_diff, name='project_init_diff'),
```

- [ ] **Step 6: Verify server starts without errors**

Run: `cd dashboard-v2 && ./venv/Scripts/python manage.py check --deploy 2>&1 | head -5`

Expected: No import errors (deployment warnings are OK)

- [ ] **Step 7: Commit**

```bash
git add dashboard-v2/projects/views.py dashboard-v2/projects/urls.py
git commit -m "feat(init): enrich preview/init endpoints, add diff endpoint"
```

---

### Task 4: Frontend — CSS for two-column layout and diff panel

**Files:**
- Modify: `dashboard-v2/static/css/neon-glass.css`

- [ ] **Step 1: Add two-column transfer list styles**

Add after the existing `.btn-init:hover` rule block:

```css
.btn-config {
  background: transparent;
  color: var(--accent-purple-light);
  border-color: var(--accent-purple);
}

.btn-config:hover {
  background: rgba(139, 92, 246, 0.15);
}

/* Transfer list (two-column agent/pipeline selector) */
.transfer-list {
  display: flex;
  gap: var(--spacing-sm);
  margin-bottom: var(--spacing-md);
}

.transfer-list__col {
  flex: 1;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  background: rgba(255, 255, 255, 0.02);
  display: flex;
  flex-direction: column;
  max-height: 240px;
}

.transfer-list__header {
  padding: 8px 12px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-dimmed);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.transfer-list__header input {
  background: transparent;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  font-size: 11px;
  padding: 2px 8px;
  width: 120px;
  outline: none;
}

.transfer-list__header input:focus {
  border-color: var(--accent-purple);
}

.transfer-list__body {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.transfer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.15s;
  gap: 6px;
}

.transfer-item:hover {
  background: rgba(139, 92, 246, 0.1);
}

.transfer-item__info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}

.transfer-item__name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.transfer-item__desc {
  font-size: 10px;
  color: var(--text-dimmed);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.transfer-item__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-dimmed);
  cursor: pointer;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
  transition: all 0.15s;
}

.transfer-item__btn:hover {
  background: var(--accent-purple);
  color: #fff;
  border-color: var(--accent-purple);
}

.transfer-item .neon-badge {
  font-size: 9px;
  flex-shrink: 0;
}

/* Diff preview panel */
.diff-panel {
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  margin-top: var(--spacing-md);
  overflow: hidden;
}

.diff-panel__toggle {
  width: 100%;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.02);
  border: none;
  color: var(--accent-purple-light);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 6px;
}

.diff-panel__toggle:hover {
  background: rgba(139, 92, 246, 0.08);
}

.diff-panel__content {
  display: none;
  max-height: 250px;
  overflow-y: auto;
}

.diff-panel__content.open {
  display: flex;
}

.diff-col {
  flex: 1;
  padding: 8px 12px;
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.diff-col--old {
  border-right: 1px solid var(--glass-border);
  color: var(--text-dimmed);
}

.diff-col--new {
  color: var(--text-secondary);
}

.diff-line--removed {
  background: rgba(248, 113, 113, 0.1);
  color: #F87171;
}

.diff-line--added {
  background: rgba(16, 185, 129, 0.1);
  color: #34D399;
}

.diff-no-changes {
  padding: 16px;
  text-align: center;
  color: var(--text-dimmed);
  font-size: 12px;
}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard-v2/static/css/neon-glass.css
git commit -m "feat(init): add CSS for transfer-list, diff-panel, btn-config"
```

---

### Task 5: Frontend — Update project grid button (Init → Config)

**Files:**
- Modify: `dashboard-v2/projects/templates/projects/partials/_project_grid.html`

- [ ] **Step 1: Replace the Init button block**

Replace the existing `{% if not project.has_mugiwara %}` block with:

```html
            {% if not project.has_mugiwara %}
            <button class="btn-action btn-init"
                    onclick="event.stopPropagation(); openInitModal('{{ project.name }}', '{% url 'project_init' project.name %}', '{% url 'project_init_preview' project.name %}', '{% url 'project_init_diff' project.name %}');"
                    title="Initialize Mugiwara (CLAUDE.md + config)">Init</button>
            {% else %}
            <button class="btn-action btn-config"
                    onclick="event.stopPropagation(); openInitModal('{{ project.name }}', '{% url 'project_init' project.name %}', '{% url 'project_init_preview' project.name %}', '{% url 'project_init_diff' project.name %}');"
                    title="Edit Mugiwara config">&#9881; Config</button>
            {% endif %}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard-v2/projects/templates/projects/partials/_project_grid.html
git commit -m "feat(init): show Config button on initialized projects"
```

---

### Task 6: Frontend — Rewrite modal HTML in index.html

**Files:**
- Modify: `dashboard-v2/projects/templates/projects/index.html`

- [ ] **Step 1: Replace the entire modal and script blocks**

Replace everything from `<!-- Init Mugiwara Modal -->` through `{% endblock %}` (the `extra_js` block) with the new enhanced modal. This is the full replacement content:

```html
<!-- Init/Config Mugiwara Modal -->
<div id="init-modal-overlay" class="modal-overlay" onclick="if(event.target===this) closeInitModal();">
    <div class="modal-content" style="max-width: 750px;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--spacing-md);">
            <h3 id="init-modal-title" style="margin: 0; color: var(--text-primary);">&#9813; Init Mugiwara</h3>
            <button onclick="closeInitModal()" style="background: none; border: none; color: var(--text-dimmed); cursor: pointer; font-size: 18px;">&times;</button>
        </div>

        <!-- Loading -->
        <div id="init-loading" style="text-align: center; padding: 24px; color: var(--text-dimmed);">
            <span class="neon-spinner"></span> Detecting stack...
        </div>

        <!-- Content -->
        <div id="init-content" style="display: none;">
            <!-- Stacks + Preset row -->
            <div style="display: flex; gap: var(--spacing-md); margin-bottom: var(--spacing-md); align-items: flex-end;">
                <div style="flex: 1;">
                    <label style="font-size: 11px; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.5px;">Detected Stacks</label>
                    <div id="init-stacks" style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px;"></div>
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 11px; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.5px;">Preset</label>
                    <select id="init-preset" class="glass-input" style="margin-top: 4px; width: 100%;"></select>
                </div>
            </div>

            <!-- Agents transfer list -->
            <label style="font-size: 11px; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: block;">Agents</label>
            <div class="transfer-list">
                <div class="transfer-list__col">
                    <div class="transfer-list__header">
                        <span>Available</span>
                        <input type="search" id="init-agent-search" placeholder="Filter..." oninput="filterAvailableAgents()">
                    </div>
                    <div class="transfer-list__body" id="init-available-agents"></div>
                </div>
                <div class="transfer-list__col">
                    <div class="transfer-list__header">
                        <span>Active</span>
                        <span id="init-active-count" style="font-size: 10px; color: var(--accent-purple-light);"></span>
                    </div>
                    <div class="transfer-list__body" id="init-active-agents"></div>
                </div>
            </div>

            <!-- Pipelines transfer list -->
            <label style="font-size: 11px; color: var(--text-dimmed); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; display: block;">Pipelines</label>
            <div class="transfer-list" style="max-height: none;">
                <div class="transfer-list__col" style="max-height: 140px;">
                    <div class="transfer-list__header"><span>Available</span></div>
                    <div class="transfer-list__body" id="init-available-pipelines"></div>
                </div>
                <div class="transfer-list__col" style="max-height: 140px;">
                    <div class="transfer-list__header"><span>Active</span></div>
                    <div class="transfer-list__body" id="init-active-pipelines"></div>
                </div>
            </div>

            <!-- Diff preview panel -->
            <div class="diff-panel">
                <button class="diff-panel__toggle" onclick="toggleDiffPreview()">
                    <span id="diff-toggle-arrow">&#9654;</span>
                    <span id="diff-toggle-label">Preview CLAUDE.md</span>
                </button>
                <div class="diff-panel__content" id="diff-content"></div>
            </div>

            <!-- Footer -->
            <div style="display: flex; gap: 8px; justify-content: flex-end; margin-top: var(--spacing-md);">
                <button onclick="closeInitModal()" class="neon-btn neon-btn--sm" style="opacity: 0.6;">Cancel</button>
                <button id="init-confirm-btn" class="neon-btn neon-btn--sm" disabled onclick="confirmInit()">
                    &#9813; Initialize
                </button>
            </div>
        </div>
    </div>
</div>
{% endblock %}

{% block extra_js %}
<script>
(function() {
    var initUrl = '';
    var previewUrl = '';
    var diffUrl = '';
    var allAgents = [];
    var allPipelines = [];
    var activeAgents = [];
    var activePipelines = [];
    var isInitialized = false;
    var userModified = false;
    var diffOpened = false;

    window.openInitModal = function(projectName, initEndpoint, previewEndpoint, diffEndpoint) {
        initUrl = initEndpoint;
        previewUrl = previewEndpoint;
        diffUrl = diffEndpoint;
        userModified = false;
        diffOpened = false;

        var overlay = document.getElementById('init-modal-overlay');
        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';

        document.getElementById('init-loading').style.display = 'block';
        document.getElementById('init-content').style.display = 'none';
        document.getElementById('diff-content').classList.remove('open');
        document.getElementById('diff-toggle-arrow').innerHTML = '&#9654;';
        document.getElementById('init-confirm-btn').disabled = true;

        fetch(previewUrl)
            .then(function(r) { return r.json(); })
            .then(function(data) {
                isInitialized = data.is_initialized;
                allAgents = data.all_agents;
                allPipelines = data.all_pipelines;
                activeAgents = data.active_agents.slice();
                activePipelines = data.active_pipelines.slice();

                // Update modal title and button
                document.getElementById('init-modal-title').innerHTML = isInitialized
                    ? '&#9881; Mugiwara Config — ' + projectName
                    : '&#9813; Init Mugiwara — ' + projectName;
                document.getElementById('init-confirm-btn').innerHTML = isInitialized
                    ? '&#9881; Save Config' : '&#9813; Initialize';
                document.getElementById('diff-toggle-label').textContent = isInitialized
                    ? 'Preview Changes' : 'Preview CLAUDE.md';

                renderStacks(data.stacks);
                renderPresets(data.available_presets, data.suggested_preset);
                renderTransferLists();

                document.getElementById('init-loading').style.display = 'none';
                document.getElementById('init-content').style.display = 'block';
            })
            .catch(function(err) {
                document.getElementById('init-loading').innerHTML =
                    '<span style="color: #F87171;">Error: ' + err.message + '</span>';
            });
    };

    window.closeInitModal = function() {
        document.getElementById('init-modal-overlay').classList.remove('open');
        document.body.style.overflow = '';
    };

    function renderStacks(stacks) {
        var el = document.getElementById('init-stacks');
        el.innerHTML = stacks.length > 0
            ? stacks.map(function(s) { return '<span class="neon-badge neon-badge--neutral">' + s + '</span>'; }).join('')
            : '<span class="text-dimmed" style="font-size: 12px;">No stack detected</span>';
    }

    function renderPresets(presets, selected) {
        var sel = document.getElementById('init-preset');
        sel.innerHTML = presets.map(function(p) {
            return '<option value="' + p.name + '"' + (p.name === selected ? ' selected' : '') + '>'
                + p.name + ' — ' + p.description + '</option>';
        }).join('');
        sel.onchange = function() {
            if (userModified && !confirm('Changing preset will reset your agent selection. Continue?')) {
                sel.value = selected;
                return;
            }
            fetch(previewUrl + '?preset=' + sel.value)
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    activeAgents = data.active_agents.slice();
                    activePipelines = data.active_pipelines.slice();
                    userModified = false;
                    diffOpened = false;
                    document.getElementById('init-confirm-btn').disabled = true;
                    document.getElementById('diff-content').classList.remove('open');
                    document.getElementById('diff-toggle-arrow').innerHTML = '&#9654;';
                    renderTransferLists();
                });
        };
    }

    function renderTransferLists() {
        renderAgentColumns();
        renderPipelineColumns();
    }

    function renderAgentColumns() {
        var availEl = document.getElementById('init-available-agents');
        var activeEl = document.getElementById('init-active-agents');
        var search = (document.getElementById('init-agent-search').value || '').toLowerCase();

        var available = allAgents.filter(function(a) {
            return activeAgents.indexOf(a.name) < 0
                && (search === '' || a.name.toLowerCase().indexOf(search) >= 0
                    || a.description.toLowerCase().indexOf(search) >= 0);
        });

        availEl.innerHTML = available.map(function(a) {
            var badge = a.type === 'elevated' ? '<span class="neon-badge neon-badge--subagent">[S]</span>' : '';
            return '<div class="transfer-item" ondblclick="addAgent(\'' + a.name + '\')">'
                + '<div class="transfer-item__info">'
                + '<span class="transfer-item__name">' + a.name + ' ' + badge + '</span>'
                + '<span class="transfer-item__desc">' + a.description + '</span>'
                + '</div>'
                + '<button class="transfer-item__btn" onclick="addAgent(\'' + a.name + '\')">&gt;</button>'
                + '</div>';
        }).join('');

        var active = allAgents.filter(function(a) { return activeAgents.indexOf(a.name) >= 0; });
        // Also include agents in activeAgents not found in allAgents (custom)
        var activeNames = active.map(function(a) { return a.name; });
        activeAgents.forEach(function(name) {
            if (activeNames.indexOf(name) < 0) {
                active.push({ name: name, type: 'skill', description: '' });
            }
        });

        activeEl.innerHTML = active.map(function(a) {
            var badge = a.type === 'elevated' ? '<span class="neon-badge neon-badge--subagent">[S]</span>' : '';
            return '<div class="transfer-item" ondblclick="removeAgent(\'' + a.name + '\')">'
                + '<button class="transfer-item__btn" onclick="removeAgent(\'' + a.name + '\')">&lt;</button>'
                + '<div class="transfer-item__info">'
                + '<span class="transfer-item__name">' + a.name + ' ' + badge + '</span>'
                + '<span class="transfer-item__desc">' + a.description + '</span>'
                + '</div>'
                + '</div>';
        }).join('');

        document.getElementById('init-active-count').textContent = activeAgents.length + ' selected';
    }

    function renderPipelineColumns() {
        var availEl = document.getElementById('init-available-pipelines');
        var activeEl = document.getElementById('init-active-pipelines');

        var available = allPipelines.filter(function(p) { return activePipelines.indexOf(p.name) < 0; });
        availEl.innerHTML = available.map(function(p) {
            return '<div class="transfer-item" ondblclick="addPipeline(\'' + p.name + '\')">'
                + '<div class="transfer-item__info">'
                + '<span class="transfer-item__name">/' + p.name + '</span>'
                + '<span class="transfer-item__desc">' + p.description + '</span>'
                + '</div>'
                + '<button class="transfer-item__btn" onclick="addPipeline(\'' + p.name + '\')">&gt;</button>'
                + '</div>';
        }).join('');

        var active = allPipelines.filter(function(p) { return activePipelines.indexOf(p.name) >= 0; });
        activeEl.innerHTML = active.map(function(p) {
            return '<div class="transfer-item" ondblclick="removePipeline(\'' + p.name + '\')">'
                + '<button class="transfer-item__btn" onclick="removePipeline(\'' + p.name + '\')">&lt;</button>'
                + '<div class="transfer-item__info">'
                + '<span class="transfer-item__name">/' + p.name + '</span>'
                + '<span class="transfer-item__desc">' + p.description + '</span>'
                + '</div>'
                + '</div>';
        }).join('');
    }

    window.addAgent = function(name) {
        if (activeAgents.indexOf(name) < 0) { activeAgents.push(name); userModified = true; }
        renderAgentColumns();
        invalidateDiff();
    };
    window.removeAgent = function(name) {
        activeAgents = activeAgents.filter(function(n) { return n !== name; });
        userModified = true;
        renderAgentColumns();
        invalidateDiff();
    };
    window.addPipeline = function(name) {
        if (activePipelines.indexOf(name) < 0) { activePipelines.push(name); userModified = true; }
        renderPipelineColumns();
        invalidateDiff();
    };
    window.removePipeline = function(name) {
        activePipelines = activePipelines.filter(function(n) { return n !== name; });
        userModified = true;
        renderPipelineColumns();
        invalidateDiff();
    };

    window.filterAvailableAgents = function() { renderAgentColumns(); };

    function invalidateDiff() {
        diffOpened = false;
        document.getElementById('init-confirm-btn').disabled = true;
        document.getElementById('diff-content').classList.remove('open');
        document.getElementById('diff-toggle-arrow').innerHTML = '&#9654;';
    }

    window.toggleDiffPreview = function() {
        var content = document.getElementById('diff-content');
        var arrow = document.getElementById('diff-toggle-arrow');

        if (content.classList.contains('open')) {
            content.classList.remove('open');
            arrow.innerHTML = '&#9654;';
            return;
        }

        // Fetch diff from server
        content.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-dimmed);"><span class="neon-spinner"></span></div>';
        content.classList.add('open');
        arrow.innerHTML = '&#9660;';

        fetch(diffUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agents: activeAgents,
                pipelines: activePipelines,
                preset: document.getElementById('init-preset').value,
            }),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            diffOpened = true;
            document.getElementById('init-confirm-btn').disabled = false;

            if (!data.has_changes && isInitialized) {
                content.innerHTML = '<div class="diff-no-changes">No changes detected</div>';
                return;
            }

            if (isInitialized && data.current_md) {
                // Side by side diff
                content.innerHTML =
                    '<div class="diff-col diff-col--old">' + highlightDiff(data.current_md, data.new_md, 'old') + '</div>'
                    + '<div class="diff-col diff-col--new">' + highlightDiff(data.new_md, data.current_md, 'new') + '</div>';
            } else {
                // Just show new content
                content.innerHTML = '<div class="diff-col" style="flex: 1;">' + escapeHtml(data.new_md) + '</div>';
            }
        })
        .catch(function(err) {
            content.innerHTML = '<div class="diff-no-changes" style="color: #F87171;">Error: ' + err.message + '</div>';
        });
    };

    function highlightDiff(text, other, side) {
        var lines = text.split('\n');
        var otherLines = other.split('\n');
        var cls = side === 'old' ? 'diff-line--removed' : 'diff-line--added';
        return lines.map(function(line) {
            var escaped = escapeHtml(line);
            if (otherLines.indexOf(line) < 0) {
                return '<div class="' + cls + '">' + escaped + '</div>';
            }
            return '<div>' + escaped + '</div>';
        }).join('');
    }

    function escapeHtml(s) {
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    window.confirmInit = function() {
        var btn = document.getElementById('init-confirm-btn');
        btn.innerHTML = '&#8987; ' + (isInitialized ? 'Saving...' : 'Initializing...');
        btn.disabled = true;

        fetch(initUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                preset: document.getElementById('init-preset').value,
                agents: activeAgents,
                pipelines: activePipelines,
            }),
        })
        .then(function(r) { return r.json(); })
        .then(function(data) {
            if (data.ok) {
                var msg = isInitialized
                    ? 'Config updated for ' + data.project
                    : 'Mugiwara initialized for ' + data.project + ' (preset: ' + data.preset + ')';
                if (window.MugiToast) window.MugiToast(msg);
                closeInitModal();
                location.reload();
            } else {
                if (window.MugiToast) window.MugiToast(data.error || 'Error', 'error');
                btn.innerHTML = isInitialized ? '&#9881; Save Config' : '&#9813; Initialize';
                btn.disabled = false;
            }
        })
        .catch(function() {
            if (window.MugiToast) window.MugiToast('Network error', 'error');
            btn.innerHTML = isInitialized ? '&#9881; Save Config' : '&#9813; Initialize';
            btn.disabled = false;
        });
    };
})();
</script>
{% endblock %}
```

- [ ] **Step 2: Commit**

```bash
git add dashboard-v2/projects/templates/projects/index.html
git commit -m "feat(init): rewrite modal with two-column transfer lists and diff preview"
```

---

### Task 7: End-to-end verification

- [ ] **Step 1: Start the dashboard**

Run: `cd dashboard-v2 && ./venv/Scripts/python manage.py runserver 127.0.0.1:8000`

- [ ] **Step 2: Test Init mode on a non-initialized project**

Open http://127.0.0.1:8000/projects/, find a project without the ♛ badge, click "Init":
- Verify stacks detected and preset auto-selected
- Verify Available Agents column shows all agents from registry
- Verify Active Agents column shows preset agents
- Move agents between columns using > and < buttons
- Double-click an agent to transfer
- Use the search filter on Available
- Click "Preview CLAUDE.md" — verify it shows the section
- Click "Initialize" — verify `.mugiwara/project.yaml` and `CLAUDE.md` are created
- Verify page reloads and the button changes to "Config"

- [ ] **Step 3: Test Config mode on the newly initialized project**

Click "Config" on the project initialized in step 2:
- Verify title says "Mugiwara Config"
- Verify Active column shows the agents you selected
- Add/remove an agent
- Click "Preview Changes" — verify diff shows with red/green highlighting
- Click "Save Config" — verify `project.yaml` and `CLAUDE.md` are updated

- [ ] **Step 4: Test preset change with confirmation**

Open Config on an initialized project, modify agents manually, then change preset:
- Verify confirmation dialog appears
- Cancel — verify agents unchanged
- Accept — verify agents reset to new preset

- [ ] **Step 5: Test no-changes scenario**

Open Config without making changes, click "Preview Changes":
- Verify "No changes detected" message appears

- [ ] **Step 6: Commit final state**

```bash
git add -A
git commit -m "feat(init): enhanced init modal with two-column selection and diff preview"
```
