#!/usr/bin/env node
/**
 * convert_claude.cjs
 *
 * Converts Mugiwara Skills (SKILL.md + mugiwara.yaml) into
 * Claude Code custom agents (.claude/agents/*.md).
 *
 * Architecture: one_piece is the orchestrator agent + 5 elevated subagents
 * (chopper, franky, nami, jinbe, robin) for direct invocation.
 * By default, one_piece + elevated agents are generated.
 * All other agents are available as skills (via /skill_name).
 *
 * Usage:
 *   node convert_claude.cjs                          # one_piece + elevated (default)
 *   node convert_claude.cjs --router-only            # one_piece only (legacy)
 *   node convert_claude.cjs --all-agents             # All agents (legacy mode)
 *   node convert_claude.cjs --tier 2                 # Tier 1+2 (legacy mode)
 *   node convert_claude.cjs --agents chopper,franky   # Specific agents
 *   node convert_claude.cjs --output dist-claude/     # Custom output dir
 *   node convert_claude.cjs --dry-run                 # Preview without writing
 *   node convert_claude.cjs --install                 # Generate + install to ~/.claude/agents/ + cleanup
 */

const fs = require('node:fs');
const path = require('node:path');

// ─── Configuration ───────────────────────────────────────────────────────────

const SKILLS_DIR = path.join(__dirname, 'skills');
const DEFAULT_OUTPUT = path.join(__dirname, 'dist-claude-agents');

// Tier 1 — high-value individual agents for agentic use
const TIER_1 = [
  'chopper', 'franky', 'robin', 'sanji', 'nami', 'usopp', 'zorro', 'brook',
  'ace', 'jinbe', 'shanks', 'law', 'poneglyph', 'vivi', 'yamato', 'iceburg',
  'sabo', 'bartholomew', 'rayleigh', 'enel', 'smoker',
];

// Tier 2 — additional useful agents
const TIER_2 = [
  'luffy', 'crocodile', 'kizaru', 'aokiji', 'doflamingo', 'katakuri',
  'hawkins', 'magellan', 'caesar', 'coby', 'fujitora', 'law-sql',
  'docker', 'iis', 'firebase', 'feature-flags',
  'sanji-ts', 'sanji-python', 'sanji-dotnet', 'sanji-java',
  'sanji-flutter', 'sanji-go', 'sanji-rust',
];

// ─── Elevated agents — promoted to direct subagents alongside one_piece ──────
const ELEVATED_AGENTS = ['chopper', 'franky', 'nami', 'jinbe', 'robin', 'zorro', 'sanji', 'luffy', 'brook', 'usopp', 'vivi'];

// ─── Non-Mugiwara agents to preserve during cleanup ─────────────────────────
// certified-code-reviewer → replaced by franky
// istqb-qa-reviewer → replaced by nami
const NON_MUGIWARA_AGENTS = [];

// ─── Legacy agents to remove during install ─────────────────────────────────
const DEPRECATED_AGENTS = ['certified-code-reviewer', 'istqb-qa-reviewer'];

// ─── Universal one_piece description (catch-all orchestrator) ────────────────
const ONE_PIECE_DESCRIPTION = `Use this agent for ANY software engineering task or question. This is the universal orchestrator for the Mugiwara agent ecosystem — it analyzes the user's request and automatically routes to the best specialist agent(s).

Covers: debugging & bug fixing, security audits & OWASP, code review & tech debt, system architecture & scaffolding, QA & testing strategy, DevOps & CI/CD, technical documentation, performance optimization, refactoring & migration, data engineering & SQL, cloud infrastructure (AWS/Azure/GCP/Firebase), monitoring & alerting, Docker & Kubernetes, accessibility (a11y), i18n, product management & UX, API analysis & Postman collections, incident response, project onboarding, tech watch, chaos engineering, feature flags, and more.

Route ALL technical requests through this agent — it will dispatch to the optimal specialist.`;

const ONE_PIECE_EXAMPLES = [
  {
    input: "J'ai une NullPointerException dans le service d'authentification",
    response: "Je vais diagnostiquer ce bug.",
    action: 'analyze the problem, route to the debugging specialist, and return the diagnosis',
  },
  {
    input: "Je dois creer une API de gestion de reservations en TypeScript",
    response: "Je vais concevoir l'architecture du projet.",
    action: 'route to the architecture specialist to design and scaffold the project',
  },
  {
    input: "Configure un pipeline CI/CD GitHub Actions pour ce projet",
    response: "Je vais mettre en place le pipeline.",
    action: 'route to the DevOps specialist to generate the CI/CD configuration',
  },
  {
    input: "J'ai un probleme de perf sur mon API mais je sais pas par ou commencer",
    response: "Je vais analyser ton besoin et router vers le bon agent.",
    action: 'analyze the problem and dispatch to the optimal specialist agent',
  },
];

// ─── Elevated agent custom descriptions (proactive triggers + examples) ──────

const ELEVATED_DESCRIPTIONS = {
  chopper: {
    color: 'pink',
    description: `Use this agent when the user encounters a bug, error, stack trace, or unexpected behavior. This agent should be used proactively when error messages or stack traces appear in conversation.

Covers: root cause analysis (RCA), stack trace diagnosis, log analysis, CPU/memory profiling, hypothesis-driven debugging, and monitoring recommendations.`,
    examples: [
      {
        input: "J'ai une NullPointerException dans le service d'authentification, voici la stack trace",
        response: "Je vais diagnostiquer cette NullPointerException.",
        action: 'perform root cause analysis on the authentication service error and identify the fix',
      },
      {
        input: "L'API retourne des 500 intermittents depuis ce matin, voici les logs",
        response: "Je vais analyser ces erreurs intermittentes.",
        action: 'analyze the logs, identify the pattern behind the intermittent 500 errors, and propose a fix',
      },
      {
        input: "Mon test unitaire echoue avec un timeout sur la base de donnees",
        response: "Je vais diagnostiquer ce timeout.",
        action: 'investigate the database timeout in the test and identify the root cause',
        proactive: true,
      },
    ],
    memory: 'project',
  },

  franky: {
    color: 'cyan',
    description: `Use this agent when code has been written or modified and needs a thorough review. This agent should be used proactively after any significant code change to catch quality, security, and maintainability issues before they reach production.

Covers: SOLID/DRY/KISS principles, OWASP Top 10 vulnerabilities, technical debt assessment, anti-pattern detection, optimization opportunities, and cybersecurity audit.`,
    examples: [
      {
        input: "J'ai implemente le module d'authentification",
        response: "Je vais auditer le code du module d'authentification.",
        action: 'perform a comprehensive code review of the authentication module for quality and security',
      },
      {
        input: "Review le code de cette PR pour la feature de paiement",
        response: "Je vais analyser cette PR.",
        action: 'review the payment feature code for OWASP vulnerabilities, anti-patterns, and tech debt',
      },
      {
        input: "Ecris un endpoint REST pour l'inscription utilisateur",
        response: "Voici l'endpoint d'inscription: ...",
        action: 'proactively review the newly written code against quality and security standards',
        proactive: true,
      },
    ],
    memory: 'user',
  },

  nami: {
    color: 'orange',
    description: `Use this agent when a major project step has been completed and needs QA verification, or when the user needs test planning, test strategy, or coverage analysis. This agent should be used proactively after feature completion to verify builds and tests pass.

Covers: ISTQB methodology, test planning, build verification, PASS/FAIL verdicts, edge case detection, regression testing strategy, and feedback loops with developers.`,
    examples: [
      {
        input: "J'ai fini d'implementer le systeme d'authentification du step 3",
        response: "Je vais verifier la qualite et lancer les tests.",
        action: 'run QA verification on the authentication system implementation, execute tests, and produce a PASS/FAIL verdict',
      },
      {
        input: "Propose un plan de test pour le module de paiement",
        response: "Je vais elaborer une strategie de test complete.",
        action: 'design a comprehensive ISTQB-based test plan for the payment module',
      },
      {
        input: "Les endpoints de l'API sont termines, ca couvre le step 2 du plan",
        response: "Je vais verifier cette implementation.",
        action: 'proactively verify the completed API endpoints against the plan requirements',
        proactive: true,
      },
    ],
    memory: 'user',
  },

  jinbe: {
    color: 'blue',
    description: `Use this agent for security audits, threat modeling, and compliance verification. This agent should be used proactively when code touches authentication, user data, or exposed APIs.

Covers: STRIDE threat modeling, OWASP Top 10, RGPD/SOC2/ISO27001 compliance, vulnerability assessment, pentesting strategy, and regulatory impact analysis.`,
    examples: [
      {
        input: "Fais un audit de securite sur le module de paiement",
        response: "Je vais auditer la securite du module de paiement.",
        action: 'perform a STRIDE threat model and OWASP vulnerability assessment on the payment module',
      },
      {
        input: "Verifie la conformite RGPD de notre gestion des donnees utilisateur",
        response: "Je vais verifier la conformite RGPD.",
        action: 'audit the user data handling for RGPD compliance and produce a remediation plan',
      },
      {
        input: "J'ai modifie le middleware d'authentification",
        response: "Je vais verifier la securite du middleware.",
        action: 'proactively audit the authentication middleware changes for security vulnerabilities',
        proactive: true,
      },
    ],
    memory: 'user',
  },

  robin: {
    color: 'purple',
    description: `Use this agent when the user needs to understand a codebase, reverse-engineer system logic, or map architecture and dependencies. This is ideal when arriving on a new project or needing to understand complex system flows.

Covers: system cartography, dependency mapping, business logic extraction, ADR (Architecture Decision Records) documentation, and architecture visualization.`,
    examples: [
      {
        input: "J'arrive sur ce projet, explique-moi l'architecture",
        response: "Je vais cartographier le systeme.",
        action: 'reverse-engineer and map the system architecture, dependencies, and business logic',
      },
      {
        input: "Comment fonctionne le flux de donnees entre les microservices ?",
        response: "Je vais analyser les flux de donnees.",
        action: 'trace and document the data flow across microservices',
      },
    ],
    memory: 'project',
  },

  zorro: {
    color: 'green',
    description: `Use this agent when the user needs business analysis, functional specifications, user stories, or acceptance criteria. Expert in transforming vague business problems into rigorous structured specifications.

Covers: root cause analysis (5 Whys, Ishikawa), user stories with MoSCoW prioritization, Gherkin BDD acceptance criteria, risk evaluation with probability/impact matrices, stakeholder mapping, and constraints analysis.`,
    examples: [
      {
        input: "J'ai besoin d'un systeme de gestion de reservations pour un restaurant",
        response: "Je vais analyser le besoin et produire les specs fonctionnelles.",
        action: 'perform business analysis: problem reformulation, root cause analysis, user stories, Gherkin acceptance criteria, and risk evaluation',
      },
      {
        input: "Redige les user stories et criteres d'acceptation pour le module de paiement",
        response: "Je vais produire les specs du module de paiement.",
        action: 'generate prioritized user stories with MoSCoW and Gherkin BDD scenarios for the payment module',
      },
      {
        input: "Analyse ce cahier des charges et identifie les risques",
        response: "Je vais analyser le cahier des charges.",
        action: 'analyze the requirements document, extract user stories, and produce a risk evaluation matrix',
      },
    ],
    memory: 'project',
  },

  sanji: {
    color: 'yellow',
    description: `Use this agent when the user needs system architecture design, tech stack selection, or project scaffolding. This is the lead architect who designs the full system, then delegates scaffolding to specialized sub-chefs (sanji-ts, sanji-python, sanji-dotnet, etc.).

Covers: comparative stack selection (7 stacks scored on 5 criteria), architecture diagrams (ASCII), API design (REST/gRPC/GraphQL), data modeling, security patterns (OWASP Top 10), scalability strategy, and project directory creation.`,
    examples: [
      {
        input: "Concois l'architecture d'une API de gestion de reservations en TypeScript",
        response: "Je vais concevoir l'architecture et scaffolder le projet.",
        action: 'design system architecture with stack comparison, component diagram, API contracts, data model, then scaffold the project via specialized sub-chef',
      },
      {
        input: "Quelle stack choisir pour une app mobile cross-platform avec backend temps reel ?",
        response: "Je vais analyser les options et recommander une stack.",
        action: 'evaluate tech stacks across 5 criteria, propose architecture with real-time patterns, and recommend the optimal stack',
      },
      {
        input: "Le code a des erreurs apres le scaffold, corrige-les",
        response: "Je vais analyser les erreurs et router vers le bon sous-chef.",
        action: 'analyze the errors and route to the appropriate sub-chef specialist for corrections (FIX mode)',
      },
    ],
    memory: 'project',
  },

  luffy: {
    color: 'red',
    description: `Use this agent when multiple analyses (business, technical, QA) have been completed and need to be synthesized into a unified strategic roadmap. The Captain consolidates all perspectives into actionable decisions.

Covers: executive summary, cross-functional alignment matrix, conflict arbitrage between speed/quality/security, 3-phase delivery roadmap (MVP/V1/V2), resource estimation, KPIs, consolidated risk registry, communication plan, and decision journal.`,
    examples: [
      {
        input: "Synthetise les analyses de Zorro, Sanji et Nami en une feuille de route",
        response: "Je vais consolider les analyses en roadmap strategique.",
        action: 'synthesize business, technical, and QA analyses into unified delivery roadmap with conflict arbitrage and resource planning',
      },
      {
        input: "Cree une roadmap MVP/V1/V2 pour ce projet",
        response: "Je vais produire la feuille de route en 3 phases.",
        action: 'create a phased delivery roadmap with feature tables, dependency graph, critical path, and success KPIs',
      },
    ],
    memory: 'project',
  },

  brook: {
    color: 'gray',
    description: `Use this agent when the user needs technical documentation, changelogs, release notes, README, or onboarding guides. Expert technical writer using the Diataxis framework. Adapts tone to audience (developers, stakeholders, end-users).

Covers: changelogs from git history, README generation, onboarding guides, API documentation, release notes, migration guides, and architecture decision records.`,
    examples: [
      {
        input: "Genere un changelog a partir des derniers commits",
        response: "Je vais rediger le changelog.",
        action: 'analyze git history and generate a structured changelog with categorized changes',
      },
      {
        input: "Ecris un guide d'onboarding pour les nouveaux developpeurs",
        response: "Je vais rediger le guide d'onboarding.",
        action: 'read the codebase structure and produce a comprehensive developer onboarding guide',
      },
      {
        input: "Redige les release notes pour la v2.3",
        response: "Je vais produire les release notes.",
        action: 'generate release notes from commits and tags, with impact summary for stakeholders',
      },
    ],
    memory: 'user',
  },

  usopp: {
    color: 'orange',
    description: `Use this agent when the user needs CI/CD pipelines, Kubernetes manifests, Terraform modules, Docker configuration, or deployment strategy. This agent should be used proactively when a new project needs infrastructure or when deployment decisions are required. 9-phase methodology from analysis to monitoring.

Covers: GitHub Actions/GitLab CI pipelines, Dockerfiles, Kubernetes manifests, Terraform/IaC, Helm charts, secrets management, rollback strategies, and infrastructure monitoring.`,
    examples: [
      {
        input: "Configure un pipeline CI/CD GitHub Actions pour ce projet Node.js",
        response: "Je vais creer le pipeline CI/CD.",
        action: 'design and generate an optimized CI/CD pipeline with build, test, security scan, and deploy stages',
      },
      {
        input: "Deploie ce service sur Kubernetes avec Terraform",
        response: "Je vais preparer l'infrastructure as code.",
        action: 'create Terraform modules and Kubernetes deployment manifests with secrets management and rollback strategy',
      },
      {
        input: "On vient de scaffolder un nouveau projet",
        response: "Je vais preparer l'infrastructure.",
        action: 'proactively generate Dockerfile, CI/CD pipeline, and deployment configuration for the new project',
        proactive: true,
      },
    ],
    memory: 'project',
  },

  vivi: {
    color: 'cyan',
    description: `Use this agent when the user needs product discovery, user research, personas, user flows, wireframes, feature prioritization, or A/B test design. Expert Product Manager and UX Strategist with market analysis capabilities.

Covers: market analysis, competitive intelligence, persona development, Jobs-To-Be-Done, user flow diagrams, wireframes, RICE/Impact-Effort prioritization, OKR alignment, and experiment design.`,
    examples: [
      {
        input: "Analyse le marche pour une app de covoiturage B2B",
        response: "Je vais mener l'analyse produit.",
        action: 'conduct market analysis, define user personas, and map competitive landscape',
      },
      {
        input: "Priorise les features du backlog avec la methode RICE",
        response: "Je vais evaluer et prioriser le backlog.",
        action: 'score features using RICE framework and produce a prioritized roadmap recommendation',
      },
      {
        input: "Cree les personas et user flows pour le module d'inscription",
        response: "Je vais definir les personas et parcours utilisateur.",
        action: 'develop user personas with JTBD and design user flow diagrams for the registration module',
      },
    ],
    memory: 'project',
  },
};

// ─── Category → Color mapping ────────────────────────────────────────────────

const CATEGORY_COLORS = {
  debugging:      'red',
  security:       'orange',
  quality:        'green',
  analysis:       'cyan',
  architecture:   'blue',
  qa:             'green',
  devops:         'purple',
  writing:        'yellow',
  performance:    'red',
  refactoring:    'orange',
  data:           'cyan',
  management:     'pink',
  intelligence:   'yellow',
  infrastructure: 'purple',
  cloud:          'blue',
  monitoring:     'red',
  networking:     'purple',
  'event-driven': 'blue',
  'ml-ops':       'cyan',
  bi:             'yellow',
  chaos:          'red',
  dba:            'cyan',
  a11y:           'green',
  agile:          'pink',
  itsm:            'blue',
  router:         'gray',
  pipeline:       'pink',
  'ai-ml':        'cyan',
  meta:           'purple',
};

// ─── Category → Trigger condition ────────────────────────────────────────────

const CATEGORY_TRIGGERS = {
  debugging:      'the user encounters a bug, error, stack trace, or unexpected behavior',
  security:       'the user needs a security audit, code review, or vulnerability analysis',
  quality:        'the user wants a code quality review, tech debt audit, or architecture assessment',
  analysis:       'the user needs to understand a codebase, reverse-engineer logic, or map system dependencies',
  architecture:   'the user needs to design system architecture, choose a tech stack, or scaffold a new project',
  qa:             'the user needs test planning, QA strategy, build verification, or test coverage analysis',
  devops:         'the user needs CI/CD pipelines, infrastructure as code, Docker, Kubernetes, or deployment configuration',
  writing:        'the user needs technical documentation, changelogs, release notes, or onboarding guides',
  performance:    'the user faces performance issues, needs load testing, profiling, or optimization',
  refactoring:    'the user needs to refactor legacy code, plan a migration, or modernize a system',
  data:           'the user needs data pipelines, ETL/ELT design, data modeling, or SQL/analytics architecture',
  management:     'the user needs product management, user research, roadmap planning, or feature prioritization',
  intelligence:   'the user needs technology watch, trend analysis, or strategic tech recommendations',
  infrastructure: 'the user needs Docker containerization, orchestration, or infrastructure configuration',
  cloud:          'the user needs cloud infrastructure design, deployment, or configuration',
  monitoring:     'the user needs observability setup, alerting, dashboards, or SRE practices',
  networking:     'the user needs network configuration, firewall rules, DNS, load balancing, or VPN setup',
  'event-driven': 'the user needs event-driven architecture, message queues, or async patterns',
  'ml-ops':       'the user needs ML pipelines, model serving, experiment tracking, or MLOps setup',
  bi:             'the user needs BI dashboards, data visualization, or KPI reporting',
  chaos:          'the user needs chaos engineering, resilience testing, or failure injection',
  dba:            'the user needs database administration, tuning, replication, or migration',
  a11y:           'the user needs accessibility auditing, WCAG compliance, or a11y remediation',
  agile:          'the user needs agile coaching, sprint planning, retrospectives, or ceremony facilitation',
  itsm:            'the user needs GLPI ticket management, ITSM triage, incident dispatch, or service desk operations',
  router:         "the user has a general problem or doesn't know which specialist agent to use — they want automatic routing to the best Mugiwara agent",
  pipeline:       'the user needs an end-to-end workflow combining multiple specialist agents in sequence',
  'ai-ml':        'the user needs AI/ML architecture, model evaluation, prompt engineering, or LLM integration',
  meta:           'the user needs meta-capabilities like agent introspection, easter eggs, or cross-cutting concerns',
};

// ─── Example bank (2 examples per category) ──────────────────────────────────

const EXAMPLE_BANK = {
  debugging: [
    {
      input: "J'ai une NullPointerException dans le service d'authentification, voici la stack trace",
      response: "Je vais diagnostiquer cette NullPointerException.",
      action: 'perform root cause analysis on the authentication service error',
    },
    {
      input: "L'API retourne des 500 intermittents depuis ce matin, voici les logs",
      response: "Je vais analyser ces erreurs intermittentes.",
      action: 'analyze the logs and identify the pattern behind the intermittent 500 errors',
    },
  ],
  security: [
    {
      input: "Fais un audit de securite sur le module de paiement",
      response: "Je vais auditer le module de paiement.",
      action: 'perform a security audit of the payment module',
    },
    {
      input: "Review le code de cette PR pour les failles OWASP",
      response: "Je vais analyser cette PR pour les vulnerabilites.",
      action: 'review the code for OWASP Top 10 vulnerabilities',
    },
  ],
  quality: [
    {
      input: "Fais une code review du service de notification",
      response: "Je vais analyser la qualite du code.",
      action: 'perform a thorough code quality review of the notification service',
    },
    {
      input: "Identifie la dette technique dans ce module",
      response: "Je vais auditer la dette technique.",
      action: 'audit the module for technical debt and anti-patterns',
    },
  ],
  analysis: [
    {
      input: "J'arrive sur ce projet, explique-moi l'architecture",
      response: "Je vais cartographier le systeme.",
      action: 'reverse-engineer and map the system architecture',
    },
    {
      input: "Comment fonctionne le flux de donnees entre les microservices ?",
      response: "Je vais analyser les flux de donnees.",
      action: 'trace and document the data flow across microservices',
    },
  ],
  architecture: [
    {
      input: "Je dois creer une API de gestion de reservations en TypeScript",
      response: "Je vais concevoir l'architecture du projet.",
      action: 'design the system architecture and scaffold the project',
    },
    {
      input: "Quelle stack choisir pour une app mobile cross-platform avec backend temps reel ?",
      response: "Je vais analyser les options et recommander une stack.",
      action: 'evaluate tech stacks and propose an optimal architecture',
    },
  ],
  qa: [
    {
      input: "Verifie que le scaffold du projet passe les tests",
      response: "Je vais verifier la qualite et lancer les tests.",
      action: 'run build and test verification on the scaffolded project',
    },
    {
      input: "Propose un plan de test pour le module d'inscription",
      response: "Je vais elaborer une strategie de test complete.",
      action: 'design a comprehensive test plan for the registration module',
    },
  ],
  devops: [
    {
      input: "Configure un pipeline CI/CD GitHub Actions pour ce projet Node.js",
      response: "Je vais creer le pipeline CI/CD.",
      action: 'generate an optimized CI/CD pipeline configuration',
    },
    {
      input: "Deploie ce service sur Kubernetes avec Terraform",
      response: "Je vais preparer l'infrastructure as code.",
      action: 'create Terraform and Kubernetes deployment manifests',
    },
  ],
  writing: [
    {
      input: "Genere un changelog a partir des derniers commits",
      response: "Je vais rediger le changelog.",
      action: 'generate a structured changelog from recent commits',
    },
    {
      input: "Ecris un guide d'onboarding pour les nouveaux developpeurs",
      response: "Je vais rediger le guide d'onboarding.",
      action: 'write a comprehensive onboarding guide',
    },
  ],
  performance: [
    {
      input: "L'endpoint /api/search met 8 secondes, optimise-le",
      response: "Je vais analyser et optimiser les performances.",
      action: 'profile the search endpoint and propose optimizations',
    },
    {
      input: "Prepare un plan de load testing pour le Black Friday",
      response: "Je vais concevoir le plan de charge.",
      action: 'design a comprehensive load testing strategy',
    },
  ],
  refactoring: [
    {
      input: "Migre ce monolithe PHP vers des microservices Node.js",
      response: "Je vais planifier la migration.",
      action: 'design a migration strategy using Strangler Fig pattern',
    },
    {
      input: "Refactorise le module legacy d'authentification",
      response: "Je vais analyser et planifier le refactoring.",
      action: 'analyze the legacy module and plan incremental refactoring',
    },
  ],
  data: [
    {
      input: "Concois un data warehouse pour nos donnees e-commerce",
      response: "Je vais architecturer le data warehouse.",
      action: 'design a star/snowflake schema data warehouse',
    },
    {
      input: "Cree un pipeline ETL avec dbt et Airflow",
      response: "Je vais concevoir le pipeline de donnees.",
      action: 'design and scaffold the ETL pipeline',
    },
  ],
  management: [
    {
      input: "Analyse le marche pour une app de covoiturage B2B",
      response: "Je vais mener l'analyse produit.",
      action: 'conduct market analysis and define user personas',
    },
    {
      input: "Priorise les features du backlog avec la methode RICE",
      response: "Je vais evaluer et prioriser le backlog.",
      action: 'prioritize features using RICE scoring framework',
    },
  ],
  intelligence: [
    {
      input: "Quelles sont les tendances tech 2025 pour le backend ?",
      response: "Je vais analyser les tendances.",
      action: 'research and summarize current technology trends',
    },
    {
      input: "Compare les frameworks frontend modernes pour notre contexte",
      response: "Je vais evaluer les options.",
      action: 'compare frameworks with actionable recommendations',
    },
  ],
  infrastructure: [
    {
      input: "Cree un Dockerfile multi-stage pour cette app Python",
      response: "Je vais generer le Dockerfile optimise.",
      action: 'create an optimized multi-stage Dockerfile',
    },
    {
      input: "Configure docker-compose pour l'environnement de dev",
      response: "Je vais preparer la configuration Docker.",
      action: 'generate a complete docker-compose development setup',
    },
  ],
  cloud: [
    {
      input: "Deploie cette API sur Firebase Cloud Functions",
      response: "Je vais configurer le deploiement Firebase.",
      action: 'set up Firebase project with Cloud Functions deployment',
    },
    {
      input: "Configure l'authentification Firebase avec custom claims",
      response: "Je vais mettre en place l'auth Firebase.",
      action: 'configure Firebase Authentication with RBAC',
    },
  ],
  monitoring: [
    {
      input: "Configure Prometheus et Grafana pour nos microservices",
      response: "Je vais mettre en place l'observabilite.",
      action: 'set up Prometheus/Grafana monitoring stack with dashboards',
    },
    {
      input: "Definis des SLI/SLO pour notre API de paiement",
      response: "Je vais definir les objectifs de fiabilite.",
      action: 'define SLIs, SLOs, and alerting rules',
    },
  ],
  networking: [
    {
      input: "Configure les regles firewall pour isoler le reseau de prod",
      response: "Je vais generer les regles firewall.",
      action: 'generate firewall rules for production network isolation',
    },
    {
      input: "Met en place un VPN WireGuard entre les sites",
      response: "Je vais configurer le VPN.",
      action: 'create WireGuard VPN configuration for site-to-site connectivity',
    },
  ],
  'event-driven': [
    {
      input: "Concois une architecture event-driven avec Kafka",
      response: "Je vais architecturer le systeme evenementiel.",
      action: 'design an event-driven architecture with Kafka',
    },
    {
      input: "Implemente le pattern CQRS avec event sourcing",
      response: "Je vais concevoir l'architecture CQRS/ES.",
      action: 'design CQRS and event sourcing patterns',
    },
  ],
  'ml-ops': [
    {
      input: "Configure un pipeline MLflow pour le suivi d'experiences",
      response: "Je vais mettre en place le pipeline ML.",
      action: 'set up MLflow experiment tracking pipeline',
    },
    {
      input: "Deploie un modele de ML en production avec monitoring",
      response: "Je vais configurer le serving et monitoring.",
      action: 'configure model serving with drift detection',
    },
  ],
  bi: [
    {
      input: "Cree un dashboard KPI pour le suivi des ventes",
      response: "Je vais concevoir le dashboard.",
      action: 'design a KPI dashboard for sales tracking',
    },
    {
      input: "Configure Metabase pour nos donnees PostgreSQL",
      response: "Je vais configurer l'outil BI.",
      action: 'set up Metabase with PostgreSQL data source',
    },
  ],
  chaos: [
    {
      input: "Planifie un GameDay pour tester la resilience de notre infra",
      response: "Je vais concevoir le GameDay.",
      action: 'plan a chaos engineering GameDay exercise',
    },
    {
      input: "Configure Litmus pour injecter des pannes dans Kubernetes",
      response: "Je vais preparer les experiences de chaos.",
      action: 'set up Litmus chaos experiments for Kubernetes',
    },
  ],
  dba: [
    {
      input: "Optimise les performances de notre PostgreSQL en prod",
      response: "Je vais analyser et tuner la base.",
      action: 'analyze and optimize PostgreSQL performance',
    },
    {
      input: "Mets en place la replication master-slave pour MySQL",
      response: "Je vais configurer la replication.",
      action: 'configure MySQL master-slave replication',
    },
  ],
  a11y: [
    {
      input: "Audite l'accessibilite de notre application web",
      response: "Je vais auditer l'accessibilite.",
      action: 'perform a WCAG 2.2 accessibility audit',
    },
    {
      input: "Corrige les problemes ARIA dans les composants du design system",
      response: "Je vais remedier les problemes ARIA.",
      action: 'fix ARIA issues and ensure component accessibility',
    },
  ],
  agile: [
    {
      input: "Facilite notre retrospective de sprint",
      response: "Je vais animer la retrospective.",
      action: 'facilitate a structured sprint retrospective',
    },
    {
      input: "Aide-nous a estimer le backlog pour le prochain sprint",
      response: "Je vais accompagner le sprint planning.",
      action: 'guide sprint planning and story estimation',
    },
  ],
  itsm: [
    {
      input: "Montre-moi les tickets GLPI ouverts",
      response: "Je vais recuperer les tickets GLPI en cours.",
      action: 'list open GLPI tickets and display a prioritized dashboard',
    },
    {
      input: "Trie les tickets GLPI et dispatche-les vers les bons agents",
      response: "Je vais trier les tickets et les router vers les agents adaptes.",
      action: 'triage GLPI tickets and dispatch each to the appropriate Mugiwara agent',
    },
  ],
  router: [
    {
      input: "J'ai un probleme de perf sur mon API mais je sais pas par ou commencer",
      response: "Je vais analyser ton besoin et router vers le bon agent.",
      action: 'analyze the problem and dispatch to the optimal specialist agent',
    },
    {
      input: "Je dois livrer une nouvelle feature, de l'analyse au deploiement",
      response: "Je vais orchestrer le bon pipeline pour ce besoin.",
      action: 'identify the right pipeline and coordinate the agent chain',
    },
  ],
  pipeline: [
    {
      input: "Analyse ce projet de A a Z",
      response: "Je vais orchestrer le pipeline complet.",
      action: 'run the full analysis pipeline sequentially',
    },
    {
      input: "Lance un audit complet avant la mise en prod",
      response: "Je vais coordonner les agents necessaires.",
      action: 'execute the pre-launch verification pipeline',
    },
  ],
  'ai-ml': [
    {
      input: "Evalue la pertinence d'un LLM pour notre chatbot support",
      response: "Je vais analyser les options AI/ML.",
      action: 'evaluate LLM options for the support chatbot',
    },
    {
      input: "Configure un pipeline de fine-tuning pour notre modele",
      response: "Je vais concevoir le pipeline ML.",
      action: 'design a fine-tuning pipeline with experiment tracking',
    },
  ],
  meta: [
    {
      input: "Quel agent utiliser pour mon probleme de migration ?",
      response: "Je vais analyser et orienter.",
      action: 'analyze the problem and recommend the right agent',
    },
    {
      input: "Ajoute un easter egg dans le projet",
      response: "Je vais concevoir une surprise cachee.",
      action: 'design and integrate a hidden easter egg',
    },
  ],
};

// ─── Parsing helpers ─────────────────────────────────────────────────────────

/**
 * Parse YAML front matter and body from a SKILL.md file.
 * Returns { yaml: string, body: string, fields: object }
 */
function parseFrontMatter(content) {
  const parts = content.split('---');
  if (parts.length < 3) {
    return null;
  }
  const yamlRaw = parts[1];
  const body = parts.slice(2).join('---').trim();

  // Extract key fields from YAML
  const fields = {};

  const nameMatch = yamlRaw.match(/^name:\s*(.+)$/m);
  if (nameMatch) fields.name = nameMatch[1].trim();

  // Handle multiline description (YAML > folded)
  const descMatch = yamlRaw.match(/description:\s*>?\s*\n((?:\s+.+\n?)+)/);
  if (descMatch) {
    fields.description = descMatch[1].replace(/\n\s+/g, ' ').trim();
  } else {
    const descSimple = yamlRaw.match(/description:\s*(.+)$/m);
    if (descSimple) fields.description = descSimple[1].trim().replace(/^["']|["']$/g, '');
  }

  const hintMatch = yamlRaw.match(/argument-hint:\s*"?(.+?)"?\s*$/m);
  if (hintMatch) fields.argumentHint = hintMatch[1].trim();

  const modelMatch = yamlRaw.match(/^model:\s*(.+)$/m);
  if (modelMatch) fields.model = modelMatch[1].trim();

  return { yaml: yamlRaw, body, fields };
}

/**
 * Parse mugiwara.yaml manifest for a skill directory.
 * Returns { category, role, ... }
 */
function parseManifest(skillDir) {
  const manifestPath = path.join(skillDir, 'mugiwara.yaml');
  if (!fs.existsSync(manifestPath)) return null;

  const content = fs.readFileSync(manifestPath, 'utf8');
  const manifest = {};

  const categoryMatch = content.match(/^category:\s*(.+)$/m);
  if (categoryMatch) manifest.category = categoryMatch[1].trim();

  const roleMatch = content.match(/^role:\s*(.+)$/m);
  if (roleMatch) manifest.role = roleMatch[1].trim();

  const nameMatch = content.match(/^name:\s*(.+)$/m);
  if (nameMatch) manifest.name = nameMatch[1].trim();

  const descMatch = content.match(/^description:\s*(.+)$/m);
  if (descMatch) manifest.description = descMatch[1].trim();

  return manifest;
}

// ─── Transformation logic ────────────────────────────────────────────────────

/**
 * Generate a rich description for the Claude agent with examples.
 */
function generateDescription(name, description, argumentHint, category) {
  // Special case: one_piece gets a universal catch-all description
  if (name === 'one_piece') {
    let desc = `${ONE_PIECE_DESCRIPTION}\n\nExamples:\n`;
    ONE_PIECE_EXAMPLES.forEach((ex, i) => {
      desc += `- Example ${i + 1}:\n`;
      desc += `  user: "${ex.input}"\n`;
      desc += `  assistant: "${ex.response}"\n`;
      desc += `  <The assistant uses the Agent tool to launch the one_piece agent to ${ex.action}.>\n`;
    });
    return desc;
  }

  // Elevated agents get custom, proactive-aware descriptions
  if (ELEVATED_DESCRIPTIONS[name]) {
    const elevated = ELEVATED_DESCRIPTIONS[name];
    let desc = `${elevated.description}\n\nExamples:\n`;

    elevated.examples.forEach((ex, i) => {
      desc += `- Example ${i + 1}${ex.proactive ? ' (proactive usage)' : ''}:\n`;
      desc += `  user: "${ex.input}"\n`;
      desc += `  assistant: "${ex.response}"\n`;
      if (ex.proactive) {
        desc += `  <Since significant code was written or a relevant pattern was detected, the assistant proactively uses the Agent tool to launch the ${name} agent to ${ex.action}.>\n`;
      } else {
        desc += `  <The assistant uses the Agent tool to launch the ${name} agent to ${ex.action}.>\n`;
      }
    });

    return desc;
  }

  // Standard agents: category-based description
  const trigger = CATEGORY_TRIGGERS[category] || `the user needs help with ${category}`;
  const capSummary = description ? description.split('.')[0].trim() : `Expert ${category} agent`;
  const examples = EXAMPLE_BANK[category] || EXAMPLE_BANK['analysis']; // fallback

  let desc = `Use this agent when ${trigger}. ${capSummary}.\n\n`;
  desc += 'Examples:\n';

  examples.forEach((ex, i) => {
    desc += `- Example ${i + 1}:\n`;
    desc += `  user: "${ex.input}"\n`;
    desc += `  assistant: "${ex.response}"\n`;
    desc += `  <The assistant uses the Agent tool to launch the ${name} agent to ${ex.action}.>\n`;
  });

  return desc;
}

/**
 * Transform the body of a SKILL.md for Claude agent format.
 *  1. Replace "## Heading\n\n$ARGUMENTS" blocks with contextual text
 *  2. Replace remaining inline $ARGUMENTS
 *  3. Remove ## Invocation section at end of file
 */
function transformBody(body) {
  // Normalize line endings to LF
  let result = body.replace(/\r\n/g, '\n');

  // 1. Section + $ARGUMENTS — replace the $ARGUMENTS placeholder with contextual text
  result = result.replace(
    /^(##\s+.+)\n\n\$ARGUMENTS/gm,
    '$1\n\nAnalyse la conversation ci-dessus pour identifier le probleme ou sujet decrit par l\'utilisateur.'
  );

  // 2. Inline $ARGUMENTS
  result = result.replace(
    /\$ARGUMENTS/g,
    "le probleme ou sujet decrit par l'utilisateur"
  );

  // 3. Remove ## Invocation section (if present at end)
  result = result.replace(/\n##\s+Invocation\b[\s\S]*$/m, '');

  // 4. Clean up Skill tool references (e.g., "Lance /sanji-ts" → "Delegue au sous-chef sanji-ts")
  result = result.replace(
    /(?:Lance|Appelle|Invoque|Utilise)\s+\/([a-z][\w-]*)/gi,
    'Delegue a l\'agent $1'
  );

  return result.trim();
}

/**
 * Convert a single agent: read SKILL.md + mugiwara.yaml → write Claude agent .md
 */
function convertAgent(skillName, outputDir, dryRun) {
  const skillDir = path.join(SKILLS_DIR, skillName);
  const skillPath = path.join(skillDir, 'SKILL.md');

  if (!fs.existsSync(skillPath)) {
    console.error(`  ✗ SKILL.md not found for "${skillName}"`);
    return false;
  }

  // Parse sources
  const content = fs.readFileSync(skillPath, 'utf8');
  const parsed = parseFrontMatter(content);
  if (!parsed) {
    console.error(`  ✗ Invalid front matter in "${skillName}/SKILL.md"`);
    return false;
  }

  const manifest = parseManifest(skillDir);
  if (!manifest) {
    console.error(`  ✗ mugiwara.yaml not found for "${skillName}"`);
    return false;
  }

  const { fields, body } = parsed;
  const category = manifest.category || 'analysis';
  const color = (ELEVATED_DESCRIPTIONS[skillName] && ELEVATED_DESCRIPTIONS[skillName].color)
    || CATEGORY_COLORS[category] || 'blue';
  const model = fields.model || 'opus';

  // Generate description
  const description = generateDescription(
    skillName,
    fields.description || manifest.description || '',
    fields.argumentHint || '',
    category
  );

  // Transform body
  const transformedBody = transformBody(body);

  // Escape description for YAML (use block scalar)
  const descriptionYaml = description
    .split('\n')
    .map((line, i) => (i === 0 ? line : '  ' + line))
    .join('\n');

  // Determine memory scope (elevated agents may override)
  const memoryScope = (ELEVATED_DESCRIPTIONS[skillName] && ELEVATED_DESCRIPTIONS[skillName].memory)
    || 'project';

  // Build final agent markdown
  const agentMd = `---
name: ${skillName}
description: >
  ${descriptionYaml}
model: ${model}
color: ${color}
memory: ${memoryScope}
---

${transformedBody}
`;

  if (dryRun) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Agent: ${skillName} (${category} → ${color})`);
    console.log(`${'─'.repeat(60)}`);
    console.log(agentMd.slice(0, 500) + (agentMd.length > 500 ? '\n...(truncated)' : ''));
    return true;
  }

  // Write file
  const outPath = path.join(outputDir, `${skillName}.md`);
  fs.writeFileSync(outPath, agentMd, 'utf8');
  console.log(`  ✓ ${skillName}.md (${category} → ${color})`);
  return true;
}

// ─── CLI & Main ──────────────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = {
    tier: 0,
    agents: null,
    output: DEFAULT_OUTPUT,
    dryRun: false,
    allAgents: false,
    install: false,
    routerOnly: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--tier':
        opts.tier = parseInt(args[++i], 10) || 1;
        break;
      case '--agents':
        opts.agents = args[++i].split(',').map(a => a.trim());
        break;
      case '--output':
        opts.output = path.resolve(args[++i]);
        break;
      case '--dry-run':
        opts.dryRun = true;
        break;
      case '--all':
      case '--all-agents':
        opts.allAgents = true;
        break;
      case '--install':
        opts.install = true;
        break;
      case '--router-only':
        opts.routerOnly = true;
        break;
      case '--help':
        console.log(`Usage: node convert_claude.cjs [options]

Options:
  (default)                 Generate one_piece + elevated agents (chopper, franky, nami, jinbe, robin)
  --router-only             Generate only one_piece.md (legacy mode)
  --all-agents              Convert ALL skills (legacy mode, reads skills/ directory)
  --tier <1|2>              Tier 1 or Tier 1+2 (legacy mode)
  --agents <a,b,c>          Convert specific agents only
  --output <dir>            Output directory (default: dist-claude-agents/)
  --install                 Generate + install to ~/.claude/agents/ + cleanup old agents
  --dry-run                 Preview without writing files
  --help                    Show this help

Architecture:
  one_piece is the orchestrator + 5 elevated subagents for direct invocation.
  Elevated: ${ELEVATED_AGENTS.join(', ')}
  All other agents are available as skills (/skill_name) invoked by one_piece.
`);
        process.exit(0);
    }
  }
  return opts;
}

/**
 * Install one_piece.md + elevated agents to ~/.claude/agents/ and clean up.
 */
function installRouter(outputDir) {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  const agentsDir = path.join(homeDir, '.claude', 'agents');
  fs.mkdirSync(agentsDir, { recursive: true });

  // Agents to install: one_piece + elevated
  const toInstall = ['one_piece', ...ELEVATED_AGENTS];

  // Get list of all Mugiwara skill names (to know what to clean up)
  const allMugiwaraNames = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(name => fs.existsSync(path.join(SKILLS_DIR, name, 'SKILL.md')));

  let removed = 0;

  // Remove old individual Mugiwara agents from ~/.claude/agents/ (except those to install)
  for (const name of allMugiwaraNames) {
    if (toInstall.includes(name)) continue; // Keep agents we're about to install
    const agentFile = path.join(agentsDir, `${name}.md`);
    if (fs.existsSync(agentFile)) {
      fs.unlinkSync(agentFile);
      console.log(`  [-] Removed: ${name}.md`);
      removed++;
    }
  }

  // Clean up alias names that might not have skill dirs but have agent files
  const KNOWN_ALIASES = [
    'docker', 'iis', 'firebase', 'infra-reseau', 'monitoring', 'feature-flags',
    'mlops', 'agile', 'bi', 'dba', 'a11y', 'azure', 'gcp', 'chaos',
    'prod-listener', 'incident', 'pre-launch', 'onboard', 'modernize',
    'discovery', 'doc-hunt', 'api-postman',
  ];
  for (const alias of KNOWN_ALIASES) {
    const agentFile = path.join(agentsDir, `${alias}.md`);
    if (fs.existsSync(agentFile)) {
      fs.unlinkSync(agentFile);
      console.log(`  [-] Removed alias: ${alias}.md`);
      removed++;
    }
  }

  // Remove deprecated non-Mugiwara agents (replaced by elevated agents)
  for (const deprecated of DEPRECATED_AGENTS) {
    const agentFile = path.join(agentsDir, `${deprecated}.md`);
    if (fs.existsSync(agentFile)) {
      fs.unlinkSync(agentFile);
      console.log(`  [-] Removed deprecated: ${deprecated}.md`);
      removed++;
    }
  }

  // Install one_piece + elevated agents
  let installed = 0;
  for (const name of toInstall) {
    const src = path.join(outputDir, `${name}.md`);
    const dest = path.join(agentsDir, `${name}.md`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      const label = name === 'one_piece' ? 'orchestrator' : 'elevated';
      console.log(`  [+] Installed: ${name}.md (${label})`);
      installed++;
    } else {
      console.error(`  [!] ${name}.md not found in ${outputDir}`);
    }
  }

  // Report preserved non-Mugiwara agents
  for (const ext of NON_MUGIWARA_AGENTS) {
    const extFile = path.join(agentsDir, `${ext}.md`);
    if (fs.existsSync(extFile)) {
      console.log(`  [=] Preserved: ${ext}.md (non-Mugiwara)`);
    }
  }

  console.log(`\n  Cleanup: ${removed} old agents removed`);
  console.log(`  Installed: ${installed} agents (one_piece + ${ELEVATED_AGENTS.length} elevated)`);
  console.log(`  ~/.claude/agents/ now has: one_piece + [${ELEVATED_AGENTS.join(', ')}]`);
}

function main() {
  const opts = parseArgs();

  // Determine agent list
  let agentList;
  let mode;
  if (opts.allAgents) {
    // Legacy mode: generate all agents
    agentList = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .filter(name => fs.existsSync(path.join(SKILLS_DIR, name, 'SKILL.md')))
      .sort();
    mode = 'all-agents';
  } else if (opts.agents) {
    agentList = opts.agents;
    mode = 'custom';
  } else if (opts.tier >= 2) {
    agentList = [...TIER_1, ...TIER_2];
    mode = 'tier-2';
  } else if (opts.tier === 1) {
    agentList = [...TIER_1];
    mode = 'tier-1';
  } else if (opts.routerOnly) {
    // Legacy: one_piece only
    agentList = ['one_piece'];
    mode = 'router-only';
  } else {
    // Default: one_piece + elevated agents
    agentList = ['one_piece', ...ELEVATED_AGENTS];
    mode = 'elevated';
  }

  console.log(`\nMugiwara → Claude Code Agent Converter`);
  console.log(`${'═'.repeat(40)}`);
  console.log(`Mode: ${mode} | Agents: ${agentList.length} | Output: ${opts.dryRun ? '(dry-run)' : opts.output}`);
  console.log();

  // Ensure output directory exists
  if (!opts.dryRun) {
    fs.mkdirSync(opts.output, { recursive: true });
  }

  let success = 0;
  let failed = 0;

  for (const name of agentList) {
    if (convertAgent(name, opts.output, opts.dryRun)) {
      success++;
    } else {
      failed++;
    }
  }

  console.log(`\n${'═'.repeat(40)}`);
  console.log(`Done: ${success} converted, ${failed} failed`);

  if (!opts.dryRun && success > 0) {
    console.log(`\nFiles written to: ${opts.output}/`);

    // Auto-install if --install flag
    if (opts.install) {
      console.log(`\nInstalling to ~/.claude/agents/...`);
      installRouter(opts.output);
    } else if (mode === 'elevated' || mode === 'router-only') {
      console.log(`\nTo install: node convert_claude.cjs --install`);
    }
  }
}

main();
