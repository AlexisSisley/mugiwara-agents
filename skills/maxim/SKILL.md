---
name: maxim
description: "Alias de api-postman. Pipeline Bartholomew, Perona, Senor Pink : du code source a la collection Postman + tests E2E."
argument-hint: "[fichier, dossier ou specification d'API a analyser et transformer en collection Postman avec tests E2E]"
disable-model-invocation: false
context: fork
agent: general-purpose
model: opus
allowed-tools: Skill
---

# Maxim — Alias de Api-Postman

Cet agent est un alias retro-compatible de **api-postman**.

## Demande de l'utilisateur

**Probleme / Besoin :** $ARGUMENTS

## Action

Invoque immediatement le skill `api-postman` avec la demande complete de l'utilisateur :

Skill(skill: "api-postman", args: "$ARGUMENTS")

Ne fais aucun traitement toi-meme. Delegue integralement.
