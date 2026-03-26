# Mugiwara Agents — Instructions Projet

## Regle principale

**Pour TOUTE demande d'ingenierie logicielle**, utilise le skill `one_piece` (via l'outil Skill) qui routera automatiquement vers le bon agent ou pipeline specialise. Ne fais JAMAIS le travail toi-meme si un agent Mugiwara existe pour ce domaine.

Domaines couverts par l'ecosysteme (liste non exhaustive) :
- Debug, diagnostic, erreurs, stack traces
- Architecture, stack technique, scaffolding
- Code review, audit qualite, anti-patterns
- Tests, QA, couverture, verification
- Securite, compliance, OWASP, RGPD
- Documentation, changelog, README, guides
- DevOps, CI/CD, Kubernetes, Terraform, pipelines
- Cloud (AWS, Azure, GCP, Firebase)
- Docker, conteneurs, IIS, reseau
- Refactoring, migration, modernisation
- Performance, load testing, profiling
- Data engineering, ETL, SQL, analytics
- Product discovery, UX, personas, wireframes
- Monitoring, alerting, observabilite
- DBA, bases de donnees, tuning
- Event-driven architecture, Kafka, RabbitMQ
- Accessibilite, i18n, feature flags
- Agile, Scrum, ceremonies
- Analyse d'API, collections Postman, tests E2E
- Incident production, hotfix, urgence
- Cartographie systeme, reverse engineering
- BI, data viz, dashboards

## Invocation directe

Si l'utilisateur nomme explicitement un agent ou une commande slash (ex: `/chopper`, `/franky`, `lance nami`, `appelle robin`), invoque directement ce skill ou subagent sans passer par one_piece.

## Subagents eleves [S]

Les agents suivants disposent d'un subagent_type natif et peuvent etre invoques via l'outil `Agent` (au lieu de `Skill`) pour tourner dans leur propre contexte, en parallele ou en background :
chopper, franky, nami, jinbe, robin, zorro, sanji, luffy, brook, usopp, vivi.

Le routeur `one_piece` sait quand utiliser Agent vs Skill — laisse-le decider.

## Exceptions (ne PAS router vers one_piece)

- Questions simples sur le projet Mugiwara lui-meme (structure des skills, config des hooks) → repondre directement
- Demandes hors ingenierie logicielle → repondre directement
- Modifications de configuration Claude Code (settings.json, hooks, permissions) → utiliser le skill `update-config`
- Demandes explicites de ne pas utiliser d'agent → respecter le choix de l'utilisateur
