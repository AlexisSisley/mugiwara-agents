"""
Load the Mugiwara agent registry from registry.yaml.

Returns a dict keyed by agent name with metadata:
  {name: {description, category, role, version, elevated, alias_of}}
"""
import os
from pathlib import Path
from functools import lru_cache

import yaml


def _find_registry_yaml() -> Path:
    """Locate registry.yaml by walking up from this file."""
    # dashboard-v2/core/registry.py  →  mugiwara-agents/registry.yaml
    candidate = Path(__file__).resolve().parent.parent.parent / 'registry.yaml'
    if candidate.exists():
        return candidate
    # Fallback: env var
    env = os.environ.get('MUGIWARA_REGISTRY')
    if env:
        p = Path(env)
        if p.exists():
            return p
    raise FileNotFoundError(
        f'registry.yaml not found at {candidate}. '
        'Set MUGIWARA_REGISTRY env var to override.'
    )


@lru_cache(maxsize=1)
def load_registry() -> dict:
    """Parse registry.yaml and return a flat dict of agents."""
    path = _find_registry_yaml()
    with open(path, 'r', encoding='utf-8') as f:
        data = yaml.safe_load(f)

    agents_raw = data.get('agents', {})
    registry = {}
    for name, meta in agents_raw.items():
        registry[name] = {
            'name': name,
            'description': meta.get('description', ''),
            'category': meta.get('category', ''),
            'role': meta.get('role', 'agent'),
            'version': meta.get('version', ''),
            'elevated': meta.get('elevated', False),
            'alias_of': meta.get('alias_of', ''),
        }
    return registry


def get_agent(name: str) -> dict | None:
    """Look up a single agent by name."""
    return load_registry().get(name)


def list_agents(role: str | None = None, category: str | None = None) -> list[dict]:
    """Filter agents by role and/or category."""
    agents = load_registry().values()
    if role:
        agents = [a for a in agents if a['role'] == role]
    if category:
        agents = [a for a in agents if a['category'] == category]
    return sorted(agents, key=lambda a: a['name'])
