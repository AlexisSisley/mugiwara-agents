# Mugiwara Agents - One Piece Crew for Claude Code CLI

> Transform your Claude Code CLI into a full project analysis powerhouse with the Straw Hat crew!

**Mugiwara Agents** is a collection of 20 specialized AI agents (Skills) for [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code), each modeled after a One Piece crew member. Together, they form a complete software engineering pipeline — from business analysis to deployment.

## The Crew

### Core Analysis Pipeline

| Agent | Command | Role | Specialty |
|-------|---------|------|-----------|
| **Zorro** | `/zorro` | Business Analyst | IREB/PSPO certified. Slices vague problems into rigorous functional specifications, user stories, and Gherkin acceptance criteria. |
| **Sanji** | `/sanji` | Architect & Tech Lead | Analyzes requirements, picks the optimal tech stack via comparison matrix, designs high-level architecture, then routes to the right specialist sous-chef for implementation details. |
| **Nami** | `/nami` | QA Lead | ISTQB Expert. Navigates through test strategies, edge cases, BDD specs, and automation plans with surgical precision. |
| **Luffy** | `/luffy` | Program Manager / Captain | Unifies Business (Zorro), Technical (Sanji), and Quality (Nami) into a strategic delivery roadmap with KPIs. |

### Specialist Agents

| Agent | Command | Role | Specialty |
|-------|---------|------|-----------|
| **Franky** | `/franky` | Code Reviewer & Log Analyst | Senior Architect + Cybersecurity Expert. Audits code for OWASP Top 10, SOLID violations, performance bottlenecks, and technical debt. |
| **Robin** | `/robin` | System Cartographer | Reverse-engineering expert. Maps complex codebases, extracts business logic, identifies legacy risks, and produces Architecture Decision Records (ADRs). |
| **Chopper** | `/chopper` | Debugger & Diagnostician | Root Cause Analysis (RCA) specialist. Analyzes stack traces, logs, and profiling reports with a scientific diagnostic approach. Recommends monitoring tools. |
| **Brook** | `/brook` | Technical Writer | Transforms raw code and commits into elegant documentation: changelogs, onboarding guides, READMEs, and stakeholder communications. Uses the Diataxis framework. |
| **Usopp** | `/usopp` | DevOps & IaC Expert | SRE/DevOps engineer. Docker, Kubernetes, Terraform, GitHub Actions/GitLab CI. Shift Left Security and total automation. |
| **Jinbe** | `/jinbe` | SecOps & Compliance Auditor | Cybersecurity and regulatory compliance expert (GDPR, SOC2, ISO27001). STRIDE threat modeling, OWASP audits, penetration testing strategy. |
| **Yamato** | `/yamato` | Tech Intelligence & Dashboard | Strategic tech watch expert & Full-Stack developer. Scans tech trends, analyzes impact on current stacks, and generates live HTML/CSS dashboards with actionable modernization advice. |
| **Vegapunk** | `/vegapunk` | Meta-Auditor & Agent Engineer | World's greatest scientist. Audits, evaluates, and improves all agent SKILL.md definitions. Detects weaknesses, gaps, and redundancies across the crew. Creates new specialized agents when needed. |

### Sanji's Kitchen — Specialist Sous-Chefs

Sanji automatically routes to the right sous-chef based on the chosen stack. Each sous-chef can also be called directly.

| Agent | Command | Stack | Specialty |
|-------|---------|-------|-----------|
| **Patty** | `/sanji-dotnet` | C# / .NET | ASP.NET Core, Blazor, MAUI, Entity Framework, Azure. Clean Architecture with NuGet ecosystem. |
| **Carne** | `/sanji-flutter` | Dart / Flutter | Cross-platform mobile/web/desktop. Riverpod, GoRouter, Freezed, pub.dev ecosystem. |
| **Zeff** | `/sanji-python` | Python | FastAPI, Django, SQLAlchemy, pandas, PyTorch, scikit-learn. From web APIs to ML pipelines. |
| **Cosette** | `/sanji-ts` | TypeScript / Node.js | React, Next.js, NestJS, tRPC, Prisma, Tailwind. Full-stack with monorepo (Turborepo). |
| **Terracotta** | `/sanji-rust` | Rust | Axum, Tokio, sqlx, WebAssembly. Zero-cost abstractions and memory safety. |
| **Lola** | `/sanji-go` | Go | Stdlib-first, Gin/Chi, gRPC, Kubernetes tooling. Simple and efficient microservices. |
| **Streusen** | `/sanji-java` | Java / Kotlin | Spring Boot, Quarkus, JPA/Hibernate, GraalVM. Enterprise-grade JVM systems. |

### Orchestrator

| Agent | Command | Role | Specialty |
|-------|---------|------|-----------|
| **Mugiwara** | `/mugiwara` | Full Pipeline | Runs the 4 core analysis agents in sequence from a single problem statement. The whole crew at once! |

## Quick Start

### Installation

#### Automatic (recommended)

```bash
git clone https://github.com/AlexisSisley/mugiwara-agents.git
cd mugiwara-agents
chmod +x install.sh
./install.sh
```

#### Manual

Copy the skill directories to your Claude Code user skills folder:

```bash
cp -r skills/* ~/.claude/skills/
```

### Restart Claude Code

After installation, restart Claude Code or start a new session to load the skills.

### Verify

Type `/` in Claude Code and you should see all crew members in the autocomplete list.

## Usage

### Individual Agents

```bash
# Business Analysis - Zorro slices your problem into specs
/zorro Our SaaS platform loses 30% of customers after 3 months of subscription

# Technical Architecture - Sanji picks the best stack and routes to specialist
/sanji A real-time collaborative document editor supporting 10K concurrent users

# Direct specialist access - Skip Sanji's routing, go straight to the expert
/sanji-dotnet Implement a multi-tenant SaaS API with ASP.NET Core
/sanji-flutter Build a cross-platform fitness tracking app with offline sync
/sanji-python Create a FastAPI service with ML-powered recommendation engine
/sanji-ts Build a Next.js e-commerce platform with Stripe integration
/sanji-rust High-performance WebSocket server for real-time gaming
/sanji-go Kubernetes operator for automated database backups
/sanji-java Spring Boot microservice with event sourcing and CQRS

# QA Strategy - Nami navigates through test plans
/nami A mobile banking app with biometric auth and instant transfers

# Program Management - Luffy unifies the crew's outputs
/luffy Synthesize the business, technical, and QA analyses for our invoicing platform

# Code Review - Franky audits your code
/franky src/api/auth.ts

# System Cartography - Robin maps your codebase
/robin src/

# Debugging - Chopper diagnoses your bug
/chopper "TypeError: Cannot read property 'id' of undefined at UserService.ts:42"

# Documentation - Brook writes your docs
/brook Write a changelog for the last 10 commits

# DevOps - Usopp builds your infrastructure
/usopp Set up a CI/CD pipeline with Docker + Kubernetes for a Node.js microservice

# Security Audit - Jinbe guards your system
/jinbe Audit the authentication module for OWASP Top 10 and GDPR compliance

# Tech Intelligence - Yamato reads the tech world
/yamato What are the latest trends in React and TypeScript?
/yamato Generate a tech dashboard for our Node.js + React stack

# Meta-Audit - Vegapunk audits the crew
/vegapunk audit
/vegapunk improve franky
/vegapunk create "Performance Engineer & Load Tester"
/vegapunk check nami
```

### Full Pipeline

```bash
# Run all 4 core analysis agents in sequence
/mugiwara Build a marketplace connecting freelancers with SMBs
```

### Recommended Workflows

**Project Analysis Pipeline:**
```
1. /zorro [problem]     -> Functional specifications
2. /sanji [problem]     -> Stack choice + architecture → auto-routes to sous-chef
3. /nami  [problem]     -> Test & validation plan
4. /luffy [summaries]   -> Strategic roadmap & KPIs
```

**Code Quality Pipeline:**
```
1. /robin [codebase]    -> System cartography & legacy risks
2. /franky [code]       -> Code review & optimizations
3. /jinbe [code]        -> Security audit & compliance
4. /brook [project]     -> Documentation update
```

**Incident Response:**
```
1. /chopper [logs/error] -> Root cause diagnosis
2. /franky [fix]         -> Review the fix
3. /usopp [deploy]       -> Deploy with rollback strategy
```

**Agent Quality Pipeline:**
```
1. /vegapunk audit       -> Full ecosystem health report
2. /vegapunk improve X   -> Rewrite specific agent SKILL.md
3. /vegapunk create X    -> Create new agent for identified gap
```

## Agent Details

### Zorro - Business Analyst
- Root cause analysis (5 Whys / Ishikawa)
- 5 prioritized User Stories (MoSCoW + INVEST)
- Gherkin acceptance criteria for each story
- Risk assessment matrix
- Stakeholder map

### Sanji - Architect & Tech Lead
- **Stack comparison matrix** (7 stacks scored on 5 criteria = /25)
- System architecture (microservices, serverless, modular monolith)
- Data model design (SQL/NoSQL)
- API contracts (REST/GraphQL with JSON examples)
- Security & scalability strategy
- **Automatic routing** to specialized sous-chef for implementation details
- Combined output: high-level architecture + stack-specific implementation

### Nami - QA Lead
- Testability analysis (5 dimensions)
- Risk-based testing priority matrix
- Test scenarios: Happy Path + Edge Cases + Negative Tests
- BDD/Gherkin specifications with Scenario Outlines
- Automation strategy (what to automate vs. keep manual)
- Non-functional testing plan (performance, security, accessibility)

### Luffy - Program Manager
- Executive summary (C-level ready)
- Cross-functional alignment matrix
- Conflict arbitrage with Lean compromises
- Phased delivery roadmap (MVP / V1 / V2)
- KPI dashboard (delivery + business metrics)
- Consolidated risk register
- Communication matrix

### Franky - Code Reviewer
- Quality analysis (strengths, weaknesses, anti-patterns)
- OWASP Top 10 security audit
- SOLID/DRY/KISS compliance check
- Action plan by criticality (CRITICAL / HIGH / MEDIUM / LOW)
- Refactored code for the most critical segment
- Score card (security, performance, maintainability, testability, readability)

### Robin - System Cartographer
- High-level architecture mapping (ASCII diagrams)
- Module dependency graph with coupling analysis
- Business logic extraction from code
- Legacy risk zones identification
- Architecture Decision Records (ADRs) reconstruction
- Technical documentation gap analysis

### Chopper - Debugger & Diagnostician
- Stack trace analysis (bottom-up, critical frame identification)
- Log analysis (timeline, anomalies, correlation)
- Hypothesis-driven diagnosis (3+ hypotheses ranked by probability)
- Verification tests for each hypothesis
- Corrective solution with explained fix
- Performance profiling (memory leaks, bottlenecks)
- Monitoring tool recommendations (Datadog, New Relic, Sentry, etc.)

### Brook - Technical Writer
- Changelogs (Keep a Changelog format: Features, Fixes, Breaking Changes)
- README structure (badges, quick start, API reference)
- Onboarding guides (step-by-step for new developers)
- Technical documentation (Diataxis framework: tutorials, how-to, reference, explanation)
- Stakeholder communication (non-technical, value-oriented)

### Usopp - DevOps & IaC
- Dockerfiles (multi-stage, non-root, optimized layers)
- Kubernetes manifests (deployments, services, HPA, network policies)
- Terraform modules (remote state, workspaces, validated variables)
- CI/CD pipelines (GitHub Actions / GitLab CI with security scanning)
- Secret management strategy (Vault, AWS SM, SOPS)
- Rollback strategies (blue/green, canary, feature flags)
- Monitoring & observability (metrics, logs, traces, alerting)

### Jinbe - SecOps & Compliance
- STRIDE threat modeling (per component analysis)
- OWASP Top 10 compliance audit with proof and fixes
- Regulatory compliance checks (GDPR, SOC2, ISO27001)
- Prioritized remediation plan (P0 to P3)
- Penetration testing strategy (black/grey/white box)
- Security score card (auth, encryption, injection, config, monitoring, compliance)

### Vegapunk - Meta-Auditor & Agent Engineer
- Full agent inventory and dependency graph
- 6-dimension health matrix (Logic, Pragmatism, Innovation, Precision, Robustness, Efficiency)
- Per-agent quality audit with conformity checklist
- Improvement recommendations with prioritized diffs (P0-P3)
- Gap analysis: coverage matrix, redundancy detection, orchestration chain review
- New agent generation (complete SKILL.md following project conventions)
- Integration validation for the mugiwara pipeline

### Yamato - Tech Intelligence & Dashboard
- Multi-source tech curation (Hacker News, Dev.to, GitHub Trending, official releases)
- Impact analysis on current stacks (what changes, who's concerned, timeline)
- Concrete code optimizations based on new trends (before/after examples)
- Library & tool recommendations with maturity assessment
- Modernization advice (quick wins, mid-term, long-term)
- Auto-generated HTML/CSS responsive dashboard (dark mode, filters, tech radar)
- Standalone dashboard file (open directly in browser, no build needed)

## Configuration

All agents use these defaults:

| Parameter | Value | Why |
|-----------|-------|-----|
| `context: fork` | Yes (individual agents) | Isolated execution, clean context |
| `agent: general-purpose` | Yes | Full reasoning tool access |
| `model: opus` | Yes | Best quality for complex analysis |
| `disable-model-invocation: true` | Yes | Manual invocation only via `/command` |

## Language Support

All agents automatically respond in the same language as the input. Write your problem in French, English, or any language - the output will match.

## Requirements

- [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code) installed
- Active Claude subscription with Opus model access

## License

MIT License - Feel free to use, modify, and share!

## Contributing

PRs welcome! Want to add a new crew member? Check the existing SKILL.md files for the format and create a new one following the same structure.

---

*Made with the spirit of adventure by a fellow nakama!*
