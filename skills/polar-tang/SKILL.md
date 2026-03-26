---
name: polar-tang
description: "Alias de incident. Pipeline de reponse d'urgence production : Chopper, Franky, Jinbe, Usopp."
argument-hint: "[erreur, logs, symptomes ou description de l'incident]"
disable-model-invocation: false
context: fork
agent: general-purpose
model: opus
allowed-tools: Skill
---

# Polar-Tang — Alias de Incident

Cet agent est un alias retro-compatible de **incident**.

## Demande de l'utilisateur

**Probleme / Besoin :** $ARGUMENTS

## Action

Invoque immediatement le skill `incident` avec la demande complete de l'utilisateur :

Skill(skill: "incident", args: "$ARGUMENTS")

Ne fais aucun traitement toi-meme. Delegue integralement.
