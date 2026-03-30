---
name: monitoring
description: "Alias de enel. Monitoring, observabilite, Prometheus, Grafana, Alertmanager, SRE."
argument-hint: "[setup | dashboard <service> | alerts <service> | slo <service> | audit]"
disable-model-invocation: false
context: fork
agent: general-purpose
model: haiku
allowed-tools: Skill
---

# Monitoring — Alias de Enel

Cet agent est un alias retro-compatible de **enel**.

## Demande de l'utilisateur

**Probleme / Besoin :** $ARGUMENTS

## Action

Invoque immediatement le skill `enel` avec la demande complete de l'utilisateur :

Skill(skill: "enel", args: "$ARGUMENTS")

Ne fais aucun traitement toi-meme. Delegue integralement.
