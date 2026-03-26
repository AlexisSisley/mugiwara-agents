# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Starting from v1.7.0, this changelog is generated automatically from
[Conventional Commits](https://www.conventionalcommits.org/).
Entries for v1.0.0 through v1.6.0 were written retroactively from roadmaps and git history.

## [Unreleased]

### Added
- **Scripts de conversion Claude Code custom agents** -- `convert_claude.cjs` convertit les SKILL.md en agents autonomes (.md) pour le dossier `.claude/agents/`. Support des tiers (Tier 1 = 20 agents prioritaires, Tier 2 = 23 agents supplementaires), colorisation automatique par categorie, exemples generes, et mode dry-run.
- **Script de conversion Gemini CLI** -- `convert_all.cjs` convertit les SKILL.md en skills Gemini CLI, avec packaging et installation automatique.
- **`dist-claude-agents/`** -- 22 agents pre-convertis au format Claude Code custom agents, prets a copier dans `.claude/agents/`.
- **Morgans : Templates HTML Gmail & Outlook** -- L'agent `/morgans` genere desormais des templates HTML complets (QA + Production), compatibles Gmail et Outlook (CSS inline, mise en page `<table>`, polices systeme), en plus du format texte brut. Instructions de copier-coller incluses.
- **One Piece : Limite chaine ad-hoc augmentee a 6 agents** -- Le routeur intelligent `/one_piece` peut desormais composer des chaines ad-hoc de 2 a 6 agents (contre 2-3 precedemment), offrant plus de flexibilite dans l'orchestration dynamique.
- **Agent Big Mom** (`/big-mom` ou `/agile`) -- Agile Coach / Scrum Master : ceremonies, sprint planning, retrospectives, velocity tracking, SAFe, Jira/Linear workflows, team health
- **Agent Hawkins** (`/hawkins` ou `/bi`) -- BI & Data Viz : Power BI, Tableau, Metabase, Superset, Looker, DAX/MDX, data storytelling, KPI dashboards
- **Agent Magellan** (`/magellan` ou `/dba`) -- DBA : PostgreSQL, MySQL, MongoDB, Redis tuning, backup/restore, replication, sharding, monitoring
- **Agent Caesar** (`/caesar` ou `/chaos`) -- Chaos Engineering : Chaos Monkey, Litmus, Gremlin, GameDay planning, resilience scoring, circuit breakers
- **Agent Aokiji** (`/aokiji` ou `/gcp`) -- Cloud GCP : Cloud Run, GKE, BigQuery, Cloud Functions, Pub/Sub, Terraform GCP, IAM, gestion des couts
- **Agent Kizaru** (`/kizaru` ou `/azure`) -- Cloud Azure : App Service, Functions, Cosmos DB, AKS, Azure DevOps, Bicep/ARM, Azure AD, gestion des couts
- **Agent Fujitora** (`/fujitora` ou `/a11y`) -- Accessibilite : WCAG 2.2 AA/AAA, ARIA, audit automatise (axe, Lighthouse), remediation, conformite RGAA
- **Agent Katakuri** (`/katakuri` ou `/mlops`) -- AI/ML Ops : MLflow, Kubeflow, feature stores, model serving, drift detection, experiment tracking, GPU optimization
- SKILL.md et mugiwara.yaml pour chaque nouvel agent (P1, P2, P3)
- Routage intelligent inter-agents injecte dans les 5 nouveaux agents (Big Mom, Hawkins, Magellan, Caesar, Aokiji)
- registry.yaml mis a jour avec 78 entrees (56 agents uniques + aliases)
- 108 nouveaux tests (582 total structural)
- 16 jobs CI paralleles dans GitHub Actions
- install.sh et uninstall.sh mis a jour pour les 5 nouveaux agents
- 56 agents uniques crees sur 56 prevus (v1.9 Phases 1-5 completes)

## [1.8.0] - 2026-03-06

### Added
- **Agent Iceburg** (`/iceburg` ou `/docker`) -- Docker : Dockerfile multi-stage, docker-compose, Docker Swarm, Kubernetes, Helm charts, conteneurs Windows
- **Agent Paulie** (`/paulie` ou `/iis`) -- IIS : web.config, application pools, SSL/TLS, URL Rewrite, ARR, deploiement PowerShell
- **Agent Sabo** (`/sabo` ou `/firebase`) -- Firebase : Authentication, Firestore, Security Rules, Hosting, Cloud Functions, Storage, FCM, Extensions, Emulator Suite
- **Agent Coby** (`/coby` ou `/infra-reseau`) -- Infrastructure reseau : firewall (iptables, pf, Windows Firewall), DNS, load balancing (HAProxy, Nginx), VPN, VLAN, SD-WAN
- SKILL.md et mugiwara.yaml pour chaque nouvel agent
- 138 tests de validation syntaxique (Dockerfile, YAML, XML, JSON, Security Rules)
- 4 nouveaux jobs CI dans GitHub Actions (jobs 8-11 : docker, iis, firebase, infra-reseau)
- Registry mis a jour avec 50 entrees (46 agents uniques + 4 alias OP)
- Dashboard : correction du rendu emoji dans la Sidebar pour Vite/Svelte
- Dashboard : nouveaux composants ameliores (Badge, Drawer, Header, Pagination, SearchInput, StatCard, CategoryTag)
- Easter egg Konami (`konami.ts`) et Nakama Roll (`nakama-roll.ts`) dans le dashboard
- Design system v2.0 : palette dark slate (#0F1117), ocean blue (#38BDF8), neubrutalism manga

### Changed
- Palette de couleurs du dashboard : remplacement du parchment par dark slate, gold par ocean blue
- Icones de la Sidebar : remplacement des caracteres pirate unicode par des emojis standard
- Pages AgentsPage, PipelinesPage, SessionsPage ameliorees

## [1.7.0] - 2026-03-05

### Added
- Conventional Commits + commitlint hook (US-701)
- JSON Schema for JSONL agent event logs (US-702)
- CHANGELOG.md with retroactive history (US-703)
- Agent Monitoring/Alerting -- Prometheus + Grafana (US-704)
- Tests for Monitoring agent (US-705)
- Agent Monitoring enrichi -- PagerDuty + OpsGenie integrations (US-706)
- Agent Feature Flags -- env-based, Unleash, LaunchDarkly (US-707)
- Tests for Feature Flags agent (US-708)
- CI pipeline extended with monitoring-tests and feature-flags-tests jobs (US-709)
- Registry updated with feature-flags agent (42 agents total) (US-710)
- Automated Release pipeline -- bump, changelog, morgans email, git tag, GitHub Release (US-711)
- Morgans integration in Release pipeline -- HTML release email generation (US-712)
- Agent Feature Flags enrichi -- LaunchDarkly SDK + comparison matrix (US-713)
- Schema event enum extended with `release_created` and `flag_evaluation` event types
- Release pipeline hardened with registry consistency validation step
- Monitoring agent enriched with PagerDuty/OpsGenie dev/staging testing strategy (Section 5.4)
- Test suites extended: 430 tests total (358 structural + 32 feature-flags + 40 monitoring)

## [1.6.0] - 2026-03-04

### Added
- **Dashboard web** : application Svelte + Express + TypeScript pour visualiser l'ecosysteme
- 116 tests Vitest avec couverture >97%
- Server Express avec API REST (`/api/agents`, `/api/sessions`, `/api/stats`)
- Composants Svelte : AgentList, SessionTimeline, PipelineFlow, StatsPanel
- Design system avec palette One Piece (Luffy Red, Ocean Blue, Gold)
- Scripts seed pour donnees de demonstration

## [1.5.0] - 2026-03-04

### Added
- **Plugin system** : CLI `mugiwara` pour installer/desinstaller/mettre a jour des agents individuellement
- Manifests `mugiwara.yaml` pour chaque agent (version, checksum SHA256, dependances)
- Registry centralisee `registry.yaml` indexant les 40 agents
- Librairies Bash : `core.sh`, `registry.sh`, `manifest.sh`, `installer.sh`
- Commandes CLI : `install`, `uninstall`, `update`, `list`, `search`, `info`
- 48 tests plugin system (390 tests totaux)
- Checksums SHA256 pour l'integrite des fichiers

### Changed
- Franky code review integree dans le workflow

## [1.4.0] - 2026-03-04

### Added
- **Tests fonctionnels** : 342 smoke tests couvrant la structure de tous les agents
- Tests de hooks Claude Code (`test-hooks.sh`)
- Pipeline CI/CD GitHub Actions
- Politique SemVer documentee dans `VERSIONING.md`

## [1.3.0] - 2026-03-03

### Added
- **Claude Code hooks** : 7 hooks pour post-agent workflows
  - `log-agent-output.sh` : journalisation JSONL des invocations
  - `validate-agent-output.sh` : validation qualite des outputs
  - `run-smoke-tests.sh` : tests automatiques sur Write/Edit
  - `run-post-agent-tests.sh` : tests post-invocation
  - `log-session.sh` : journalisation des sessions
  - `notify-complete.sh` : notification de fin
  - `notify-slack.sh` : notification Slack
- Fichier `logs/agents.jsonl` pour la tracabilite

## [1.2.0] - 2026-03-03

### Added
- **40 agents** dans l'ecosysteme (extension depuis 20+)
- Agent **morgans** : generateur d'emails de release QA et mise en production
- Smoke tests et guide MCP
- Correction parite `uninstall.sh`

### Changed
- Mise a jour de tous les SKILL.md, documentation et install script

## [1.1.0] - 2026-03-03

### Added
- Agent **law-sql** : specialiste SQL et convertisseur Doc-to-SQL
- Dossier `docs/` pour la documentation centralisee
- Agent **bon-clay** : easter egg architect
- Agents **bartholomew**, **perona**, **senor-pink**, **api-postman**
- Agent **sanji-i18n** (Wan Shotto) : sous-chef traduction
- Agent **one_piece** : routeur intelligent
- Pipeline **doc-hunt** (Yamato -> Brook)
- Pipelines **ace** (Pre-Launch) et **law** (Modernize)
- Agent **sanji-design** (Galley-La) : sous-chef design UI/UX

### Changed
- Audit Vegapunk P0+P1 applique : Shanks dans Modernize, allowed-tools pipelines

## [1.0.0] - 2026-03-02

### Added
- **Ecosysteme initial** de 20+ agents Claude Code
- Agents principaux : luffy, zorro, nami, sanji, usopp, chopper, robin, franky, brook, jinbe
- Sous-chefs Sanji : dotnet, flutter, go, java, python, rust, ts
- Agents specialises : vegapunk, vivi, yamato, ace, law, shanks, morgans
- Pipelines : mugiwara, incident, pre-launch, onboard, modernize, discovery
- Script `install.sh` et `uninstall.sh`
- README.md et documentation initiale

[Unreleased]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.8.0...HEAD
[1.8.0]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.6.0...v1.7.0
[1.6.0]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.5.0-beta.1...v1.6.0
[1.5.0]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.4.0...v1.5.0-beta.1
[1.4.0]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/AlexisSisley/mugiwara-agents/releases/tag/v1.0.0
