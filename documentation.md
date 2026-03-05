# Documentation Technique -- Mugiwara Agents

## Table des matieres

1. [Explanation -- Comprendre le projet](#1-explanation----comprendre-mugiwara-agents)
2. [Reference -- Registre complet des agents](#2-reference----registre-complet-des-agents)
3. [Tutorial -- Premier pas avec l'equipage](#3-tutorial----premier-pas-avec-lequipage)
4. [How-to Guides -- Guides pratiques](#4-how-to-guides----guides-pratiques)
5. [Annexe -- Historique des versions](#5-annexe----historique-des-versions)

---

## 1. Explanation -- Comprendre Mugiwara Agents

### Qu'est-ce que Mugiwara Agents ?

Mugiwara Agents est un ecosysteme de **40 agents IA specialises** (Skills) pour le CLI Claude Code d'Anthropic. Chaque agent est modele d'apres un personnage de l'univers One Piece et incarne un role precis dans le cycle de vie du developpement logiciel -- de la decouverte produit au deploiement en production.

Le projet repose sur une collection de fichiers `SKILL.md` (prompts structures en Markdown avec front matter YAML) qui sont installes dans le repertoire `~/.claude/skills/` de l'utilisateur. Une fois charges par Claude Code, ces skills deviennent invocables via des commandes slash (`/zorro`, `/sanji`, `/nami`, etc.).

Depuis la v1.5, le projet inclut egalement un **systeme de plugins** avec un CLI `mugiwara`, un registre central (`registry.yaml`), des manifests par agent (`mugiwara.yaml`) avec checksums SHA256, et des dependances declarees pour les pipelines. Le projet dispose aussi d'un pipeline **CI/CD GitHub Actions** (v1.4) avec 4 suites de tests automatisees.

### Philosophie architecturale

Le projet repose sur trois principes fondateurs :

**1. Separation des responsabilites (Single Responsibility)**
Chaque agent possede une mission unique et bien delimitee. Zorro ne fait que de l'analyse business, Sanji ne fait que de l'architecture technique, Nami ne fait que de la QA. Cette separation permet d'obtenir des outputs de haute qualite car chaque prompt est optimise pour une tache specifique.

**2. Orchestration par pipelines**
Les agents peuvent etre chaines entre eux. Le pipeline `mugiwara` orchestre les 4 agents core en sequence : Zorro (specs) -> Sanji (architecture + scaffolding) -> Nami (verification + QA) -> Luffy (synthese). Sept pipelines pre-configures couvrent les workflows courants : incident response, pre-launch, onboarding, modernisation, discovery produit, et doc-hunt. Le routeur intelligent `one_piece` analyse n'importe quelle demande et dispatche vers le bon agent ou pipeline.

**3. Boucle de retroaction (feedback loop)**
Le pipeline principal integre un mecanisme de correction automatique. Apres le scaffolding par Sanji, Nami inspecte le code genere, lance les builds/tests, et produit un verdict PASS/FAIL. En cas de FAIL, Zorro et/ou Sanji sont rappeles en mode correctif (REFINEMENT/FIX) avant une re-verification. Maximum 1 boucle pour eviter les cycles infinis.

**4. Agents actionnables**
Les agents specialistes qui identifient des problemes (Chopper, Shanks, Brook) ont aussi les outils Write/Edit pour appliquer directement les corrections ou produire les livrables. Les agents d'execution (Ace, Law) disposent des outils de build/run necessaires a leur mission (benchmarks, scripts data). Jinbe peut scanner l'historique git et les dependances pour detecter les secrets et vulnerabilites.

**5. Distribution par plugins (v1.5)**
Chaque agent est un plugin autonome avec un manifest `mugiwara.yaml` contenant version, description, categorie, fichiers et checksums SHA256. Un registre central (`registry.yaml`) indexe les 40 agents. Un CLI bash modulaire (`bin/mugiwara`) permet d'installer, mettre a jour et gerer les agents individuellement. Les pipelines declarent leurs dependances inter-agents dans le champ `depends` de leur manifest.

### Choix techniques

| Decision | Choix | Justification |
|----------|-------|---------------|
| Format des agents | Markdown + YAML front matter | Standard natif de Claude Code Skills, pas de tooling custom |
| Contexte d'execution | `context: fork` (tous les agents) | Isolation -- chaque agent demarre avec un contexte vierge |
| Modele | `model: opus` (tous les agents) | Qualite maximale pour l'analyse complexe |
| Invocation | `disable-model-invocation: true` | Les agents ne s'auto-invoquent pas -- uniquement via commande `/` explicite |
| Langue | Miroir de l'input | L'output s'adapte automatiquement a la langue de la demande |
| Tool restrictions | `allowed-tools` par role | Chaque agent n'a acces qu'aux outils necessaires a sa mission |
| Packaging | `mugiwara.yaml` manifest + registre YAML | Distribution par plugin, integrite par SHA256, dependances declaratives |
| CI/CD | GitHub Actions, 4 jobs paralleles | Smoke, fonctionnel, hooks, plugins -- tests offline sans API key |
| Versioning | SemVer strict (VERSIONING.md) | MAJOR/MINOR/PATCH avec politique documentee et arbre de decision |

### Architecture de l'ecosysteme

```
                    ┌──────────────────────────┐
                    │  PLUGIN SYSTEM (v1.5)    │
                    │  bin/mugiwara CLI         │
                    │  registry.yaml            │
                    │  skills/*/mugiwara.yaml   │
                    └────────────┬─────────────┘
                                 │ gere
                          SMART ROUTER
                    ┌──────────────────────────┐
                    │  /one_piece               │
                    │  Analyse → Route → Execute│
                    └────────────┬─────────────┘
                                 │ dispatche vers
                              PIPELINES
                    ┌──────────────────────────┐
                    │  /mugiwara (full)         │
                    │  /discovery (produit)     │
                    │  /incident (urgence)      │
                    │  /pre-launch (go-live)    │
                    │  /onboard (nouveau dev)   │
                    │  /modernize (migration)   │
                    │  /doc-hunt (doc externe)  │
                    │  /api-postman (API→E2E)   │
                    └────────────┬─────────────┘
                                 │ orchestre
                    ┌────────────▼─────────────┐
                    │    CORE ANALYSIS          │
                    │  Zorro → Sanji → Nami →   │
                    │  Franky (review) → Luffy  │
                    └────────────┬─────────────┘
                                 │ delègue
            ┌────────────────────┼────────────────────┐
            │                    │                    │
  ┌─────────▼──────┐  ┌─────────▼──────┐  ┌─────────▼──────┐
  │ SOUS-CHEFS     │  │ SPECIALISTES   │  │ META           │
  │ sanji-dotnet   │  │ franky         │  │ vegapunk       │
  │ sanji-flutter  │  │ robin          │  │                │
  │ sanji-python   │  │ chopper        │  └────────────────┘
  │ sanji-ts       │  │ brook          │
  │ sanji-rust     │  │ usopp          │
  │ sanji-go       │  │ jinbe          │
  │ sanji-java     │  │ yamato         │
  │ sanji-design   │  │ shanks         │
  │ sanji-i18n     │  │ vivi           │
  └────────────────┘  │ ace            │
                      │ law            │
                      │ law-sql        │
                      │ bartholomew    │
                      │ perona         │
                      │ senor-pink     │
                      │ morgans        │
                      └────────────────┘

                    ┌──────────────────────────┐
                    │  CI/CD (v1.4)            │
                    │  GitHub Actions           │
                    │  4 jobs paralleles        │
                    │  smoke | func | hooks |   │
                    │  plugin                   │
                    └──────────────────────────┘
```

### Graphe de dependances inter-agents

```
/one_piece ──→ (analyse l'intent) ──→ route vers n'importe quel agent ou pipeline ci-dessous

/discovery ──→ /vivi ──→ /mugiwara
/mugiwara  ──→ /zorro ──→ /sanji ──→ /sanji-design (si UI) ──→ /sanji-<stack>
           ──→ /nami (verification + feedback loop)
           ──→ /franky (code review post-Nami, v1.5)
           ──→ /luffy

/incident  ──→ /chopper ──→ /franky ──→ /jinbe ──→ /usopp
/pre-launch──→ /nami ──→ /franky ──→ /jinbe ──→ /usopp ──→ /ace ──→ /brook
/onboard   ──→ /robin ──→ /franky ──→ /brook
/modernize ──→ /yamato ──→ /robin ──→ /law ──→ /sanji ──→ /shanks ──→ /usopp
/doc-hunt  ──→ /yamato ──→ /brook

/api-postman──→ /bartholomew ──→ /perona ──→ /senor-pink

Chaine ad-hoc recommandee :
/bartholomew ──→ /perona  (analyse API locale → collection Postman)
```

---

## 2. Reference -- Registre Complet des Agents

### 2.1 Agents Core (Pipeline d'analyse)

| # | Agent | Commande | Role | Tools autorises | Phases |
|---|-------|----------|------|-----------------|--------|
| 1 | Zorro | `/zorro` | Business Analyst (IREB/PSPO) | Read, Glob, Grep | 7 + mode REFINEMENT |
| 2 | Sanji | `/sanji` | Architecte & Tech Lead | Read, Glob, Grep, Bash(mkdir/ls/test) | 5 + P + D + R + mode FIX |
| 3 | Nami | `/nami` | QA Lead (ISTQB Expert) | Read, Glob, Grep, Bash(build/test cmds) | V1-V4 + 7 + mode RE-VERIFICATION |
| 4 | Luffy | `/luffy` | Program Manager / Capitaine | Read, Glob, Grep | 10 |

### 2.2 Sous-Chefs (Sanji's Kitchen)

| # | Agent | Commande | Stack | Tools autorises |
|---|-------|----------|-------|-----------------|
| 5 | Patty | `/sanji-dotnet` | C# / .NET | Read, Write, Edit, Glob, Grep, Bash(dotnet/nuget/mkdir/ls/git) |
| 6 | Carne | `/sanji-flutter` | Dart / Flutter | Read, Write, Edit, Glob, Grep, Bash(flutter/dart/mkdir/ls/git) |
| 7 | Zeff | `/sanji-python` | Python | Read, Write, Edit, Glob, Grep, Bash(python/uv/pip/poetry/mkdir/ls/git) |
| 8 | Cosette | `/sanji-ts` | TypeScript / Node.js | Read, Write, Edit, Glob, Grep, Bash(npx/npm/pnpm/node/mkdir/ls/git) |
| 9 | Terracotta | `/sanji-rust` | Rust | Read, Write, Edit, Glob, Grep, Bash(cargo/rustup/mkdir/ls/git) |
| 10 | Lola | `/sanji-go` | Go | Read, Write, Edit, Glob, Grep, Bash(go/mkdir/ls/git) |
| 11 | Streusen | `/sanji-java` | Java / Kotlin | Read, Write, Edit, Glob, Grep, Bash(mvn/gradle/java/mkdir/ls/git) |
| 12 | Galley-La | `/sanji-design` | Design UI/UX | Read, Glob, Grep, WebSearch, WebFetch |
| 13 | Wan Shotto | `/sanji-i18n` | Traduction & i18n | Read, Write, Edit, Glob, Grep, Bash(ls/cat/wc/find/mkdir) |

### 2.3 Agents Specialistes

| # | Agent | Commande | Role | Tools autorises |
|---|-------|----------|------|-----------------|
| 14 | Franky | `/franky` | Code Reviewer & Log Analyst | Read, Glob, Grep, Bash(cat/wc/file) |
| 15 | Robin | `/robin` | System Cartographer | Read, Glob, Grep, Bash(cat/wc/file/tree/git log) |
| 16 | Chopper | `/chopper` | Debugger & Diagnostician | Read, Write, Edit, Glob, Grep, Bash(cat/wc/file/git log/git blame) |
| 17 | Brook | `/brook` | Technical Writer | Read, Write, Glob, Grep, Bash(git log/diff/tag/show) |
| 18 | Usopp | `/usopp` | DevOps & IaC | Read, Write, Glob, Grep, Bash(docker/kubectl/terraform/helm/git/ls/cat) |
| 19 | Jinbe | `/jinbe` | SecOps & Compliance | Read, Glob, Grep, Bash(cat/wc/file/git log/git diff/npm audit/pip audit/trivy/gitleaks) |
| 20 | Yamato | `/yamato` | Tech Intelligence & Dashboard | Read, Write, Glob, Grep, Bash(curl/cat/date), WebSearch, WebFetch |
| 21 | Shanks | `/shanks` | Refactoring & Migration | Read, Write, Edit, Glob, Grep, Bash(cat/wc/file/git log/git diff) |
| 22 | Vivi | `/vivi` | Product Manager & UX | Read, Glob, Grep, WebSearch, WebFetch |
| 23 | Ace | `/ace` | Performance Engineer | Read, Glob, Grep, Bash(cat/wc/file/npm/npx/node/python/go/cargo/dotnet/k6/ab/curl) |
| 24 | Law | `/law` | Data Engineer & Analytics | Read, Glob, Grep, Bash(cat/wc/file/python/dbt/psql/mysql/sqlite3/spark-submit) |
| 25 | Law-SQL | `/law-sql` | SQL Specialist & Doc-to-SQL Converter | Read, Write, Edit, Glob, Grep, Bash(cat/wc/file/ls) |
| 26 | Bartholomew | `/bartholomew` | Local API Analyzer | Read, Glob, Grep, Bash(cat/wc/file/ls/tree) |
| 27 | Perona | `/perona` | Postman Collection Creator | Read, Glob, Grep, Bash(cat/wc/file/ls) |
| 28 | Senor Pink | `/senor-pink` | E2E Test Collection Creator | Read, Glob, Grep, Bash(cat/wc/file/ls) |
| 29 | Morgans | `/morgans` | Release Email Generator (QA & Prod) | Read, Glob, Grep, Bash(git log/diff/tag/show/ls) |

### 2.4 Meta-Agent

| # | Agent | Commande | Role | Tools autorises |
|---|-------|----------|------|-----------------|
| 30 | Vegapunk | `/vegapunk` | Meta-Auditor & Agent Engineer | Read, Write, Edit, Glob, Grep, Bash(cat/wc/file/ls) |
| 31 | Bon-Clay | `/bon-clay` | Easter Egg Architect (secret) | Read, Write, Edit, Glob, Grep, Bash(cat/ls/file) |

### 2.5 Pipelines (Orchestrateurs)

| # | Pipeline | Commande | Chaine d'agents | Tools autorises |
|---|----------|---------|-----------------|-----------------|
| 32 | Mugiwara | `/mugiwara` | Zorro -> Sanji -> Nami (+ feedback loop) -> Franky (code review) -> Luffy | Read, Glob, Grep, Skill |
| 33 | Discovery | `/discovery` | Vivi -> Mugiwara | Read, Glob, Grep, Skill |
| 34 | Incident | `/incident` | Chopper -> Franky -> Jinbe -> Usopp | Read, Glob, Grep, Skill |
| 35 | Pre-Launch | `/pre-launch` | Nami -> Franky -> Jinbe -> Usopp -> Ace -> Brook | Read, Glob, Grep, Skill |
| 36 | Onboard | `/onboard` | Robin -> Franky -> Brook | Read, Glob, Grep, Skill |
| 37 | Modernize | `/modernize` | Yamato -> Robin -> Law -> Sanji -> Shanks -> Usopp | Read, Glob, Grep, Skill |
| 38 | Doc-Hunt | `/doc-hunt` | Yamato -> Brook | Read, Glob, Grep, Write, Skill |
| 39 | Api-Postman | `/api-postman` | Bartholomew -> Perona -> Senor-Pink | Read, Glob, Grep, Skill |

### 2.5b Smart Router

| # | Agent | Commande | Role | Tools autorises |
|---|-------|----------|------|-----------------|
| 40 | One Piece | `/one_piece` | Routeur intelligent — dispatche vers le bon agent/pipeline | Read, Glob, Grep, Skill |

### 2.6 Configuration commune

Tous les agents partagent ces parametres dans leur YAML front matter :

```yaml
disable-model-invocation: true   # Invocation manuelle uniquement via /commande
context: fork                    # Execution isolee, contexte propre
agent: general-purpose           # Acces complet aux capacites de raisonnement
model: opus                      # Modele le plus performant
```

### 2.7 Standards de format transversaux

Chaque SKILL.md respecte les conventions suivantes :
- Titre H1 avec nom du personnage et role
- Paragraphe de persona en francais avec metaphore One Piece
- Section `$ARGUMENTS` pour recevoir le contexte d'entree
- Methodologie en phases numerotees (5 a 10 phases selon le role)
- Tableaux Markdown avec colonnes d'exemple pre-remplies
- Blocs de code avec exemples de format (Gherkin, SQL, YAML, etc.)
- Section "Regles de Format" en fin de fichier
- Instruction "meme langue que l'input" pour le multilinguisme

### 2.8 Structure des fichiers du projet

```
mugiwara-agents/
├── .claude/
│   ├── hooks/                      # Hooks Claude Code (v1.3)
│   │   ├── log-agent-output.sh     #   Logging JSONL des outputs agents
│   │   ├── validate-agent-output.sh#   Validation synchrone des outputs
│   │   ├── log-session.sh          #   Logging des sessions
│   │   ├── notify-slack.sh         #   Notifications Slack
│   │   ├── notify-complete.sh      #   Detection fin pipeline
│   │   └── run-smoke-tests.sh      #   Smoke tests post-modification
│   └── settings.local.json         # Permissions & hooks config
├── .github/
│   └── workflows/ci.yml            # Pipeline CI GitHub Actions (v1.4)
├── .gitignore                       # .DS_Store, Thumbs.db, *.log
├── bin/
│   └── mugiwara                     # CLI Plugin Manager (v1.5)
├── lib/                             # Librairies CLI (v1.5)
│   ├── core.sh                      #   Utilitaires (couleurs, logging, erreurs)
│   ├── registry.sh                  #   Gestion du registre
│   ├── manifest.sh                  #   Lecture/validation des manifests
│   ├── installer.sh                 #   Logique d'installation/desinstallation
│   ├── cmd_install.sh               #   Commande `install`
│   ├── cmd_uninstall.sh             #   Commande `uninstall`
│   ├── cmd_update.sh                #   Commande `update`
│   ├── cmd_list.sh                  #   Commande `list`
│   ├── cmd_search.sh                #   Commande `search`
│   └── cmd_info.sh                  #   Commande `info`
├── docs/
│   ├── mcp-servers.md               # Guide d'installation MCP Servers
│   ├── plan-v1.4-v2.0.md           # Plan strategique v1.4 → v2.0
│   └── roadmap/                     # Notes de release par version
│       ├── README.md                #   Index des versions
│       ├── v1.0.md ... v1.5.md     #   Details par version
├── tests/                           # Suites de tests (v1.2 → v1.5)
│   ├── test_structural.sh           #   Smoke tests structurels (342+ assertions)
│   ├── functional/                  #   Tests fonctionnels (v1.4)
│   │   ├── run-functional-tests.sh  #     Runner principal
│   │   ├── test-prompts.json        #     Prompts de test par agent
│   │   └── validate-output.sh       #     Validateur generique d'output
│   ├── hooks/                       #   Tests des hooks (v1.4)
│   │   ├── test-hooks.sh            #     Suite de tests pour les 6 hooks
│   │   └── mock-event.json          #     Fixtures d'events simules
│   └── plugin/                      #   Tests du systeme de plugins (v1.5)
│       └── test_cli.sh              #     Tests CLI + manifests + registre
├── skills/                          # 40 agents (chacun avec SKILL.md + mugiwara.yaml)
│   ├── ace/                         #   Performance Engineer
│   │   ├── SKILL.md
│   │   └── mugiwara.yaml            #   Manifest plugin (v1.5)
│   ├── ... (40 agents au total)
│   └── zorro/
│       ├── SKILL.md
│       └── mugiwara.yaml
├── registry.yaml                    # Index central des agents (v1.5)
├── install.sh                       # Script d'installation (tous les agents)
├── uninstall.sh                     # Script de desinstallation
├── documentation.md                 # Documentation technique Diataxis (ce fichier)
├── VERSIONING.md                    # Politique de versioning SemVer (v1.4)
├── LICENSE                          # MIT License
└── README.md                        # Documentation principale
```

### 2.9 Systeme de plugins (v1.5)

#### CLI `mugiwara`

Le CLI bash modulaire (`bin/mugiwara`) offre 6 commandes pour gerer les agents comme des plugins :

| Commande | Description |
|----------|-------------|
| `mugiwara list` | Lister les agents installes et disponibles |
| `mugiwara install <agent>` | Installer un agent depuis le registre |
| `mugiwara uninstall <agent>` | Supprimer un agent |
| `mugiwara update` | Mettre a jour tous les agents |
| `mugiwara search <query>` | Rechercher un agent par nom/description |
| `mugiwara info <agent>` | Afficher les details d'un agent (version, categorie, checksum) |

#### Registre central (`registry.yaml`)

Fichier YAML a la racine du projet indexant les 40 agents avec :
- `version` : version SemVer de l'agent
- `description` : description courte
- `category` : categorie (analysis, pipeline, security, data, etc.)

#### Manifest agent (`mugiwara.yaml`)

Chaque agent possede un manifest `mugiwara.yaml` contenant :
- `name` : identifiant unique
- `version` : version SemVer (1.5.0)
- `description` : description courte
- `category` : categorie
- `files` : liste des fichiers de l'agent
- `checksum` : hash SHA256 de chaque fichier (integrite)
- `depends` : agents requis (pour les pipelines uniquement)

#### Dependances des pipelines

| Pipeline | Depends |
|----------|---------|
| `mugiwara` | zorro, sanji, nami, luffy |
| `discovery` | vivi, mugiwara |
| `incident` | chopper, franky, jinbe, usopp |
| `pre-launch` | nami, franky, jinbe, usopp, ace, brook |
| `onboard` | robin, franky, brook |
| `modernize` | yamato, robin, law, sanji, shanks, usopp |
| `doc-hunt` | yamato, brook |
| `api-postman` | bartholomew, perona, senor-pink |

### 2.10 CI/CD (v1.4)

Le pipeline CI est defini dans `.github/workflows/ci.yml` et se declenche a chaque push sur `main` et a chaque pull request. Il execute 4 jobs paralleles :

| Job | Suite de tests | Description |
|-----|----------------|-------------|
| `smoke-tests` | `tests/test_structural.sh` | 342+ assertions structurelles (existence fichiers, YAML valide, coherence) |
| `functional-tests` | `tests/functional/run-functional-tests.sh --dry-run` | Execution dry-run des 40 agents avec validation output |
| `hooks-tests` | `tests/hooks/test-hooks.sh` | Tests automatises des 6 hooks Claude Code |
| `plugin-tests` | `tests/plugin/test_cli.sh` | Tests du CLI et du systeme de plugins |

Aucune cle API ou secret n'est necessaire : tous les tests s'executent offline.

---

## 3. Tutorial -- Premier pas avec l'equipage

### Etape 1 : Installer les agents

```bash
git clone https://github.com/AlexisSisley/mugiwara-agents.git
cd mugiwara-agents
chmod +x install.sh
./install.sh
```

Le script copie les 40 dossiers de skills dans `~/.claude/skills/`. Si un agent existe deja, il est mis a jour.

**Alternative (v1.5+)** — Installer un agent individuel avec le CLI :

```bash
export PATH="/chemin/vers/mugiwara-agents/bin:$PATH"
mugiwara install zorro
```

### Etape 2 : Redemarrer Claude Code

Fermez et relancez Claude Code (ou demarrez une nouvelle session) pour que les skills soient charges.

### Etape 3 : Verifier l'installation

Tapez `/` dans Claude Code. L'autocompletion devrait afficher tous les membres de l'equipage : `/zorro`, `/sanji`, `/nami`, `/luffy`, `/franky`, `/robin`, etc.

### Etape 4 : Lancer un premier agent

Essayez Zorro pour analyser un probleme business :

```
/zorro Notre plateforme SaaS perd 30% de clients apres 3 mois d'abonnement
```

Zorro va produire :
1. Une reformulation du probleme
2. Une analyse de cause racine (5 Pourquoi / Ishikawa)
3. 5 User Stories (MoSCoW + INVEST)
4. Des criteres d'acceptation en Gherkin
5. Des contraintes et hypotheses
6. Une matrice de risques
7. Une carte des parties prenantes

### Etape 5 : Lancer le pipeline complet

Pour une analyse complete d'un probleme avec scaffolding de projet :

```
/mugiwara Construire un marketplace connectant freelancers et PME
```

Le pipeline orchestre automatiquement : Zorro -> Sanji (+ sous-chef adapte) -> Nami (+ boucle de correction) -> Franky (code review) -> Luffy.

---

## 4. How-to Guides -- Guides pratiques

### Comment auditer du code existant

```
/franky src/api/auth.ts
```

Franky lit les fichiers, identifie les failles OWASP, les violations SOLID/DRY/KISS, et produit un plan d'action priorise par criticite.

### Comment cartographier une codebase inconnue

```
/robin src/
```

Robin explore l'arborescence, cartographie les modules, extrait la logique metier, identifie les zones legacy, et reconstitue les ADR.

### Comment diagnostiquer un bug en production

```
/chopper "TypeError: Cannot read property 'id' of undefined at UserService.ts:42"
```

Ou pour un workflow d'urgence complet (diagnostic + fix + securite + deploy) :

```
/incident "500 errors on /api/payments since 14:30, Stripe webhook timeout in logs"
```

### Comment preparer un go-live

```
/pre-launch Notre nouveau module de facturation avec integration Stripe
```

Le pipeline execute : tests (Nami) -> audit code (Franky) -> securite (Jinbe) -> infra (Usopp) -> performance (Ace) -> documentation (Brook). Produit un dashboard Go/No-Go avec score sur 60.

### Comment integrer un nouveau developpeur

```
/onboard ./src
```

Robin cartographie le systeme, Franky identifie la dette technique, Brook produit un guide d'onboarding pas-a-pas.

### Comment planifier une modernisation de stack

```
/modernize Notre stack Express.js + MongoDB + jQuery deployee sur Heroku
```

Six agents en sequence : veille tech (Yamato) -> cartographie actuelle (Robin) -> analyse data (Law) -> nouvelle architecture (Sanji) -> strategie de migration (Shanks) -> plan infra (Usopp).

### Comment lancer une discovery produit

```
/discovery Un outil SaaS pour freelancers pour tracker le temps et generer des factures
```

Vivi explore le besoin utilisateur (personas, user flows, RICE), puis Mugiwara prend le relais pour le pipeline complet (specs, architecture, scaffolding, QA, roadmap).

### Comment auditer et ameliorer les agents eux-memes

```
/vegapunk audit          # Audit complet de l'ecosysteme
/vegapunk improve franky # Reecrire le SKILL.md de Franky
/vegapunk create "MLOps Engineer"  # Creer un nouvel agent
/vegapunk check nami     # Diagnostic rapide d'un agent
```

### Comment analyser une API et generer une collection Postman

```
/api-postman src/api/
```

Le pipeline orchestre trois agents en sequence : Bartholomew analyse les endpoints et produit une documentation structuree, Perona genere une collection Postman importable, et Senor Pink ajoute des tests E2E chaines avec assertions.

Pour juste analyser l'API sans generer de collection :

```
/bartholomew src/api/
```

### Comment generer un email de release

```
/morgans qa v2.3.0 - Nouveau module de facturation avec integration Stripe
```

Morgans collecte le contexte de release (version, changelog, git log), classifie les changements, et genere un email structure pret a envoyer a l'equipe QA avec les zones de test recommandees.

Pour un email de mise en production :

```
/morgans prod v2.3.0 - Deploiement du module facturation
```

Si le type n'est pas specifie, Morgans genere les deux emails (QA + Production).

### Comment convertir un document en SQL

```
/law-sql Convertir ce fichier Excel de specs en script SQL PostgreSQL
```

Law-SQL analyse les fichiers sources (Excel, Word, CSV, specs texte) et genere des scripts SQL adaptes au dialecte cible. Il peut aussi optimiser des requetes existantes ou migrer entre dialectes SQL.

### Comment utiliser One Piece comme point d'entree universel

Vous ne savez pas quel agent appeler ? Decrivez simplement votre probleme :

```
/one_piece Notre API de paiement retourne des 500 en production depuis ce matin
```

One Piece analyse votre demande et route automatiquement vers le bon agent ou pipeline :
- **Probleme en prod** → route vers `/incident` (Chopper → Franky → Jinbe → Usopp)
- **Nouvelle idee de projet** → route vers `/discovery` (Vivi → Mugiwara)
- **Code a auditer** → route vers `/franky`
- **Stack a moderniser** → route vers `/modernize`

Si One Piece hesite entre plusieurs options, il vous presente un tableau de choix et vous laisse decider. Vous pouvez aussi nommer directement un agent :

```
/one_piece Lance Chopper sur cette stack trace : TypeError at line 42
```

### Comment gerer les agents avec le CLI (v1.5)

Le CLI `mugiwara` permet de gerer les agents individuellement sans passer par `install.sh` :

```bash
# Ajouter le CLI au PATH (une seule fois)
export PATH="/chemin/vers/mugiwara-agents/bin:$PATH"

# Lister les agents installes et disponibles
mugiwara list

# Installer un agent specifique
mugiwara install franky

# Installer un pipeline (installe aussi ses dependances)
mugiwara install incident

# Rechercher un agent par mot-cle
mugiwara search security

# Voir les details d'un agent (version, categorie, checksum)
mugiwara info zorro

# Mettre a jour tous les agents installes
mugiwara update

# Desinstaller un agent specifique
mugiwara uninstall bon-clay
```

### Comment verifier l'integrite des agents

Chaque manifest `mugiwara.yaml` contient un checksum SHA256 de son `SKILL.md`. Le CLI compare ce checksum lors de `mugiwara update` pour detecter les fichiers modifies ou corrompus.

```bash
mugiwara info zorro
# Affiche : version, description, categorie, checksum SHA256
```

### Comment desinstaller les agents

**Methode 1** — Desinstallation complete :

```bash
cd mugiwara-agents
chmod +x uninstall.sh
./uninstall.sh
```

Le script demande confirmation avant de supprimer les dossiers d'agents de `~/.claude/skills/`.

**Methode 2** — Desinstallation individuelle (v1.5) :

```bash
mugiwara uninstall <agent>
```

---

## 5. Annexe -- Historique des versions

| Version | Date | Type SemVer | Contenu principal |
|---------|------|-------------|-------------------|
| v1.0.0 | 2026-03-02 | MAJOR | Release initiale : 38 agents, 8 pipelines, smart router, MCP servers |
| v1.1.0 | 2026-03-02 | PATCH* | Fix `disable-model-invocation` — agents accessibles cross-projet |
| v1.2.0 | 2026-03-02 | MINOR | Smoke tests (342 assertions), agents law-sql & morgans, guide MCP, fix uninstall.sh |
| v1.3.0 | 2026-03-02 | MINOR | Hooks Claude Code : logging JSONL, validation sync, notifications Slack, detection fin pipeline |
| v1.4.0 | 2026-03-03 | MINOR | Tests fonctionnels, tests hooks, CI/CD GitHub Actions, politique SemVer (VERSIONING.md) |
| v1.5.0 | 2026-03-04 | MINOR | Plugin system : CLI mugiwara, registry.yaml, 40 manifests, SHA256 checksums, pipeline depends, Franky code review |

*v1.1.0 aurait du etre v1.0.1 (correction de bug). Voir VERSIONING.md pour la retrospective.

Pour le plan strategique v1.6 a v2.0, voir [docs/plan-v1.4-v2.0.md](./docs/plan-v1.4-v2.0.md).
