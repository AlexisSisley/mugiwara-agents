---
name: feature-flags
description: "Alias de ivankov. Feature flags, progressive delivery, Unleash, LaunchDarkly."
argument-hint: "[setup | env-flags | unleash <service> | launchdarkly <service> | audit | migrate]"
disable-model-invocation: false
context: fork
agent: general-purpose
model: opus
allowed-tools: Skill
---

# Feature-Flags — Alias de Ivankov

Cet agent est un alias retro-compatible de **ivankov**.

## Demande de l'utilisateur

**Probleme / Besoin :** $ARGUMENTS

## Action

Invoque immediatement le skill `ivankov` avec la demande complete de l'utilisateur :

Skill(skill: "ivankov", args: "$ARGUMENTS")

Ne fais aucun traitement toi-meme. Delegue integralement.
