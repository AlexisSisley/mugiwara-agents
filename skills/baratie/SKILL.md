---
name: baratie
description: "Alias de onboard. Pipeline d'onboarding codebase : Robin, Franky, Brook."
argument-hint: "[dossier du projet ou codebase a decouvrir]"
disable-model-invocation: false
context: fork
agent: general-purpose
model: haiku
allowed-tools: Skill
---

# Baratie — Alias de Onboard

Cet agent est un alias retro-compatible de **onboard**.

## Demande de l'utilisateur

**Probleme / Besoin :** $ARGUMENTS

## Action

Invoque immediatement le skill `onboard` avec la demande complete de l'utilisateur :

Skill(skill: "onboard", args: "$ARGUMENTS")

Ne fais aucun traitement toi-meme. Delegue integralement.
