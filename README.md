# Mugiwara Agents - One Piece Crew for Claude Code CLI

> Transform your Claude Code CLI into a full project analysis powerhouse with the Straw Hat crew!

**Mugiwara Agents** is a collection of specialized AI agents (Skills) for [Claude Code CLI](https://docs.anthropic.com/en/docs/claude-code), each modeled after a One Piece crew member. Together, they form a complete software project analysis pipeline.

## The Crew

| Agent | Command | Role | Specialty |
|-------|---------|------|-----------|
| **Zorro** | `/zorro` | Business Analyst | IREB/PSPO certified. Slices vague problems into rigorous functional specifications, user stories, and Gherkin acceptance criteria. |
| **Sanji** | `/sanji` | Lead Developer / Architect | Polyglot expert (Rust, Go, Python, TS, Java). Cooks up the perfect technical architecture with stack trade-offs, data models, and API design. |
| **Nami** | `/nami` | QA Lead | ISTQB Expert. Navigates through test strategies, edge cases, BDD specs, and automation plans with surgical precision. |
| **Luffy** | `/luffy` | Program Manager / Captain | Unifies Business (Zorro), Technical (Sanji), and Quality (Nami) into a strategic delivery roadmap with KPIs. |
| **Franky** | `/franky` | Code Reviewer & Log Analyst | Senior Architect + Cybersecurity Expert. Audits code for OWASP Top 10, SOLID violations, performance bottlenecks, and technical debt. |
| **Mugiwara** | `/mugiwara` | Full Pipeline | Runs all 4 analysis agents in sequence from a single problem statement. The whole crew at once! |

## Quick Start

### Installation

#### Automatic (recommended)

```bash
git clone https://github.com/YOUR_USERNAME/mugiwara-agents.git
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

Type `/` in Claude Code and you should see `zorro`, `sanji`, `nami`, `luffy`, `franky`, and `mugiwara` in the autocomplete list.

## Usage

### Individual Agents

```bash
# Business Analysis - Zorro slices your problem into specs
/zorro Our SaaS platform loses 30% of customers after 3 months of subscription

# Technical Architecture - Sanji cooks the perfect stack
/sanji A real-time collaborative document editor supporting 10K concurrent users

# QA Strategy - Nami navigates through test plans
/nami A mobile banking app with biometric auth and instant transfers

# Program Management - Luffy unifies the crew's outputs
/luffy Synthesize the business, technical, and QA analyses for our invoicing platform

# Code Review - Franky audits your code
/franky src/api/auth.ts
/franky src/
```

### Full Pipeline

```bash
# Run all 4 analysis agents in sequence
/mugiwara Build a marketplace connecting freelancers with SMBs
```

### Recommended Workflow

```
1. /zorro [problem]     -> Functional specifications
2. /sanji [problem]     -> Technical architecture
3. /nami  [problem]     -> Test & validation plan
4. /luffy [summaries]   -> Strategic roadmap & KPIs
```

Or just `/mugiwara [problem]` to run them all at once!

## Agent Details

### Zorro - Business Analyst
- Root cause analysis (5 Whys / Ishikawa)
- 5 prioritized User Stories (MoSCoW + INVEST)
- Gherkin acceptance criteria for each story
- Risk assessment matrix
- Stakeholder map

### Sanji - Lead Developer
- Stack recommendation with trade-off tables
- System architecture (microservices, serverless, modular monolith)
- Data model design (SQL/NoSQL)
- API contracts (REST/GraphQL with JSON examples)
- Security & scalability strategy
- Test pyramid with CI/CD integration

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
