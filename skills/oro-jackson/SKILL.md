---
name: oro-jackson
description: "Alias de pre-launch. Pipeline de verification avant production : Nami, Franky, Jinbe, Usopp, Ace, Brook."
argument-hint: "[systeme, feature ou release a valider avant production]"
disable-model-invocation: false
context: fork
agent: general-purpose
model: haiku
allowed-tools: Skill
---

# Oro-Jackson — Alias de Pre-Launch

Cet agent est un alias retro-compatible de **pre-launch**.

## Demande de l'utilisateur

**Probleme / Besoin :** $ARGUMENTS

## Action

Invoque immediatement le skill `pre-launch` avec la demande complete de l'utilisateur :

Skill(skill: "pre-launch", args: "$ARGUMENTS")

Ne fais aucun traitement toi-meme. Delegue integralement.
