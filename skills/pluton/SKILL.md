---
name: pluton
description: "Alias de modernize. Pipeline de modernisation de stack : Yamato, Robin, Law, Sanji, Shanks, Usopp."
argument-hint: "[stack actuelle ou systeme a moderniser]"
disable-model-invocation: false
context: fork
agent: general-purpose
model: haiku
allowed-tools: Skill
---

# Pluton — Alias de Modernize

Cet agent est un alias retro-compatible de **modernize**.

## Demande de l'utilisateur

**Probleme / Besoin :** $ARGUMENTS

## Action

Invoque immediatement le skill `modernize` avec la demande complete de l'utilisateur :

Skill(skill: "modernize", args: "$ARGUMENTS")

Ne fais aucun traitement toi-meme. Delegue integralement.
