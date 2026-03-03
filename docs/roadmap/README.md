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
| v1.4 | Mars 2026 | [v1.4.md](./v1.4.md) | Tests fonctionnels & CI/CD — framework de test, GitHub Actions, SemVer |

---

## Plan strategique v1.4 → v2.0

Voir [docs/plan-v1.4-v2.0.md](../plan-v1.4-v2.0.md) pour le plan detaille des 5 prochaines phases.

---

## Backlog

Idees et taches a venir (non priorisees) :

- [x] Ajouter des MCP servers recommandes (GitHub, Context7, Playwright, etc.) — guide docs/mcp-servers.md (done v1.2)
- [x] Agent `law-sql` — specialiste SQL (done v1.2)
- [x] Agent `morgans` — generateur d'emails de release QA & Prod (done v1.2)
- [x] Hooks Claude Code pour automatiser des workflows post-agent (done v1.3)
- [x] Tests automatises de chaque agent (smoke tests) — 6 suites, 342 assertions (done v1.2)
- [ ] Tests fonctionnels — execution reelle des agents avec validation output (v1.4)
- [ ] GitHub Actions CI — pipeline automatise (v1.4)
- [ ] Politique SemVer formelle (v1.4)
- [ ] Plugin system — packaging des agents en `.mcpb` ou plugin Claude Code (v1.5)
- [ ] Dashboard web pour visualiser les outputs des pipelines (v1.6)
