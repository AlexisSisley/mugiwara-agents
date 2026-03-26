---
name: ohara
description: "Alias de doc-hunt. Pipeline de recherche et redaction de documentation : Yamato, Brook."
argument-hint: "[API, librairie ou outil a documenter]"
disable-model-invocation: false
context: fork
agent: general-purpose
model: opus
allowed-tools: Skill
---

# Ohara — Alias de Doc-Hunt

Cet agent est un alias retro-compatible de **doc-hunt**.

## Demande de l'utilisateur

**Probleme / Besoin :** $ARGUMENTS

## Action

Invoque immediatement le skill `doc-hunt` avec la demande complete de l'utilisateur :

Skill(skill: "doc-hunt", args: "$ARGUMENTS")

Ne fais aucun traitement toi-meme. Delegue integralement.
