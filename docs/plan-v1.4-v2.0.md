# Plan strategique — Mugiwara Agents v1.4 a v2.0

> Plan elabore le 2026-03-02 par analyse de la roadmap existante (docs/roadmap/)

---

## Contexte

Le projet mugiwara-agents a livre 4 versions en une journee (2026-03-02), passant de 0 a 40 agents + 8 pipelines + hooks d'automatisation.

### Etat actuel (v1.0 -> v1.3)

| Version | Contenu principal | Statut |
|---------|-------------------|--------|
| v1.0 | Release initiale : 38 agents, fix invocation Skill, MCP servers recommandes | Done |
| v1.1 | Fix `disable-model-invocation` : agents accessibles cross-projet | Done |
| v1.2 | Smoke tests (342 assertions), fix uninstall.sh, agents law-sql & morgans (total: 40 agents) | Done |
| v1.3 | Hooks Claude Code : logging JSONL, validation sync, notifications Slack, detection fin pipeline | Done |

### Backlog existant

- [x] MCP servers recommandes (guide docs/mcp-servers.md) — done v1.2
- [x] Agent `law-sql` — done v1.2
- [x] Agent `morgans` — done v1.2
- [x] Hooks Claude Code — done v1.3
- [x] Smoke tests (342 assertions) — done v1.2
- [ ] **Plugin system** — packaging des agents en `.mcpb` ou plugin Claude Code
- [ ] **Dashboard web** pour visualiser les outputs des pipelines

---

## Analyse des lacunes et opportunites

### 1. Qualite & Robustesse
- Les smoke tests (v1.2) sont structurels uniquement (existence fichiers, YAML, coherence). Pas encore de **tests fonctionnels** (execution reelle d'un agent avec prompt de test et validation output).
- Les hooks (v1.3) ont des tests de validation manuels mais pas d'automatisation de bout en bout.

### 2. Distribution & Packaging
- Le backlog mentionne un **plugin system** (`.mcpb` ou plugin Claude Code) — non commence.
- L'installation se fait actuellement par `install.sh` / `uninstall.sh`. Un systeme de packaging rendrait la distribution plus propre.

### 3. Observabilite & Monitoring
- Le backlog mentionne un **dashboard web** — non commence.
- Les hooks v1.3 produisent des logs JSONL. Un dashboard pourrait les consommer.

### 4. Agents manquants potentiels
- Pas d'agent dedie au **monitoring/alerting** (Prometheus, Grafana, alertes).
- Pas d'agent pour le **testing de charge automatise**.
- Pas d'agent pour la **gestion de configuration** (env vars, feature flags, secrets management).

### 5. Ecosystem maturity
- Pas de **versioning semantique** formellement defini.
- Pas de **CHANGELOG.md** genere automatiquement.
- Pas de **CI/CD pipeline** pour le repo mugiwara-agents lui-meme.

---

## Suite des evenements — 5 phases

### Phase 1 — v1.4 : Tests fonctionnels & CI/CD (Mars 2026)

**Objectif** : Passer de tests structurels a des tests fonctionnels, et automatiser dans un pipeline CI.

| Tache | Description | Agent suggere |
|-------|-------------|---------------|
| Tests fonctionnels agents | Framework de test executant chaque agent avec un prompt minimal et validant la structure de l'output | `/nami` |
| GitHub Actions CI | Pipeline CI lancant smoke tests + tests fonctionnels a chaque PR/push sur main | `/usopp` |
| Validation hooks automatisee | Tests pour les hooks v1.3 (log-agent-output, validate, notify) | `/nami` |
| Politique de versioning | SemVer clair (MAJOR = breaking SKILL.md, MINOR = nouveaux agents/pipelines, PATCH = fixes) | `/luffy` |

### Phase 2 — v1.5 : Plugin System (Avril 2026)

**Objectif** : Rendre les agents distribuables et installables sans copie manuelle.

| Tache | Description | Agent suggere |
|-------|-------------|---------------|
| Etude de faisabilite plugin | Analyser les options : MCP bundle (`.mcpb`), npm package, extension Claude Code native | `/yamato` |
| Architecture plugin | Format de packaging, manifest, mecanisme de resolution | `/sanji` |
| CLI d'installation | `mugiwara install <agent>`, `mugiwara update`, `mugiwara list` | `/sanji-ts` ou `/sanji-python` |
| Migration install.sh -> plugin | Migration progressive sans casser l'existant (dual support) | `/shanks` |

### Phase 3 — v1.6 : Dashboard Web (Mai 2026)

**Objectif** : Visualiser en temps reel les outputs des pipelines et l'historique des invocations.

| Tache | Description | Agent suggere |
|-------|-------------|---------------|
| Specs dashboard | User stories : quelles vues, quelles metriques, quel public | `/zorro` |
| Architecture frontend | SPA legere (React/Next.js ou Svelte) lisant les fichiers JSONL | `/sanji` + `/sanji-ts` |
| Backend API | Serveur minimal exposant les logs JSONL en API REST | `/sanji-ts` ou `/sanji-python` |
| Design UI | Moodboard, palette, wireframes | `/sanji-design` |
| Integration hooks -> dashboard | Hooks v1.3 pushent en temps reel vers le dashboard (WebSocket ou polling) | `/usopp` |

### Phase 4 — v1.7 : Nouveaux agents & pipelines (Juin 2026)

**Objectif** : Combler les lacunes identifiees dans l'ecosysteme.

| Tache | Description | Agent suggere |
|-------|-------------|---------------|
| Agent Monitoring/Alerting | Prometheus, Grafana, alertes PagerDuty/OpsGenie | `/vegapunk` |
| Agent Feature Flags | Feature flags (LaunchDarkly, Unleash, env-based) | `/vegapunk` |
| Pipeline Release | Changelog auto + morgans + tag + deploy | `/vegapunk` |
| Audit ecosysteme | Health-check complet apres ajouts | `/vegapunk` |

### Phase 4b — v1.8 : Infrastructure, Docker & IIS (Avril 2026)

**Objectif** : Couvrir l'infrastructure reseau, la containerisation Docker et le deploiement IIS.

| Tache | Description | Agent suggere |
|-------|-------------|---------------|
| Agent Docker | Dockerfile, docker-compose, orchestration Swarm/K8s, Helm charts | `/vegapunk` |
| Agent IIS | web.config, application pools, SSL/TLS, URL Rewrite, Web Deploy, PowerShell | `/vegapunk` + `/sanji-dotnet` |
| Agent Infrastructure Reseau | Firewall (iptables, pf, Windows Firewall), DNS, load balancing (HAProxy, Nginx), VPN, VLAN | `/vegapunk` |
| Integration Docker + IIS | Conteneurs Windows Server Core, IIS dans Docker | `/vegapunk` |
| Integration Monitoring + Infra | Dashboards Grafana pour Docker (cAdvisor), IIS (perfmon), reseau (SNMP) | `/vegapunk` |

### Phase 5 — v2.0 : Maturite ecosysteme (Septembre 2026)

**Objectif** : Ecosysteme complet et auto-suffisant.

| Tache | Description | Agent suggere |
|-------|-------------|---------------|
| CHANGELOG automatique | Generation depuis commits conventionnels | `/brook` |
| Documentation utilisateur | Site Docusaurus/VitePress | `/brook` + `/sanji-ts` |
| Marketplace d'agents | Agents custom publiables par la communaute | `/sanji` |
| Multi-LLM support | Compatibilite GPT, Gemini, Mistral | `/shanks` |
| Metriques de qualite | Scoring automatique (temps de reponse, qualite output, taux erreur) | `/ace` + `/nami` |

---

## Chronologie

```
Mars 2026       : v1.4 — Tests fonctionnels & CI/CD          [DONE]
Mars 2026       : v1.5 — Plugin System                       [DONE]
Mars 2026       : v1.6 — Dashboard Web                       [DONE]
Mars 2026       : v1.7 — Nouveaux agents & pipelines         [EN COURS]
Avril 2026      : v1.8 — Infrastructure, Docker & IIS       [PLANNED]
Septembre 2026  : v2.0 — Maturite ecosysteme
```
