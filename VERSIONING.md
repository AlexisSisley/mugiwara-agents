# Politique de Versioning — Mugiwara Agents

> Semantic Versioning (SemVer) applique au projet mugiwara-agents.
> Reference : [semver.org](https://semver.org/)

---

## Format de version

```
MAJOR.MINOR.PATCH[-pre-release]
```

Exemples : `1.0.0`, `1.4.0`, `2.0.0-alpha.1`

---

## Regles SemVer

### MAJOR (X.0.0) — Breaking Changes

Incremente quand une modification **casse la compatibilite** avec les versions precedentes. Les utilisateurs doivent adapter leur usage.

**Declencheurs :**

| Changement | Exemple |
|------------|---------|
| Renommage d'une commande agent | `/zorro` devient `/zoro` |
| Suppression d'un agent existant | Retrait de `/bon-clay` du roster |
| Changement de format des SKILL.md | Nouveau front matter YAML obligatoire, champs renommes |
| Modification du comportement d'un pipeline | `/mugiwara` change l'ordre de sa chaine (ex: Nami avant Sanji) |
| Changement de la structure d'installation | `install.sh` installe dans un repertoire different |
| Changement du format de sortie des hooks | `logs/agents.jsonl` change de schema JSON |

**Historique projet :**

| Version | Description | Justification MAJOR |
|---------|-------------|---------------------|
| **v1.0.0** | Release initiale — 38 agents, 8 pipelines, smart router, MCP servers | Premiere version publique. Par convention, `1.0.0` marque la premiere release stable. |

---

### MINOR (0.X.0) — Nouvelles fonctionnalites

Incremente quand de nouvelles fonctionnalites sont ajoutees **sans casser l'existant**. Les utilisateurs beneficient de nouveautes sans rien changer.

**Declencheurs :**

| Changement | Exemple |
|------------|---------|
| Ajout d'un nouvel agent | Nouveau sous-chef `/sanji-swift` |
| Ajout d'une nouvelle pipeline | Nouveau pipeline `/monitoring` |
| Ajout de nouveaux hooks | Hook `auto-changelog.sh` |
| Nouvelle fonctionnalite dans un agent existant | `/vegapunk` gagne une commande `benchmark` |
| Ajout d'un MCP server recommande | Nouveau MCP server dans la configuration |
| Nouvelles suites de tests | Framework de tests fonctionnels |

**Historique projet :**

| Version | Description | Justification MINOR |
|---------|-------------|---------------------|
| **v1.2.0** | Agents `law-sql` et `morgans`, smoke tests (342 assertions), guide MCP servers | Ajout de 2 nouveaux agents et d'un framework de tests — nouvelles fonctionnalites |
| **v1.3.0** | Hooks Claude Code — logging, validation, notifications, detection fin pipeline | Ajout de 6 hooks et d'un systeme d'observabilite complet — nouvelle fonctionnalite majeure |
| **v1.4.0** | Tests fonctionnels, CI/CD GitHub Actions, politique SemVer | Nouveau framework de tests + pipeline CI — nouvelles fonctionnalites |
| **v1.5.0** | Plugin system — CLI mugiwara, registry, manifests, SHA256, depends | Ajout du systeme de plugins complet — nouvelle fonctionnalite majeure |
| **v1.6.0** | Dashboard web — SPA Svelte + API Express, 116 tests, job CI #5 | Ajout du dashboard d'observabilite — nouvelle fonctionnalite majeure |
| **v1.7.0** | Governance & Release — agents monitoring + feature-flags, pipeline release, conventional commits, schema JSON, CHANGELOG auto | Ajout de 2 agents, pipeline release, infrastructure de gouvernance — nouvelles fonctionnalites |

---

### PATCH (0.0.X) — Corrections

Incremente pour les corrections de bugs et ajustements mineurs **sans nouvelle fonctionnalite ni breaking change**.

**Declencheurs :**

| Changement | Exemple |
|------------|---------|
| Bug fix dans un agent | Correction d'un prompt qui generait un format incorrect |
| Correction de documentation | Faute de frappe dans un SKILL.md, README mis a jour |
| Ajustement de configuration | Changement d'un parametre YAML dans un agent existant |
| Fix de script d'installation | Correction de `install.sh` ou `uninstall.sh` |
| Correction de coherence | Alignement de parametres entre agents |

**Historique projet :**

| Version | Description | Justification PATCH |
|---------|-------------|---------------------|
| **v1.1.0** | Fix `disable-model-invocation: true` → `false` dans 78 fichiers | **Note retrospective** : classe PATCH car c'est une correction de bug (les agents ne fonctionnaient pas en cross-projet). En pratique, cette version aurait du etre `v1.0.1`. Voir la section "Retrospective" ci-dessous. |

---

## Retrospective — Classification des versions existantes

Le projet a livre v1.0 a v1.3 en une seule journee (2026-03-02), avant la formalisation de cette politique SemVer. Voici la classification retrospective et la correspondance SemVer correcte :

| Version publiee | Version SemVer correcte | Type | Contenu |
|-----------------|-------------------------|------|---------|
| v1.0 | **1.0.0** | MAJOR | Release initiale : 38 agents, 8 pipelines, smart router, MCP servers |
| v1.1 | **1.0.1** | PATCH | Fix `disable-model-invocation` — correction de bug bloquant |
| v1.2 | **1.1.0** | MINOR | Nouveaux agents (law-sql, morgans), smoke tests, guide MCP, fix uninstall.sh |
| v1.3 | **1.2.0** | MINOR | Hooks Claude Code (6 hooks), systeme d'observabilite |
| v1.4 | **1.3.0** | MINOR | Tests fonctionnels, CI/CD, politique SemVer (cette version) |

**A partir de la v1.4**, toutes les nouvelles versions suivent strictement cette politique SemVer.

---

## Pre-releases

Les pre-releases permettent de tester une version avant sa publication officielle.

### Format

```
MAJOR.MINOR.PATCH-<phase>.<numero>
```

### Phases de pre-release

| Phase | Usage | Exemple |
|-------|-------|---------|
| `alpha` | Developpement actif, instable, fonctionnalites incompletes | `1.4.0-alpha.1` |
| `beta` | Fonctionnalites completes, en phase de test | `1.4.0-beta.1` |
| `rc` | Release Candidate, pret pour production sauf bug bloquant | `1.4.0-rc.1` |

### Regles

- Les pre-releases ont une **precedence inferieure** a la version normale : `1.4.0-alpha.1` < `1.4.0`
- Le numero s'incremente a chaque nouvelle pre-release de la meme phase : `alpha.1`, `alpha.2`, `alpha.3`
- Une pre-release **ne doit jamais** etre installee en production
- Le passage `rc` → release finale ne necessite aucun changement de code (sauf bug decouvert)

### Workflow typique

```
1.4.0-alpha.1  →  Developpement initial
1.4.0-alpha.2  →  Corrections suite aux premiers tests
1.4.0-beta.1   →  Feature freeze, tests intensifs
1.4.0-rc.1     →  Candidate finale
1.4.0          →  Release officielle
```

---

## Tagging Git

### Convention de nommage

```
v<MAJOR>.<MINOR>.<PATCH>[-<pre-release>]
```

Exemples : `v1.4.0`, `v2.0.0-alpha.1`, `v1.4.1`

### Processus de creation d'un tag

```bash
# 1. S'assurer d'etre sur la branche main, a jour
git checkout main
git pull origin main

# 2. Verifier que les tests passent
./tests/test_structural.sh

# 3. Creer un tag annote (obligatoire — pas de tag leger)
git tag -a v1.4.0 -m "v1.4.0 — Tests fonctionnels & CI/CD

- Framework de tests fonctionnels (40 agents)
- GitHub Actions CI pipeline
- Tests automatises des hooks v1.3
- Politique SemVer (VERSIONING.md)"

# 4. Pousser le tag
git push origin v1.4.0
```

### Regles de tagging

| Regle | Description |
|-------|-------------|
| Tags annotes uniquement | Utiliser `git tag -a`, jamais `git tag` (leger) |
| Message descriptif | Le message du tag liste les changements principaux |
| Branche main uniquement | Les tags de release ne sont crees que sur `main` |
| Pas de tag retroactif | Ne pas re-tagger un commit deja tagge (creer un PATCH a la place) |
| Pre-releases sur branches | Les tags alpha/beta/rc peuvent etre sur des branches de dev |

### Tags retrospectifs pour l'historique

Pour les versions deja publiees, les tags suivants doivent etre crees sur les commits correspondants :

```bash
# Tags sur les commits historiques
git tag -a v1.0.0 <commit-hash-v1.0> -m "v1.0.0 — Release initiale (38 agents, 8 pipelines)"
git tag -a v1.1.0 <commit-hash-v1.1> -m "v1.1.0 — Fix disable-model-invocation"
git tag -a v1.2.0 <commit-hash-v1.2> -m "v1.2.0 — Smoke tests, law-sql, morgans"
git tag -a v1.3.0 <commit-hash-v1.3> -m "v1.3.0 — Hooks Claude Code"
```

---

## Processus de bump de version

### Qui decide du bump ?

| Role | Responsabilite |
|------|---------------|
| `/luffy` (Program Manager) | Decide du type de bump (MAJOR/MINOR/PATCH) et valide la release |
| `/nami` (QA Lead) | Valide que les tests passent avant tout tag |
| `/brook` (Technical Writer) | Met a jour la documentation de release (roadmap, CHANGELOG) |
| `/usopp` (DevOps) | Execute le tagging et le deploiement CI |

### Checklist avant release

- [ ] Tous les smoke tests passent (`./tests/test_structural.sh`)
- [ ] Les tests fonctionnels passent (si disponibles)
- [ ] La documentation de la version est creee (`docs/roadmap/vX.Y.md`)
- [ ] Le README.md est a jour si necessaire
- [ ] Le roadmap README est mis a jour (`docs/roadmap/README.md`)
- [ ] Le type de bump est correctement determine (MAJOR/MINOR/PATCH)
- [ ] Le tag est cree sur `main` avec un message descriptif

### Arbre de decision pour le type de bump

```
Le changement casse-t-il la compatibilite ?
  ├── OUI → MAJOR
  └── NON
       ├── Ajoute-t-il une fonctionnalite ?
       │    ├── OUI → MINOR
       │    └── NON → PATCH
       └── (corrections, docs, refactoring interne → PATCH)
```

---

## Cas limites et decisions

| Cas | Decision | Justification |
|-----|----------|---------------|
| Ajout d'un champ optionnel dans le front matter YAML | PATCH | Pas de breaking change, les anciens fichiers restent valides |
| Ajout d'un champ obligatoire dans le front matter YAML | MAJOR | Les SKILL.md existants deviennent invalides |
| Depreciation d'un agent (marque obsolete mais toujours fonctionnel) | MINOR | Pas de casse, l'agent fonctionne encore |
| Suppression effective d'un agent deprecie | MAJOR | Breaking change pour les utilisateurs de cet agent |
| Modification du prompt interne d'un agent (meme commande, sortie differente) | PATCH | Pas de changement d'interface, amelioration interne |
| Changement du modele par defaut (`opus` → autre) | MAJOR | Impacte la qualite de sortie de tous les agents |
| Ajout d'un `allowed-tools` a un agent qui n'en avait pas | MINOR | Nouvelle contrainte, mais pas de casse fonctionnelle |
| Restriction d'un `allowed-tools` existant (retrait d'un outil) | MAJOR | Un agent perd une capacite — breaking change |

---

## Integration avec le workflow du projet

### Branches et versions

```
main                    ← versions stables uniquement
  └── feature/v1.5-*    ← developpement de la prochaine MINOR
  └── fix/issue-*       ← corrections pour la prochaine PATCH
  └── release/v2.0-*    ← preparation d'une MAJOR
```

### Lien avec la roadmap

Chaque version correspond a un fichier dans `docs/roadmap/` :

| Version | Fichier roadmap | Statut |
|---------|----------------|--------|
| v1.0.0 | `docs/roadmap/v1.0.md` | Done |
| v1.1.0 | `docs/roadmap/v1.1.md` | Done |
| v1.2.0 | `docs/roadmap/v1.2.md` | Done |
| v1.3.0 | `docs/roadmap/v1.3.md` | Done |
| v1.4.0 | `docs/roadmap/v1.4.md` | Done |
| v1.5.0 | `docs/roadmap/v1.5.md` | Done |
| v1.6.0 | `docs/roadmap/v1.6.md` | Done |
| v1.7.0 | `docs/roadmap/v1.7.md` | Done |

Le plan strategique global est dans `docs/plan-v1.4-v2.0.md`.

---

## Resume rapide

| Quand je... | Je bumpe... | Exemple |
|-------------|-------------|---------|
| Supprime ou renomme un agent/commande | **MAJOR** | `/zorro` → `/zoro` = v2.0.0 |
| Change le format YAML obligatoire | **MAJOR** | Nouveau champ requis = v2.0.0 |
| Ajoute un nouvel agent | **MINOR** | `/sanji-swift` = v1.5.0 |
| Ajoute une nouvelle pipeline | **MINOR** | `/monitoring` = v1.5.0 |
| Ajoute de nouveaux hooks | **MINOR** | `auto-changelog.sh` = v1.5.0 |
| Corrige un bug dans un agent | **PATCH** | Fix prompt = v1.4.1 |
| Corrige la documentation | **PATCH** | Typo dans README = v1.4.1 |
| Ajuste un script d'installation | **PATCH** | Fix `install.sh` = v1.4.1 |
