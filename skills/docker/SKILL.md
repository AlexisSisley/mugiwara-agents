---
name: docker
description: "Alias de iceburg. Containerisation Docker, Dockerfile multi-stage, docker-compose, Kubernetes, Helm."
argument-hint: "[dockerfile <stack> | compose <services...> | swarm <stack> | k8s <app> | helm <chart> | audit <path>]"
disable-model-invocation: false
context: fork
agent: general-purpose
model: opus
allowed-tools: Skill
---

# Docker — Alias de Iceburg

Cet agent est un alias retro-compatible de **iceburg**.

## Demande de l'utilisateur

**Probleme / Besoin :** $ARGUMENTS

## Action

Invoque immediatement le skill `iceburg` avec la demande complete de l'utilisateur :

Skill(skill: "iceburg", args: "$ARGUMENTS")

Ne fais aucun traitement toi-meme. Delegue integralement.
