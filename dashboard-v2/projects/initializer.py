"""
Mugiwara project initializer — detect stack, select preset, generate config + CLAUDE.md.
Python port of lib/project.sh logic for use from the dashboard.
"""
import re
from datetime import date
from pathlib import Path

import yaml

# Where presets live (relative to mugiwara-agents root)
_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # mugiwara-agents/
PRESETS_DIR = _PROJECT_ROOT / 'skills' / 'one_piece' / 'presets'

ELEVATED_AGENTS = {
    'chopper', 'franky', 'nami', 'jinbe', 'robin',
    'zorro', 'sanji', 'luffy', 'brook', 'usopp', 'vivi',
}


# ── Stack Detection ──────────────────────────────────────────

def detect_stacks(project_path: Path) -> list[str]:
    """Detect technology stacks from marker files."""
    stacks: list[str] = []
    p = project_path

    # JavaScript / TypeScript
    if (p / 'package.json').exists():
        stacks.append('javascript')
        try:
            pkg = (p / 'package.json').read_text(encoding='utf-8', errors='ignore')
            if '"next"' in pkg:
                stacks.append('nextjs')
            if '"react"' in pkg:
                stacks.append('react')
            if '"vue"' in pkg:
                stacks.append('vue')
            if '"@angular/core"' in pkg:
                stacks.append('angular')
            if '"svelte"' in pkg:
                stacks.append('svelte')
            if '"express"' in pkg:
                stacks.append('express')
            if '"@nestjs/core"' in pkg:
                stacks.append('nestjs')
        except OSError:
            pass
    if (p / 'tsconfig.json').exists():
        stacks.append('typescript')

    # Python
    if any((p / f).exists() for f in ('requirements.txt', 'pyproject.toml', 'setup.py')):
        stacks.append('python')
    if (p / 'dbt_project.yml').exists():
        stacks.append('dbt')

    # Go / Rust / Java
    if (p / 'go.mod').exists():
        stacks.append('go')
    if (p / 'Cargo.toml').exists():
        stacks.append('rust')
    if any((p / f).exists() for f in ('pom.xml', 'build.gradle', 'build.gradle.kts')):
        stacks.append('java')

    # Flutter / Dart
    if (p / 'pubspec.yaml').exists():
        stacks.append('flutter')

    # .NET / C#
    if list(p.glob('*.csproj')) or list(p.glob('*.sln')):
        stacks.append('dotnet')

    # Docker
    if (p / 'Dockerfile').exists() or (p / 'docker-compose.yml').exists() or (p / 'docker-compose.yaml').exists():
        stacks.append('docker')

    # Kubernetes / Terraform
    if (p / 'k8s').is_dir() or (p / 'kubernetes').is_dir():
        stacks.append('kubernetes')
    if list(p.glob('*.tf')):
        stacks.append('terraform')

    return sorted(set(stacks))


# ── Preset Selection ─────────────────────────────────────────

def suggest_preset(stacks: list[str]) -> str:
    """Match stacks to the best preset name."""
    s = ' '.join(stacks)
    if re.search(r'flutter|dart|react-native', s):
        return 'mobile'
    if re.search(r'dbt|spark|airflow|dagster|jupyter', s):
        return 'data-engineering'
    if re.search(r'kubernetes|terraform|ansible|helm', s):
        return 'devops'
    if re.search(r'typescript|javascript|nextjs|react|vue|angular|svelte|express|nestjs', s):
        return 'web-fullstack'
    if re.search(r'python|go|rust|java|dotnet', s):
        return 'web-fullstack'
    return 'minimal'


def load_preset(preset_name: str) -> dict:
    """Load a preset YAML file. Returns agents + pipelines."""
    preset_file = PRESETS_DIR / f'{preset_name}.yaml'
    if not preset_file.exists():
        preset_file = PRESETS_DIR / 'minimal.yaml'

    data = yaml.safe_load(preset_file.read_text(encoding='utf-8'))
    agents_section = data.get('agents', {})

    agents = []
    for a in agents_section.get('active', []):
        # Strip inline comments
        name = a.split('#')[0].strip() if isinstance(a, str) else str(a).strip()
        if name:
            agents.append(name)

    pipelines = []
    for p in agents_section.get('pipelines', []):
        name = p.split('#')[0].strip() if isinstance(p, str) else str(p).strip()
        if name:
            pipelines.append(name)

    return {
        'agents': agents,
        'pipelines': pipelines,
        'description': data.get('description', ''),
    }


def list_presets() -> list[dict]:
    """List all available presets with their descriptions."""
    presets = []
    for f in sorted(PRESETS_DIR.glob('*.yaml')):
        data = yaml.safe_load(f.read_text(encoding='utf-8'))
        presets.append({
            'name': f.stem,
            'description': data.get('description', ''),
        })
    return presets


def list_all_agents() -> list[dict]:
    """Return all known agents from registry with name, type, description."""
    from core.registry import load_registry
    registry = load_registry()
    agents = []
    for name, meta in sorted(registry.items()):
        if meta.get('alias_of'):
            continue
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


# ── CLAUDE.md Generation ─────────────────────────────────────

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


# ── Project Config Generation ────────────────────────────────

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


# ── Full Init ────────────────────────────────────────────────

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
