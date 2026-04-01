# Mugiwara Dashboard v2

Dashboard web Django pour visualiser l'activite de l'ecosysteme Mugiwara Agents : invocations, sessions, tokens, couts, routing decisions et reports hebdomadaires.

## Prerequis

- Python 3.12+
- pip

## Installation

```bash
cd dashboard-v2

# Creer le virtualenv
python -m venv venv

# Activer (Windows)
venv\Scripts\activate
# Activer (Mac/Linux)
source venv/bin/activate

# Installer les dependances
pip install -r requirements.txt

# Creer les tables
python manage.py migrate
```

## Lancement

```bash
python manage.py runserver
# Ouvrir http://localhost:8000
```

## Donnees

### Avec les hooks Mugiwara (usage reel)

Si tu utilises Claude Code avec les hooks Mugiwara installes, la base `~/.mugiwara/mugiwara.db` est alimentee automatiquement. Le dashboard lit directement cette base.

Pour ingerer les donnees token depuis les sessions Claude Code :

```bash
python manage.py ingest_tokens --recent
```

### Sans hooks (demo)

Pour voir le dashboard en action sans historique Claude Code :

```bash
python manage.py seeddata
```

Genere 3 semaines de donnees fictives realistes (~53 sessions, ~170 invocations, ~360 messages token, 30 routing decisions, 3 reports hebdomadaires).

Options :
- `--force` : efface les donnees existantes avant de re-seeder

### Agreger les stats quotidiennes

```bash
python manage.py aggregate_stats
```

## Pages

| URL | Description |
|-----|-------------|
| `/` | Overview — KPIs globaux |
| `/crew/` | Liste des agents et invocations |
| `/orchestrator/` | Routing decisions One Piece |
| `/projects/` | Projets detectes avec stats |
| `/reports/` | Reports hebdomadaires |
| `/reports/<id>/detail/` | Detail d'une semaine (KPIs, sessions, tokens) |
| `/tokens/` | Token usage et couts par modele/projet |

## Stack

- **Backend** : Django 5, SQLite
- **Frontend** : Templates Django, HTMX, D3.js
- **Design** : Neon-glass design system (CSS custom)

## Structure

```
dashboard-v2/
  config/          # Settings Django, URLs racine
  core/            # Modeles partages, template tags, management commands
  agents/          # Page Crew (liste agents)
  orchestrator/    # Page routing decisions
  pipelines/       # Page pipelines
  projects/        # Page projets
  reports/         # Page reports + detail hebdomadaire
  tokens/          # Page token usage + couts
  static/          # CSS, JS, assets
  templates/       # Templates de base, composants partages
```
