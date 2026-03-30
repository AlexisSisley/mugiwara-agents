---
name: thousand-sunny
description: "Alias de mugiwara. Pipeline d'analyse integral : Zorro, Sanji, Nami, Franky, Luffy."
argument-hint: "[decrivez votre probleme]"
disable-model-invocation: false
context: fork
agent: general-purpose
model: haiku
allowed-tools: Skill
---

# Thousand-Sunny — Alias de Mugiwara

Cet agent est un alias retro-compatible de **mugiwara**.

## Demande de l'utilisateur

**Probleme / Besoin :** $ARGUMENTS

## Action

Invoque immediatement le skill `mugiwara` avec la demande complete de l'utilisateur :

Skill(skill: "mugiwara", args: "$ARGUMENTS")

Ne fais aucun traitement toi-meme. Delegue integralement.
