# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Starting from v1.7.0, this changelog is generated automatically from
[Conventional Commits](https://www.conventionalcommits.org/).
Entries for v1.0.0 through v1.6.0 were written retroactively from roadmaps and git history.

## [Unreleased]

### Added
- Conventional Commits + commitlint hook (US-701)
- JSON Schema for JSONL agent event logs (US-702)
- CHANGELOG.md with retroactive history (US-703)
- Agent Monitoring/Alerting — Prometheus + Grafana (US-704)
- Tests for Monitoring agent (US-705)
- Agent Monitoring enrichi — PagerDuty + OpsGenie integrations (US-706)
- Agent Feature Flags — env-based, Unleash, LaunchDarkly (US-707)
- Tests for Feature Flags agent (US-708)
- CI pipeline extended with monitoring-tests and feature-flags-tests jobs (US-709)
- Registry updated with feature-flags agent (42 agents total) (US-710)
- Automated Release pipeline — bump, changelog, morgans email, git tag, GitHub Release (US-711)
- Morgans integration in Release pipeline — HTML release email generation (US-712)
- Agent Feature Flags enrichi — LaunchDarkly SDK + comparison matrix (US-713)
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

[Unreleased]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.7.0...HEAD
[1.6.0]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.5.0-beta.1...v1.6.0
[1.5.0]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.4.0...v1.5.0-beta.1
[1.4.0]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/AlexisSisley/mugiwara-agents/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/AlexisSisley/mugiwara-agents/releases/tag/v1.0.0
