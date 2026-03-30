---
name: iis
description: "Alias de paulie. Configuration et deploiement IIS, web.config, application pools, SSL/TLS, PowerShell."
argument-hint: "[site <name> | web-config <stack> | pool <name> | ssl <domain> | rewrite <rules> | deploy <path> | audit]"
disable-model-invocation: false
context: fork
agent: general-purpose
model: haiku
allowed-tools: Skill
---

# IIS — Alias de Paulie

Cet agent est un alias retro-compatible de **paulie**.

## Demande de l'utilisateur

**Probleme / Besoin :** $ARGUMENTS

## Action

Invoque immediatement le skill `paulie` avec la demande complete de l'utilisateur :

Skill(skill: "paulie", args: "$ARGUMENTS")

Ne fais aucun traitement toi-meme. Delegue integralement.
