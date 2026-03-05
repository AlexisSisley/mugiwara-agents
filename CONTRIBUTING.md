# Contributing to Mugiwara Agents

## Conventional Commits

Ce projet utilise [Conventional Commits](https://www.conventionalcommits.org/) pour
standardiser les messages de commit. Un hook `commit-msg` (via Husky + commitlint)
valide automatiquement le format a chaque commit.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types autorises

| Type | Description | Exemple |
|------|-------------|---------|
| `feat` | Nouvelle fonctionnalite (agent, pipeline, skill) | `feat(monitoring): add Prometheus scraping config` |
| `fix` | Correction de bug | `fix(cli): handle missing registry.yaml gracefully` |
| `docs` | Documentation uniquement | `docs(changelog): add v1.7 entries` |
| `style` | Formatage, pas de changement de code | `style(hooks): normalize indentation` |
| `refactor` | Refactoring sans changement de comportement | `refactor(core): extract color constants` |
| `perf` | Amelioration de performance | `perf(dashboard): lazy load agent list` |
| `test` | Ajout ou mise a jour de tests | `test(monitoring): add smoke tests for SKILL.md` |
| `ci` | Changements CI/CD (pipeline, hooks) | `ci(hooks): add schema validation to smoke tests` |
| `chore` | Maintenance (dependances, config) | `chore(deps): update commitlint to v19` |
| `build` | Changements du systeme de build | `build(npm): add conventional-changelog` |
| `revert` | Revert d'un commit precedent | `revert: revert "feat(cli): add search command"` |

### Scopes recommandes

- **Infrastructure** : `cli`, `hooks`, `dashboard`, `registry`, `ci`, `schema`, `changelog`, `monitoring`, `feature-flags`, `release`
- **Agents principaux** : `luffy`, `zorro`, `nami`, `sanji`, `usopp`, `chopper`, `robin`, `franky`, `brook`, `jinbe`
- **Agents etendus** : `vegapunk`, `morgans`, `vivi`, `yamato`, `ace`, `law`, `shanks`, `one_piece`, `bon-clay`, `perona`, `senor-pink`, `bartholomew`

Le scope est optionnel mais recommande. De nouveaux scopes sont acceptes (warning, pas erreur).

### Exemples concrets

```bash
# Nouvel agent
git commit -m "feat(monitoring): add Prometheus + Grafana agent SKILL.md"

# Correction de bug
git commit -m "fix(hooks): prevent duplicate JSONL entries on session restart"

# Tests
git commit -m "test(monitoring): add smoke tests for manifest and SKILL.md"

# CI/CD
git commit -m "ci(hooks): integrate schema validation in smoke tests"

# Documentation
git commit -m "docs(contributing): add Conventional Commits guide"

# Breaking change (footer)
git commit -m "feat(schema)!: add required version field to agent events

BREAKING CHANGE: all agent events must now include a version field"
```

### En cas d'erreur

Si votre commit est rejete par commitlint, vous verrez un message comme :

```
⧗   input: my bad commit
✖   subject may not be empty [subject-empty]
✖   type may not be empty [type-empty]
```

Corrigez simplement le message et recommittez :

```bash
git commit -m "feat(scope): description correcte"
```

## Setup developpeur

```bash
# Installer les dependances (une seule fois)
npm install

# Les hooks Git sont automatiquement configures via Husky
# Verifier que le hook commit-msg est actif :
ls .husky/commit-msg
```

## Tests

```bash
# Smoke tests (342 tests)
bash tests/test_structural.sh

# Dashboard tests (116 tests)
cd dashboard && npm test

# Plugin tests
bash tests/plugin/test_plugin_system.sh
```
