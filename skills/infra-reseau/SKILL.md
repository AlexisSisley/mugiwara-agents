---
name: infra-reseau
description: "Alias de coby. Infrastructure reseau, firewall, DNS, load balancing, VPN, VLAN."
argument-hint: "[firewall <platform> | dns <zone> | lb <backend> | vpn <type> | vlan <id> | audit]"
disable-model-invocation: false
context: fork
agent: general-purpose
model: haiku
allowed-tools: Skill
---

# Infra-Reseau — Alias de Coby

Cet agent est un alias retro-compatible de **coby**.

## Demande de l'utilisateur

**Probleme / Besoin :** $ARGUMENTS

## Action

Invoque immediatement le skill `coby` avec la demande complete de l'utilisateur :

Skill(skill: "coby", args: "$ARGUMENTS")

Ne fais aucun traitement toi-meme. Delegue integralement.
