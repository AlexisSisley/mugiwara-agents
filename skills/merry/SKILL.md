---
name: merry
description: "Alias de discovery. Pipeline de decouverte produit : Vivi puis Mugiwara."
argument-hint: "[produit, feature ou probleme utilisateur a explorer]"
disable-model-invocation: false
context: fork
agent: general-purpose
model: opus
allowed-tools: Skill
---

# Merry — Alias de Discovery

Cet agent est un alias retro-compatible de **discovery**.

## Demande de l'utilisateur

**Probleme / Besoin :** $ARGUMENTS

## Action

Invoque immediatement le skill `discovery` avec la demande complete de l'utilisateur :

Skill(skill: "discovery", args: "$ARGUMENTS")

Ne fais aucun traitement toi-meme. Delegue integralement.
