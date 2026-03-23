# Subagents Claude Code — Architecture & Guide de Creation

## Vue d'ensemble

L'ecosysteme Mugiwara utilise un modele **hub-and-spoke avec agents eleves** :

- **1 orchestrateur** : `one_piece` — routeur intelligent, point d'entree universel
- **8 subagents eleves** : agents promus pour invocation directe via `Agent` tool
- **70+ skills** : agents specialises invoquables via `Skill` tool par one_piece ou directement

```
┌──────────────────────────────────────────────────────────┐
│                       Claude Code                         │
│                                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │            System Prompt (descriptions)             │  │
│  │  one_piece | chopper | franky | nami | jinbe        │  │
│  │  robin | zorro | sanji | luffy                      │  │
│  └────────────────────────────────────────────────────┘  │
│           │                      │                        │
│     Agent tool              Skill tool                    │
│     (8 subagents)           (skills & pipelines)          │
│           │                      │                        │
│  ┌────────┴──────┐    ┌─────────┴──────────────┐        │
│  │ chopper (debug)│    │ usopp, brook, yamato   │        │
│  │ franky (review)│    │ law, shanks, vivi, ace │        │
│  │ nami (QA)      │    │ crocodile, kizaru      │        │
│  │ jinbe (secu)   │    │ sanji-ts, sanji-python │        │
│  │ robin (carto)  │    │ + 55 autres skills     │        │
│  │ zorro (specs)  │    │ + 8 pipelines          │        │
│  │ sanji (archi)  │    └────────────────────────┘        │
│  │ luffy (synthese│                                       │
│  └────────────────┘                                       │
└──────────────────────────────────────────────────────────┘
```

## Subagents Eleves

### Pourquoi ces 8 agents ?

Criteres d'elevation (3+ requis) :

| Critere | Description |
|---------|-------------|
| **Autonomie** | Peut travailler seul sans inputs d'autres agents |
| **Poids contextuel** | Produit beaucoup d'output, beneficie d'un contexte isole |
| **Parallelisable** | Peut tourner en background pendant que l'utilisateur travaille |
| **Usage proactif** | Devrait se declencher automatiquement (ex: apres ecriture de code) |
| **Usage direct frequent** | Invoque souvent sans passer par one_piece |
| **Isolation securitaire** | Travaille sur des sujets sensibles (securite, compliance) |

### Les 8 eleves

| Subagent | Role | Declenchement proactif | Remplace |
|----------|------|------------------------|----------|
| **chopper** | Debug & Diagnostic (RCA, stack traces, logs) | Oui — quand un bug/erreur apparait | — |
| **franky** | Code Review & Audit (SOLID, OWASP, dette technique) | Oui — apres ecriture de code | `certified-code-reviewer` |
| **nami** | QA Lead (ISTQB, tests, verdict PASS/FAIL) | Oui — apres completion de feature | `istqb-qa-reviewer` |
| **jinbe** | SecOps & Compliance (STRIDE, RGPD, SOC2) | Oui — sur code auth/donnees/API | — |
| **robin** | Cartographie systeme (reverse-engineering, ADR) | Non — a la demande uniquement | — |
| **zorro** | Business Analyst (specs, user stories, Gherkin, risques) | Non — invocation explicite | — |
| **sanji** | Architecte Senior (stack selection, design, scaffolding) | Non — invocation explicite | — |
| **luffy** | Capitaine / Syntheseur (roadmap, arbitrage, KPIs) | Non — invocation explicite | — |

### Difference Subagent vs Skill

| Aspect | Subagent (Agent tool) | Skill (Skill tool) |
|--------|----------------------|-------------------|
| **Contexte** | Isole (propre fenetre de contexte) | Partage la conversation courante |
| **Parallelisation** | Oui (plusieurs Agent calls simultanes) | Non (sequentiel) |
| **Background** | Oui (`run_in_background: true`) | Non |
| **Isolation repo** | Oui (`isolation: "worktree"`) | Non |
| **Presence system prompt** | Oui (description dans le system prompt) | Non (charge a la demande) |
| **Cout en tokens** | ~200 tokens par agent dans le system prompt | 0 tokens (charge uniquement quand invoque) |

## Architecture Technique

### Fichiers cles

```
mugiwara-agents/
├── skills/                          # Source des agents (SKILL.md + mugiwara.yaml)
│   ├── one_piece/SKILL.md           # Orchestrateur — routeur intelligent
│   ├── chopper/SKILL.md             # Debug & diagnostic
│   ├── franky/SKILL.md              # Code review & audit
│   ├── nami/SKILL.md                # QA & verification
│   ├── jinbe/SKILL.md               # Securite & compliance
│   ├── robin/SKILL.md               # Cartographie systeme
│   └── .../                         # 80+ autres skills
├── dist-claude-agents/              # Output genere (agents .md compiles)
├── convert_claude.cjs               # Script de conversion skill → subagent
├── registry.yaml                    # Registre avec metadata (version, category, elevated)
└── SUBAGENTS.md                     # Ce fichier
```

### Destination

```
~/.claude/agents/                    # Repertoire des subagents Claude Code
├── one_piece.md                     # Orchestrateur (yellow)
├── chopper.md                       # Debug (red)
├── franky.md                        # Code review (orange)
├── nami.md                          # QA (green)
├── jinbe.md                         # Securite (orange)
├── robin.md                         # Cartographie (cyan)
├── zorro.md                         # Business Analyst (cyan)
├── sanji.md                         # Architecte (blue)
└── luffy.md                         # Capitaine (pink)
```

## Conversion & Installation

### Commandes

```bash
# Generer one_piece + 5 eleves (defaut)
node convert_claude.cjs

# Generer + installer dans ~/.claude/agents/
node convert_claude.cjs --install

# Generer uniquement one_piece (legacy)
node convert_claude.cjs --router-only

# Generer tous les agents (legacy)
node convert_claude.cjs --all-agents

# Preview sans ecrire
node convert_claude.cjs --dry-run

# Agents specifiques
node convert_claude.cjs --agents chopper,franky
```

### Processus `--install`

1. Genere `one_piece.md` + les 5 agents eleves dans `dist-claude-agents/`
2. Copie les 6 fichiers dans `~/.claude/agents/`
3. Supprime les agents deprecies (`certified-code-reviewer`, `istqb-qa-reviewer`)
4. Supprime les anciens agents Mugiwara individuels qui ne sont pas eleves
5. Preserve les agents non-Mugiwara (s'il y en a)

### Structure d'un fichier subagent genere

```yaml
---
name: chopper
description: >
  Use this agent when the user encounters a bug, error, stack trace...
  [description proactive + exemples d'utilisation]
model: opus
color: red
memory: project
---

# Contenu du SKILL.md transforme
[Corps du prompt avec $ARGUMENTS remplace par du contexte dynamique]
```

## Configuration dans `convert_claude.cjs`

### Constantes cles

```javascript
// Agents promus en subagents
const ELEVATED_AGENTS = ['chopper', 'franky', 'nami', 'jinbe', 'robin', 'zorro', 'sanji', 'luffy'];

// Descriptions custom avec triggers proactifs et exemples
const ELEVATED_DESCRIPTIONS = {
  chopper: { description: "...", examples: [...], memory: 'project' },
  franky:  { description: "...", examples: [...], memory: 'user' },
  nami:    { description: "...", examples: [...], memory: 'user' },
  jinbe:   { description: "...", examples: [...], memory: 'user' },
  robin:   { description: "...", examples: [...], memory: 'project' },
};

// Agents deprecies (supprimes lors de --install)
const DEPRECATED_AGENTS = ['certified-code-reviewer', 'istqb-qa-reviewer'];
```

### Logique de generation

Pour les agents eleves, `generateDescription()` utilise les descriptions custom de
`ELEVATED_DESCRIPTIONS` au lieu des descriptions generiques par categorie. Cela permet :
- Des triggers proactifs specifiques (pas juste "use when category X")
- Des exemples adaptes avec usage proactif
- Un memory scope personnalise (project vs user)

## Registre (`registry.yaml`)

Les agents eleves sont marques avec `elevated: true` :

```yaml
chopper:
  version: 1.5.0
  description: "Urgentiste specialise en diagnostic et resolution de bugs"
  category: debugging
  role: agent
  elevated: true
```

## One Piece — Orchestration & Pipelines Dynamiques

### Systeme d'invocation dual

One Piece dispose de deux outils :
- **`Agent`** — pour les 5 subagents eleves (contexte isole, parallelisable)
- **`Skill`** — pour tous les autres agents et pipelines

### Pipelines dynamiques

Quand aucun pipeline existant ne correspond au besoin, One Piece compose un
**pipeline dynamique** en temps reel :

1. Decompose le besoin en etapes
2. Choisit l'agent optimal par etape
3. Orchestre en sequence ou parallele (subagents en parallele via multiple Agent calls)
4. Mixe librement subagents, skills et pipelines existants
5. Limite : 8 etapes maximum

Exemple :
```
"Audite et securise mon API avant le deploiement AWS"

| # | Etape              | Agent     | Type  | Mode                    |
|---|--------------------|-----------|-------|-------------------------|
| 1 | Cartographie API   | robin     | [S]   | -                       |
| 2 | Audit code         | franky    | [S]   | parallele               |
| 2 | Audit securite     | jinbe     | [S]   | parallele               |
| 3 | Remediation        | franky    | [S]   | sequentiel (attend #2)  |
| 4 | Deploiement AWS    | crocodile | skill | sequentiel (attend #3)  |
```

## Ajouter un nouveau subagent eleve

### Checklist

1. **Verifier les criteres** : l'agent doit remplir 3+ criteres d'elevation (voir tableau ci-dessus)
2. **Ajouter au tableau** `ELEVATED_AGENTS` dans `convert_claude.cjs`
3. **Creer la description** dans `ELEVATED_DESCRIPTIONS` avec :
   - `description` : trigger conditions + couverture + mention proactive si applicable
   - `examples` : 2-3 exemples dont au moins 1 proactif (si applicable)
   - `memory` : `'project'` (contextuel) ou `'user'` (persistant)
4. **Marquer dans `registry.yaml`** : ajouter `elevated: true`
5. **Mettre a jour la matrice** dans `skills/one_piece/SKILL.md` : marquer [S] dans la colonne Type
6. **Mettre a jour la Phase 3** de one_piece : ajouter l'agent dans le tableau d'invocation dual
7. **Regenerer** : `node convert_claude.cjs --install`
8. **Tester** : verifier le declenchement direct et proactif

### Retirer un subagent eleve

1. Retirer de `ELEVATED_AGENTS` et `ELEVATED_DESCRIPTIONS` dans `convert_claude.cjs`
2. Retirer `elevated: true` de `registry.yaml`
3. Mettre a jour la matrice one_piece (retirer [S])
4. Regenerer : `node convert_claude.cjs --install` (l'ancien .md sera supprime de ~/.claude/agents/)

## Historique des changements

### 2026-03-23 — Elevation initiale (v2.2)

**Agents eleves** : chopper, franky, nami, jinbe, robin

**Agents remplaces** :
- `certified-code-reviewer` → **franky** (audit code + OWASP + dette technique)
- `istqb-qa-reviewer` → **nami** (QA ISTQB + build verification + feedback loops)

**Modifications** :
- `convert_claude.cjs` : ajout `ELEVATED_AGENTS`, `ELEVATED_DESCRIPTIONS`, `DEPRECATED_AGENTS`,
  mode par defaut genere one_piece + eleves, flag `--router-only`, logique --install etendue
- `registry.yaml` : `elevated: true` sur les 5 agents
- `skills/one_piece/SKILL.md` : ajout `Agent` aux allowed-tools, matrice +15 agents,
  colonne Type [S]/skill, Phase 3 refactoree (dual invocation), pipelines dynamiques,
  regles de disambiguation 15-21

### 2026-03-23 — Elevation Core Team (v2.3)

**Nouveaux agents eleves** : zorro, sanji, luffy (total : 8 subagents + 1 orchestrateur)

**Justifications** :
- **Zorro** (4/6 criteres) : analyse business autonome, output lourd (7 sections structurees), usage direct frequent
- **Sanji** (4/6 criteres) : architecte le plus lourd (5 phases + delegation a 9 sous-chefs), output massif
- **Luffy** (2/6 criteres, elevation conditionnelle) : role unique de synthese strategique/capitaine, consolide les analyses de Zorro+Sanji+Nami

**Decisions** :
- Les sous-chefs de Sanji (sanji-ts, sanji-python, etc.) restent des skills
- Luffy n'a pas de declenchement proactif (depend des inputs des autres)
- Tous les 3 utilisent memory scope `project`

**Modifications** :
- `convert_claude.cjs` : ELEVATED_AGENTS etendu a 8, ajout 3 ELEVATED_DESCRIPTIONS
- `registry.yaml` : `elevated: true` sur zorro, sanji, luffy
- `skills/one_piece/SKILL.md` : matrice mise a jour [S] pour les 3, tableau invocation +3
- `SUBAGENTS.md` : documentation mise a jour (schema, tableaux, historique)
