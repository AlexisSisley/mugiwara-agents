# Roadmap — Mugiwara Agents

Suivi des evolutions du projet. Chaque section documente les ajouts, modifications et corrections par version.

---

## Versions

| Version | Date | Fichier | Resume |
|---------|------|---------|--------|
| v1.0 | 2026-03-02 | [v1.0.md](./v1.0.md) | Release initiale — 38 agents + fix invocation Skill |
| v1.1 | 2026-03-02 | [v1.1.md](./v1.1.md) | Fix disable-model-invocation — agents accessibles cross-projet |
| v1.2 | 2026-03-02 | [v1.2.md](./v1.2.md) | Smoke tests (342 assertions), fix uninstall.sh, fix morgans, agents law-sql & morgans |

---

## Backlog

Idees et taches a venir (non priorisees) :

- [x] Ajouter des MCP servers recommandes (GitHub, Context7, Playwright, etc.) — guide docs/mcp-servers.md (done v1.2)
- [x] Agent `law-sql` — specialiste SQL (done v1.2)
- [x] Agent `morgans` — generateur d'emails de release QA & Prod (done v1.2)
- [ ] Hooks Claude Code pour automatiser des workflows post-agent
- [x] Tests automatises de chaque agent (smoke tests) — 6 suites, 342 assertions (done v1.2)
- [ ] Plugin system — packaging des agents en `.mcpb` ou plugin Claude Code
- [ ] Dashboard web pour visualiser les outputs des pipelines
