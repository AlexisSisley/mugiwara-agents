# Guide d'installation des MCP Servers

> Ameliorez l'experience de vos agents Mugiwara en connectant Claude Code a des services externes via les MCP Servers.

## Table des matieres

1. [Qu'est-ce qu'un MCP Server ?](#1-quest-ce-quun-mcp-server-)
2. [Tableau recapitulatif](#2-tableau-recapitulatif)
3. [Installation detaillee par serveur](#3-installation-detaillee-par-serveur)
   - [GitHub (Must-have)](#31-github)
   - [Context7 (Must-have)](#32-context7)
   - [Playwright (Must-have)](#33-playwright)
   - [Sequential Thinking (Recommande)](#34-sequential-thinking)
   - [Sentry (Optionnel)](#35-sentry)
   - [DB Hub (Optionnel)](#36-db-hub)
   - [Figma (Optionnel)](#37-figma)
   - [Notion (Optionnel)](#38-notion)
   - [Docker (Optionnel)](#39-docker)
4. [Configuration recommandee par cas d'usage](#4-configuration-recommandee-par-cas-dusage)

---

## 1. Qu'est-ce qu'un MCP Server ?

**MCP (Model Context Protocol)** est un protocole ouvert qui permet a Claude Code de communiquer avec des services externes -- GitHub, navigateurs, bases de donnees, outils de monitoring, etc. -- de maniere structuree et securisee.

Concretement, un MCP Server agit comme un **pont** entre Claude Code et un service tiers. Une fois connecte, Claude Code (et donc les agents Mugiwara) peut :
- Lire et creer des pull requests sur GitHub
- Naviguer dans un navigateur web pour tester des interfaces
- Interroger une base de donnees en temps reel
- Consulter les erreurs de production dans Sentry
- Acceder a la documentation officielle des librairies

### Pourquoi c'est utile avec les agents Mugiwara

Les agents Mugiwara sont des prompts structures qui guident Claude Code dans des taches specifiques. Sans MCP Server, les agents travaillent uniquement avec les fichiers locaux et les outils integres a Claude Code. Avec les MCP Servers, les agents accedent a des **donnees en temps reel** et a des **actions externes** :

| Sans MCP | Avec MCP |
|----------|----------|
| `/franky` audite le code local | `/franky` audite le code **et** cree une issue GitHub pour chaque defaut |
| `/nami` genere un plan de test | `/nami` genere un plan de test **et** execute les tests dans un navigateur via Playwright |
| `/chopper` diagnostique un bug depuis les logs locaux | `/chopper` diagnostique un bug **et** consulte les erreurs Sentry en temps reel |
| `/sanji-ts` genere du code TypeScript | `/sanji-ts` genere du code **avec** la documentation officielle a jour via Context7 |

Les MCP Servers ne sont pas obligatoires. Les agents fonctionnent parfaitement sans eux. Mais ils **decuplent les capacites** de l'ecosysteme.

---

## 2. Tableau recapitulatif

| Priorite | MCP Server | Transport | Agents beneficiaires | Cas d'usage principal |
|----------|-----------|-----------|---------------------|----------------------|
| Must-have | [GitHub](#31-github) | HTTP | franky, usopp | Gestion des PRs, issues, code review |
| Must-have | [Context7](#32-context7) | HTTP | sanji-* (tous les sous-chefs) | Documentation officielle des librairies |
| Must-have | [Playwright](#33-playwright) | stdio | nami, senor-pink | Tests E2E dans un navigateur reel |
| Recommande | [Sequential Thinking](#34-sequential-thinking) | stdio | zorro, one_piece | Raisonnement structure en etapes |
| Optionnel | [Sentry](#35-sentry) | HTTP | incident (pipeline), chopper | Monitoring d'erreurs en production |
| Optionnel | [DB Hub](#36-db-hub) | stdio | law | Acces direct aux bases de donnees |
| Optionnel | [Figma](#37-figma) | HTTP | sanji-design | Import de maquettes Figma |
| Optionnel | [Notion](#38-notion) | HTTP | robin, brook | Lecture/ecriture de pages Notion |
| Optionnel | [Docker](#39-docker) | stdio | usopp, ace | Gestion de conteneurs Docker |

---

## 3. Installation detaillee par serveur

### Prerequis communs

- **Claude Code CLI** installe et fonctionnel ([guide officiel](https://docs.anthropic.com/en/docs/claude-code))
- **Node.js >= 18** installe (necessaire pour les serveurs stdio qui utilisent `npx`)
- Les agents Mugiwara installes via `install.sh`

Pour verifier que Claude Code accepte les commandes MCP :

```bash
claude mcp list
```

Si la commande retourne une liste (vide ou non), vous etes pret.

---

### 3.1 GitHub

**Priorite : Must-have**

Permet a Claude Code d'interagir avec GitHub : lire des PRs, creer des issues, consulter des diffs, gerer des repositories.

**Agents beneficiaires** : `/franky` (code review avec creation d'issues), `/usopp` (gestion CI/CD et deployments)

**Prerequis** :
- Un compte GitHub actif
- Etre authentifie dans GitHub Copilot, ou disposer d'un token d'acces

**Installation** :

```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
```

**Verification** :

```bash
claude mcp list
```

Verifiez que `github` apparait dans la liste des serveurs connectes.

---

### 3.2 Context7

**Priorite : Must-have**

Fournit un acces en temps reel a la **documentation officielle** de milliers de librairies (React, Next.js, Express, Django, Flutter, .NET, etc.). Claude Code peut ainsi generer du code base sur la documentation la plus recente, et non sur ses connaissances statiques.

**Agents beneficiaires** : tous les sous-chefs Sanji (`/sanji-ts`, `/sanji-python`, `/sanji-dotnet`, `/sanji-flutter`, `/sanji-rust`, `/sanji-go`, `/sanji-java`)

**Prerequis** :
- Aucun prerequis specifique

**Installation** :

```bash
claude mcp add --transport http context7 https://mcp.context7.com/mcp
```

**Verification** :

```bash
claude mcp list
```

Verifiez que `context7` apparait dans la liste. Testez en demandant a un sous-chef de generer du code -- il devrait mentionner la documentation officielle dans ses references.

---

### 3.3 Playwright

**Priorite : Must-have**

Lance un navigateur reel (Chromium) pilote par Claude Code. Permet de naviguer sur des pages web, cliquer sur des elements, remplir des formulaires, prendre des screenshots, et executer des tests E2E.

**Agents beneficiaires** : `/nami` (execution de tests dans un navigateur), `/senor-pink` (tests E2E automatises)

**Prerequis** :
- Node.js >= 18

**Installation** :

```bash
claude mcp add playwright -- cmd /c npx -y @playwright/mcp@latest
```

> **Note Linux/macOS** : Remplacez `cmd /c` par le chemin direct :
> ```bash
> claude mcp add playwright -- npx -y @playwright/mcp@latest
> ```

**Verification** :

```bash
claude mcp list
```

Verifiez que `playwright` apparait. Lors de la premiere utilisation, Playwright telechargera automatiquement le navigateur Chromium si necessaire.

---

### 3.4 Sequential Thinking

**Priorite : Recommande**

Ajoute un outil de **raisonnement structure** qui decompose les problemes complexes en etapes logiques. Particulierement utile pour les agents qui doivent analyser des situations ambigues ou prendre des decisions multi-criteres.

**Agents beneficiaires** : `/zorro` (analyse business, decomposition de problemes), `/one_piece` (routeur intelligent, choix du bon agent)

**Prerequis** :
- Node.js >= 18

**Installation** :

```bash
claude mcp add sequential-thinking -- cmd /c npx -y @modelcontextprotocol/server-sequential-thinking
```

> **Note Linux/macOS** :
> ```bash
> claude mcp add sequential-thinking -- npx -y @modelcontextprotocol/server-sequential-thinking
> ```

**Verification** :

```bash
claude mcp list
```

Verifiez que `sequential-thinking` apparait dans la liste.

---

### 3.5 Sentry

**Priorite : Optionnel**

Connecte Claude Code a votre projet Sentry pour consulter les erreurs, exceptions et traces de production en temps reel.

**Agents beneficiaires** : pipeline `/incident` (diagnostic d'urgence), `/chopper` (debugging avec donnees de production)

**Prerequis** :
- Un compte Sentry avec un projet actif
- Authentification configuree via Sentry (OAuth ou token)

**Installation** :

```bash
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
```

**Verification** :

```bash
claude mcp list
```

Verifiez que `sentry` apparait. L'authentification sera demandee lors de la premiere utilisation.

---

### 3.6 DB Hub

**Priorite : Optionnel**

Permet a Claude Code d'interroger directement une base de donnees (PostgreSQL, MySQL, SQLite, etc.) via une **connexion DSN**. Utile pour explorer des schemas, executer des requetes, et valider des modeles de donnees.

**Agents beneficiaires** : `/law` (data engineering, exploration de schemas et pipelines)

**Prerequis** :
- Node.js >= 18
- Une chaine de connexion DSN vers votre base de donnees

**Installation** :

Remplacez `DSN` par votre chaine de connexion reelle :

```bash
claude mcp add db -- cmd /c npx -y @bytebase/dbhub --dsn "postgresql://user:password@localhost:5432/mydb"
```

> **Note Linux/macOS** :
> ```bash
> claude mcp add db -- npx -y @bytebase/dbhub --dsn "postgresql://user:password@localhost:5432/mydb"
> ```

**Exemples de DSN** :
- PostgreSQL : `postgresql://user:password@localhost:5432/mydb`
- MySQL : `mysql://user:password@localhost:3306/mydb`
- SQLite : `sqlite:///path/to/database.db`

**Verification** :

```bash
claude mcp list
```

Verifiez que `db` apparait dans la liste.

> ⚠️ **Securite** : Ne connectez jamais une base de production directement. Utilisez une replica en lecture seule ou une base de staging.

---

### 3.7 Figma

**Priorite : Optionnel**

Donne acces aux fichiers et composants Figma. Claude Code peut lire les maquettes, extraire les design tokens, et comprendre la structure visuelle d'un projet.

**Agents beneficiaires** : `/sanji-design` (direction artistique, design tokens, wireframes)

**Prerequis** :
- Un compte Figma avec acces aux fichiers du projet

**Installation** :

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
```

**Verification** :

```bash
claude mcp list
```

Verifiez que `figma` apparait. L'authentification Figma sera demandee lors de la premiere utilisation.

---

### 3.8 Notion

**Priorite : Optionnel**

Connecte Claude Code a votre workspace Notion pour lire et ecrire des pages, bases de donnees et documents.

**Agents beneficiaires** : `/robin` (lecture de documentation existante, ADR), `/brook` (publication de documentation technique)

**Prerequis** :
- Un compte Notion avec acces au workspace cible

**Installation** :

```bash
claude mcp add --transport http notion https://mcp.notion.com/mcp
```

**Verification** :

```bash
claude mcp list
```

Verifiez que `notion` apparait. L'authentification Notion sera demandee lors de la premiere utilisation.

---

### 3.9 Docker

**Priorite : Optionnel**

Permet a Claude Code de gerer des conteneurs Docker : lister, demarrer, arreter, inspecter des conteneurs et images.

**Agents beneficiaires** : `/usopp` (DevOps, gestion d'infrastructure), `/ace` (tests de performance dans des conteneurs isoles)

**Prerequis** :
- Node.js >= 18
- Docker Desktop ou Docker Engine installe et en cours d'execution

**Installation** :

```bash
claude mcp add docker -- cmd /c npx -y @modelcontextprotocol/server-docker
```

> **Note Linux/macOS** :
> ```bash
> claude mcp add docker -- npx -y @modelcontextprotocol/server-docker
> ```

**Verification** :

```bash
claude mcp list
docker ps
```

Verifiez que `docker` apparait dans la liste MCP et que Docker est bien en cours d'execution.

---

## 4. Configuration recommandee par cas d'usage

Vous n'avez pas besoin d'installer tous les MCP Servers. Choisissez en fonction de votre activite principale.

### Developpement quotidien (configuration minimale)

Pour un usage general avec les agents Mugiwara :

```bash
# Les 3 must-have couvrent 80% des besoins
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
claude mcp add --transport http context7 https://mcp.context7.com/mcp
claude mcp add playwright -- cmd /c npx -y @playwright/mcp@latest
```

**Agents optimises** : tous les sous-chefs Sanji, Franky, Nami, Usopp

---

### Code review et qualite

Si votre focus est l'audit de code et la qualite logicielle :

```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
claude mcp add sequential-thinking -- cmd /c npx -y @modelcontextprotocol/server-sequential-thinking
```

**Agents optimises** : Franky (code review + issues GitHub), Chopper (debug + erreurs Sentry), Jinbe (audit securite), Zorro (analyse structuree)

---

### DevOps et infrastructure

Si vous gerez des deployments et de l'infrastructure :

```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
claude mcp add docker -- cmd /c npx -y @modelcontextprotocol/server-docker
```

**Agents optimises** : Usopp (CI/CD + Docker), Ace (performance + conteneurs isoles)

**Pipeline optimise** : `/incident` (diagnostic → fix → securite → deploy)

---

### Data engineering

Si vous travaillez avec des donnees et des bases :

```bash
claude mcp add --transport http context7 https://mcp.context7.com/mcp
claude mcp add db -- cmd /c npx -y @bytebase/dbhub --dsn "votre-dsn-ici"
```

**Agents optimises** : Law (data engineering + exploration DB), Law-SQL (requetes + optimisation)

---

### Design et produit

Si vous travaillez sur l'UX/UI et la strategie produit :

```bash
claude mcp add --transport http figma https://mcp.figma.com/mcp
claude mcp add --transport http notion https://mcp.notion.com/mcp
claude mcp add --transport http context7 https://mcp.context7.com/mcp
```

**Agents optimises** : Sanji-Design (maquettes Figma → design tokens), Vivi (product management), Robin et Brook (documentation Notion)

---

### Production monitoring et incident response

Si vous gerez des applications en production :

```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
claude mcp add docker -- cmd /c npx -y @modelcontextprotocol/server-docker
```

**Agents optimises** : Chopper (diagnostic + Sentry), Usopp (deploy + Docker), Franky (fix review + GitHub)

**Pipeline optimise** : `/incident` (Chopper → Franky → Jinbe → Usopp)

---

### Installation complete (tous les serveurs)

Pour installer l'ensemble des MCP Servers d'un coup :

```bash
# Must-have
claude mcp add --transport http github https://api.githubcopilot.com/mcp/
claude mcp add --transport http context7 https://mcp.context7.com/mcp
claude mcp add playwright -- cmd /c npx -y @playwright/mcp@latest

# Recommande
claude mcp add sequential-thinking -- cmd /c npx -y @modelcontextprotocol/server-sequential-thinking

# Optionnel (adapter les parametres a votre environnement)
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
claude mcp add db -- cmd /c npx -y @bytebase/dbhub --dsn "votre-dsn-ici"
claude mcp add --transport http figma https://mcp.figma.com/mcp
claude mcp add --transport http notion https://mcp.notion.com/mcp
claude mcp add docker -- cmd /c npx -y @modelcontextprotocol/server-docker
```

Apres installation, verifiez avec :

```bash
claude mcp list
```

---

## Depannage

### Un serveur n'apparait pas dans `claude mcp list`

1. Verifiez que la commande d'installation s'est terminee sans erreur
2. Redemarrez Claude Code (`claude` dans un nouveau terminal)
3. Relancez `claude mcp list`

### Erreur `npx: command not found`

Node.js n'est pas installe ou n'est pas dans le PATH. Installez Node.js >= 18 depuis [nodejs.org](https://nodejs.org/).

### Erreur de connexion HTTP sur un MCP Server

Les serveurs HTTP (GitHub, Context7, Sentry, Figma, Notion) necessitent une connexion internet active. Verifiez votre reseau et les eventuels proxys.

### Supprimer un MCP Server

```bash
claude mcp remove nom-du-serveur
```

Exemple :

```bash
claude mcp remove sentry
```
