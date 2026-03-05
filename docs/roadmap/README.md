# Roadmap — Mugiwara Agents

[![CI](https://github.com/AlexisSisley/mugiwara-agents/actions/workflows/ci.yml/badge.svg)](https://github.com/AlexisSisley/mugiwara-agents/actions/workflows/ci.yml)

Suivi des evolutions du projet. Chaque section documente les ajouts, modifications et corrections par version.

---

## Versions

| Version | Date | Fichier | Resume |
|---------|------|---------|--------|
| v1.0 | 2026-03-02 | [v1.0.md](./v1.0.md) | Release initiale — 38 agents + fix invocation Skill |
| v1.1 | 2026-03-02 | [v1.1.md](./v1.1.md) | Fix disable-model-invocation — agents accessibles cross-projet |
| v1.2 | 2026-03-02 | [v1.2.md](./v1.2.md) | Smoke tests (342 assertions), fix uninstall.sh, fix morgans, agents law-sql & morgans |
| v1.3 | 2026-03-02 | [v1.3.md](./v1.3.md) | Hooks Claude Code — logging, validation, notifications, chainage post-agent |
| v1.4 | 2026-03-03 | [v1.4.md](./v1.4.md) | Tests fonctionnels & CI/CD — framework de test, GitHub Actions, SemVer |
| v1.5 | 2026-03-04 | [v1.5.md](./v1.5.md) | Plugin system — CLI mugiwara, registry, manifests, SHA256, pipeline depends |
| v1.6 | 2026-03-05 | [v1.6.md](./v1.6.md) | Dashboard & Observabilite — SPA web Svelte + API Express, 116 tests, job CI #5 |
| v1.7 | 2026-03-05 | [v1.7.md](./v1.7.md) | Governance & Release — agents monitoring + feature-flags, pipeline release, conventional commits, schema JSON, CHANGELOG auto |

---

## Plan strategique v1.4 → v2.0

Voir [docs/plan-v1.4-v2.0.md](../plan-v1.4-v2.0.md) pour le plan detaille des prochaines phases.

---

## Backlog

Idees et taches a venir (non priorisees) :

- [x] Ajouter des MCP servers recommandes (GitHub, Context7, Playwright, etc.) — guide docs/mcp-servers.md (done v1.2)
- [x] Agent `law-sql` — specialiste SQL (done v1.2)
- [x] Agent `morgans` — generateur d'emails de release QA & Prod (done v1.2)
- [x] Hooks Claude Code pour automatiser des workflows post-agent (done v1.3)
- [x] Tests automatises de chaque agent (smoke tests) — 6 suites, 342 assertions (done v1.2)
- [x] Tests fonctionnels — execution reelle des agents avec validation output (done v1.4)
- [x] GitHub Actions CI — pipeline automatise (done v1.4)
- [x] Politique SemVer formelle — VERSIONING.md (done v1.4)
- [x] Plugin system — CLI mugiwara, registry, manifests, SHA256, depends (done v1.5)
- [x] Franky code review dans pipeline mugiwara (done v1.5)
- [x] Dashboard web pour visualiser les outputs des pipelines (done v1.6)
- [x] CHANGELOG automatique (done v1.7)
- [x] Conventional Commits + commitlint hook (done v1.7)
- [x] Nouveaux agents (monitoring/alerting, feature flags) (done v1.7)
- [x] Pipeline Release automatise (changelog + morgans + tag + deploy) (done v1.7)
- [x] Audit ecosysteme post-v1.7 (done v1.7)
- [ ] Site Docusaurus, marketplace d'agents (v2.0)
