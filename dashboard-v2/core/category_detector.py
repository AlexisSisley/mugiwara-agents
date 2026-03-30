"""
Detect project category: 'pro', 'poc', or 'perso'.

Reads optional ~/.mugiwara/category-rules.json for user-defined rules.
Falls back to path-based heuristics.
"""
import json
import re
from pathlib import Path
from functools import lru_cache


@lru_cache(maxsize=1)
def _load_rules() -> list[dict]:
    """Load category rules from ~/.mugiwara/category-rules.json if present."""
    rules_path = Path.home() / '.mugiwara' / 'category-rules.json'
    if not rules_path.exists():
        return []
    try:
        with open(rules_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data if isinstance(data, list) else data.get('rules', [])
    except (json.JSONDecodeError, OSError):
        return []


def detect_category(
    project: str = '',
    agent: str = '',
    args: str = '',
    cwd: str = '',
) -> str:
    """
    Return 'pro', 'poc', or 'perso' based on rules and heuristics.

    Priority:
      1. Explicit rules from category-rules.json (pattern match on project/cwd)
      2. Path-based heuristics (poc/, perso/, sandbox/ in path)
      3. Default: 'pro'
    """
    # 1. User-defined rules
    for rule in _load_rules():
        pattern = rule.get('pattern', '')
        category = rule.get('category', 'pro')
        target = rule.get('match', 'project')  # 'project' | 'cwd' | 'agent'

        value = {'project': project, 'cwd': cwd, 'agent': agent}.get(target, project)
        if pattern and value and re.search(pattern, value, re.IGNORECASE):
            return category

    # 2. Path-based heuristics
    check_path = (cwd or project).lower().replace('\\', '/')
    if '/poc/' in check_path or check_path.endswith('/poc'):
        return 'poc'
    if '/perso/' in check_path or check_path.endswith('/perso'):
        return 'perso'
    if '/sandbox/' in check_path or '/playground/' in check_path:
        return 'poc'
    if '/test-' in check_path or '/demo-' in check_path:
        return 'poc'

    # 3. Default
    return 'pro'
