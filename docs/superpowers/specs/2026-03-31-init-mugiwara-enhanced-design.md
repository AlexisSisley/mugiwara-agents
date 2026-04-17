# Init Mugiwara Enhanced — Design Spec

**Date:** 2026-03-31
**Status:** Draft
**Scope:** Enrichir la modal Init Mugiwara dans le dashboard-v2 avec personnalisation fine des agents/pipelines et gestion post-init.

## Context

La feature Init actuelle permet d'initialiser un projet avec Mugiwara (`.mugiwara/project.yaml` + `CLAUDE.md`) en choisissant un preset. Mais l'utilisateur ne peut pas personnaliser les agents individuellement, ni modifier la config après l'init.

## Goals

- Personnalisation fine : cocher/décocher des agents et pipelines individuellement
- Gestion post-init : modifier la config Mugiwara d'un projet déjà initialisé
- Preview des changements : voir un diff du CLAUDE.md avant de confirmer

## Design

### 1. Modal — Layout et modes

La modal existante passe de `max-width: 560px` à `750px`. Deux modes :

**Mode Init** (projet sans `.mugiwara/project.yaml`) :
- Header : "Init Mugiwara — {project.name}"
- Stacks détectées (badges, readonly) + sélecteur de preset (dropdown)
- Sélection agents & pipelines (deux colonnes)
- Preview du CLAUDE.md généré (panneau pliable)
- Footer : bouton "Initialize"

**Mode Config** (projet déjà initialisé) :
- Header : "Mugiwara Config — {project.name}"
- Même layout, pré-rempli depuis `project.yaml`
- Preview montre un diff (ancien vs nouveau CLAUDE.md)
- Footer : bouton "Save Config"

**Bouton sur les cartes projet :**
- Sans mugiwara : bouton "Init" (violet)
- Avec mugiwara : bouton "Config" (icône engrenage)

### 2. Deux colonnes agents

**Colonne gauche — "Available Agents"**
- Tous les agents du registre (presets + registry complet)
- Chaque agent : badge nom, type ([S] ou skill), description courte
- Barre de recherche/filtre en haut
- Bouton ">" pour déplacer vers la droite

**Colonne droite — "Active Agents"**
- Agents sélectionnés pour ce projet
- Bouton "<" pour retirer
- En mode Init : pré-remplie depuis le preset sélectionné
- En mode Config : pré-remplie depuis `project.yaml`

**Interactions :**
- Clic ">" / "<" déplace l'agent (animation CSS)
- Changer de preset réinitialise la colonne droite (confirmation si modifications manuelles)
- Double-clic = raccourci de déplacement

**Section Pipelines :**
- Deux mini-colonnes sous les agents : "Available Pipelines" / "Active Pipelines"
- Même principe, plus compact

### 3. Preview et diff du CLAUDE.md

**Mode Init :**
- Panneau pliable, fermé par défaut
- Bouton "Preview CLAUDE.md" pour déplier
- Affiche le contenu de la section `<!-- mugiwara-config -->` qui sera générée

**Mode Config :**
- Bouton "Preview Changes"
- Diff côte à côte simplifié :
  - Gauche = section actuelle (rouge pour les retraits)
  - Droite = nouvelle section (vert pour les ajouts)
- Diff basé sur comparaison ligne par ligne en JS (pas de lib externe)
- Si aucun changement : message "No changes detected"

**UX :**
- Le bouton "Initialize" / "Save Config" est désactivé tant que le preview n'a pas été ouvert au moins une fois
- Après confirmation : toast + reload de la page

### 4. Backend — Endpoints et initializer.py

**Endpoints :**

| Endpoint | Méthode | Rôle |
|----------|---------|------|
| `init-preview/` | GET | Enrichi : retourne TOUS les agents disponibles + état actuel si initialisé |
| `init/` | POST | Enrichi : accepte `custom_agents` et `custom_pipelines` au lieu de juste un preset |
| `init-preview-diff/` | POST | **Nouveau** : reçoit agents/pipelines, retourne `current_md` + `new_md` + `has_changes` |

**Modifications de `initializer.py` :**

- `list_all_agents()` — charge registry + presets, retourne liste complète avec nom, type, description
- `init_project()` — nouveau param `custom_agents: list[str]` et `custom_pipelines: list[str]` (remplacent le preset si fournis)
- `generate_claude_md()` — mode "preview" : retourne le contenu sans écrire le fichier
- `read_current_config()` — lit `project.yaml`, retourne agents/pipelines actifs
- `diff_claude_md()` — retourne ancien + nouveau contenu de la section mugiwara-config

**Structure de réponse `init-preview/` enrichie :**

```json
{
  "stacks": ["typescript", "react"],
  "suggested_preset": "web-fullstack",
  "available_presets": [{"name": "...", "description": "..."}],
  "all_agents": [
    {"name": "chopper", "type": "elevated", "description": "Debug & Diagnostic"}
  ],
  "all_pipelines": [
    {"name": "mugiwara", "description": "Full pipeline"}
  ],
  "active_agents": ["chopper", "franky"],
  "active_pipelines": ["mugiwara", "incident"],
  "is_initialized": false
}
```

## Files to modify

| File | Changes |
|------|---------|
| `projects/initializer.py` | `list_all_agents()`, `read_current_config()`, `diff_claude_md()`, enrichir `init_project()` et `generate_claude_md()` |
| `projects/views.py` | Enrichir `project_init_preview`, `project_init_mugiwara`, ajouter `project_init_diff` |
| `projects/urls.py` | Ajouter route `init-preview-diff/` |
| `projects/templates/projects/index.html` | Refonte de la modal Init (deux colonnes, preview diff, mode config) |
| `projects/templates/projects/partials/_project_grid.html` | Bouton "Config" pour les projets initialisés |
| `static/css/neon-glass.css` | Styles deux colonnes, diff panel, btn-config |
| `core/registry.py` | Aucune modification — fournit déjà `description`, `elevated`, `category` via `load_registry()` |

## Verification

1. **Init nouveau projet** : ouvrir un projet sans Mugiwara, cliquer Init, vérifier détection stack, sélectionner preset, personnaliser agents, preview CLAUDE.md, confirmer → vérifier que `.mugiwara/project.yaml` et `CLAUDE.md` sont créés avec les bons agents
2. **Config projet existant** : ouvrir un projet initialisé, cliquer Config, vérifier que les agents actifs sont à droite, ajouter/retirer un agent, preview diff, sauver → vérifier que `project.yaml` et `CLAUDE.md` sont mis à jour
3. **Changement de preset** : en mode Init, changer le preset dans le dropdown → vérifier que la colonne Active se réinitialise avec les agents du nouveau preset
4. **Filtre agents** : taper dans la barre de recherche → vérifier que la liste Available se filtre
5. **Aucun changement** : en mode Config, ne rien modifier, cliquer Preview Changes → vérifier message "No changes detected"
