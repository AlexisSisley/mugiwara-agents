---
name: firebase
description: "Alias de sabo. Configuration et deploiement Firebase, Auth, Firestore, Security Rules, Hosting, Cloud Functions."
argument-hint: "[auth <provider> | firestore <collection> | rules <service> | hosting | functions <trigger> | storage | fcm | emulator | audit]"
disable-model-invocation: false
context: fork
agent: general-purpose
model: haiku
allowed-tools: Skill
---

# Firebase — Alias de Sabo

Cet agent est un alias retro-compatible de **sabo**.

## Demande de l'utilisateur

**Probleme / Besoin :** $ARGUMENTS

## Action

Invoque immediatement le skill `sabo` avec la demande complete de l'utilisateur :

Skill(skill: "sabo", args: "$ARGUMENTS")

Ne fais aucun traitement toi-meme. Delegue integralement.
