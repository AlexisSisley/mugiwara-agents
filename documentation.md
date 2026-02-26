# Documentation Technique -- Mugiwara Agents

## Table des matieres

1. [Explanation -- Comprendre le projet](#1-explanation----comprendre-mugiwara-agents)
2. [Reference -- Registre complet des agents](#2-reference----registre-complet-des-agents)
3. [Tutorial -- Premier pas avec l'equipage](#3-tutorial----premier-pas-avec-lequipage)
4. [How-to Guide -- Guides pratiques](#4-how-to-guides----guides-pratiques)

---

## 1. Explanation -- Comprendre Mugiwara Agents

### Qu'est-ce que Mugiwara Agents ?

Mugiwara Agents est un ecosysteme de **33 agents IA specialises** (Skills) pour le CLI Claude Code d'Anthropic. Chaque agent est modele d'apres un personnage de l'univers One Piece et incarne un role precis dans le cycle de vie du developpement logiciel -- de la decouverte produit au deploiement en production.

Le projet ne contient aucun code executable. Il s'agit d'une collection de fichiers `SKILL.md` (prompts structures en Markdown avec front matter YAML) qui sont installes dans le repertoire `~/.claude/skills/` de l'utilisateur. Une fois charges par Claude Code, ces skills deviennent invocables via des commandes slash (`/zorro`, `/sanji`, `/nami`, etc.).

### Philosophie architecturale

Le projet repose sur trois principes fondateurs :

**1. Separation des responsabilites (Single Responsibility)**
Chaque agent possede une mission unique et bien delimitee. Zorro ne fait que de l'analyse business, Sanji ne fait que de l'architecture technique, Nami ne fait que de la QA. Cette separation permet d'obtenir des outputs de haute qualite car chaque prompt est optimise pour une tache specifique.

**2. Orchestration par pipelines**
Les agents peuvent etre chaines entre eux. Le pipeline `mugiwara` orchestre les 4 agents core en sequence : Zorro (specs) -> Sanji (architecture + scaffolding) -> Nami (verification + QA) -> Luffy (synthese). Sept pipelines pre-configures couvrent les workflows courants : incident response, pre-launch, onboarding, modernisation, discovery produit, et doc-hunt. Le routeur intelligent `one_piece` analyse n'importe quelle demande et dispatche vers le bon agent ou pipeline.

**3. Boucle de retroaction (feedback loop)**
Le pipeline principal integre un mecanisme de correction automatique. Apres le scaffolding par Sanji, Nami inspecte le code genere, lance les builds/tests, et produit un verdict PASS/FAIL. En cas de FAIL, Zorro et/ou Sanji sont rappeles en mode correctif (REFINEMENT/FIX) avant une re-verification. Maximum 1 boucle pour eviter les cycles infinis.

### Choix techniques

| Decision | Choix | Justification |
|----------|-------|---------------|
| Format des agents | Markdown + YAML front matter | Standard natif de Claude Code Skills, pas de tooling custom |
| Contexte d'execution | `context: fork` (tous les agents) | Isolation -- chaque agent demarre avec un contexte vierge |
| Modele | `model: opus` (tous les agents) | Qualite maximale pour l'analyse complexe |
| Invocation | `disable-model-invocation: true` | Les agents ne s'auto-invoquent pas -- uniquement via commande `/` explicite |
| Langue | Miroir de l'input | L'output s'adapte automatiquement a la langue de la demande |
| Tool restrictions | `allowed-tools` par role | Chaque agent n'a acces qu'aux outils necessaires a sa mission |

### Architecture de l'ecosysteme

```
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
                    └────────────┬─────────────┘
                                 │ orchestre
                    ┌────────────▼─────────────┐
                    │    CORE ANALYSIS          │
                    │  Zorro → Sanji → Nami →   │
                    │  Luffy                    │
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
  │ sanji-i18n     │  │                │
  └────────────────┘  │ vivi           │
                      │ ace            │
                      │ law            │
                      └────────────────┘
```

### Graphe de dependances inter-agents

```
/one_piece ──→ (analyse l'intent) ──→ route vers n'importe quel agent ou pipeline ci-dessous

/discovery ──→ /vivi ──→ /mugiwara
/mugiwara  ──→ /zorro ──→ /sanji ──→ /sanji-design (si UI) ──→ /sanji-<stack>
           ──→ /nami (verification + feedback loop)
           ──→ /luffy

/incident  ──→ /chopper ──→ /franky ──→ /jinbe ──→ /usopp
/pre-launch──→ /nami ──→ /franky ──→ /jinbe ──→ /usopp ──→ /ace ──→ /brook
/onboard   ──→ /robin ──→ /franky ──→ /brook
/modernize ──→ /yamato ──→ /robin ──→ /law ──→ /sanji ──→ /shanks ──→ /usopp
/doc-hunt  ──→ /yamato ──→ /brook
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
| 16 | Chopper | `/chopper` | Debugger & Diagnostician | Read, Glob, Grep, Bash(cat/wc/file/git log/git blame) |
| 17 | Brook | `/brook` | Technical Writer | Read, Glob, Grep, Bash(git log/diff/tag/show) |
| 18 | Usopp | `/usopp` | DevOps & IaC | Read, Write, Glob, Grep, Bash(docker/kubectl/terraform/helm/git/ls/cat) |
| 19 | Jinbe | `/jinbe` | SecOps & Compliance | Read, Glob, Grep, Bash(cat/wc/file) |
| 20 | Yamato | `/yamato` | Tech Intelligence & Dashboard | Read, Write, Glob, Grep, Bash(curl/cat/date), WebSearch, WebFetch |
| 21 | Shanks | `/shanks` | Refactoring & Migration | Read, Glob, Grep, Bash(cat/wc/file/git log/git diff) |
| 22 | Vivi | `/vivi` | Product Manager & UX | Read, Glob, Grep, WebSearch, WebFetch |
| 23 | Ace | `/ace` | Performance Engineer | Read, Glob, Grep, Bash(cat/wc/file) |
| 24 | Law | `/law` | Data Engineer & Analytics | Read, Glob, Grep, Bash(cat/wc/file) |

### 2.4 Meta-Agent

| # | Agent | Commande | Role | Tools autorises |
|---|-------|----------|------|-----------------|
| 25 | Vegapunk | `/vegapunk` | Meta-Auditor & Agent Engineer | Read, Write, Edit, Glob, Grep, Bash(cat/wc/file/ls) |

### 2.5 Pipelines (Orchestrateurs)

| # | Pipeline | Commande | Chaine d'agents | Tools autorises |
|---|----------|---------|-----------------|-----------------|
| 26 | Mugiwara | `/mugiwara` | Zorro -> Sanji -> Nami (+ feedback loop) -> Luffy | Read, Glob, Grep, Skill |
| 27 | Discovery | `/discovery` | Vivi -> Mugiwara | Read, Glob, Grep, Skill |
| 28 | Incident | `/incident` | Chopper -> Franky -> Jinbe -> Usopp | Read, Glob, Grep, Skill |
| 29 | Pre-Launch | `/pre-launch` | Nami -> Franky -> Jinbe -> Usopp -> Ace -> Brook | Read, Glob, Grep, Skill |
| 30 | Onboard | `/onboard` | Robin -> Franky -> Brook | Read, Glob, Grep, Skill |
| 31 | Modernize | `/modernize` | Yamato -> Robin -> Law -> Sanji -> Shanks -> Usopp | Read, Glob, Grep, Skill |
| 32 | Doc-Hunt | `/doc-hunt` | Yamato -> Brook | Read, Glob, Grep, Write, Skill |

### 2.5b Smart Router

| # | Agent | Commande | Role | Tools autorises |
|---|-------|----------|------|-----------------|
| 33 | One Piece | `/one_piece` | Routeur intelligent — dispatche vers le bon agent/pipeline | Read, Glob, Grep, Skill |

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
│   └── settings.local.json      # Permissions git pour le repo
├── .gitignore                    # .DS_Store, Thumbs.db, *.log
├── LICENSE                       # MIT License
├── README.md                     # Documentation principale
├── install.sh                    # Script d'installation automatique
├── uninstall.sh                  # Script de desinstallation
├── documentation.md              # Documentation technique (ce fichier)
└── skills/
    ├── ace/SKILL.md              # Performance Engineer
    ├── brook/SKILL.md            # Technical Writer
    ├── chopper/SKILL.md          # Debugger & Diagnostician
    ├── discovery/SKILL.md        # Pipeline: Product Discovery
    ├── doc-hunt/SKILL.md         # Pipeline: Documentation Hunting
    ├── franky/SKILL.md           # Code Reviewer
    ├── incident/SKILL.md         # Pipeline: Incident Response
    ├── jinbe/SKILL.md            # SecOps & Compliance
    ├── law/SKILL.md              # Data Engineer
    ├── luffy/SKILL.md            # Program Manager
    ├── modernize/SKILL.md        # Pipeline: Modernization
    ├── mugiwara/SKILL.md         # Pipeline: Full Analysis
    ├── nami/SKILL.md             # QA Lead
    ├── onboard/SKILL.md          # Pipeline: Onboarding
    ├── one_piece/SKILL.md        # Smart Router
    ├── pre-launch/SKILL.md       # Pipeline: Pre-Launch
    ├── robin/SKILL.md            # System Cartographer
    ├── sanji/SKILL.md            # Architect & Tech Lead
    ├── sanji-design/SKILL.md     # Sous-Chef Design UI/UX
    ├── sanji-dotnet/SKILL.md     # Sous-Chef C# / .NET
    ├── sanji-flutter/SKILL.md    # Sous-Chef Flutter / Dart
    ├── sanji-go/SKILL.md         # Sous-Chef Go
    ├── sanji-i18n/SKILL.md       # Sous-Chef Traduction & i18n
    ├── sanji-java/SKILL.md       # Sous-Chef Java / Kotlin
    ├── sanji-python/SKILL.md     # Sous-Chef Python
    ├── sanji-rust/SKILL.md       # Sous-Chef Rust
    ├── sanji-ts/SKILL.md         # Sous-Chef TypeScript
    ├── shanks/SKILL.md           # Refactoring & Migration
    ├── usopp/SKILL.md            # DevOps & IaC
    ├── vegapunk/SKILL.md         # Meta-Auditor
    ├── vivi/SKILL.md             # Product Manager & UX
    ├── yamato/SKILL.md           # Tech Intelligence
    └── zorro/SKILL.md            # Business Analyst
```

---

## 3. Tutorial -- Premier pas avec l'equipage

### Etape 1 : Installer les agents

```bash
git clone https://github.com/AlexisSisley/mugiwara-agents.git
cd mugiwara-agents
chmod +x install.sh
./install.sh
```

Le script copie les 33 dossiers de skills dans `~/.claude/skills/`. Si un agent existe deja, il est mis a jour.

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

Le pipeline orchestre automatiquement : Zorro -> Sanji (+ sous-chef adapte) -> Nami (+ boucle de correction) -> Luffy.

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

### Comment desinstaller les agents

```bash
cd mugiwara-agents
chmod +x uninstall.sh
./uninstall.sh
```

Le script demande confirmation avant de supprimer les dossiers d'agents de `~/.claude/skills/`.
