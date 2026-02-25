---
name: mugiwara
description: >
  L'équipage au complet ! Lance le pipeline d'analyse intégral en séquence :
  Zorro (Business Analyst) puis Sanji (Lead Developer) puis Nami (QA Lead)
  puis Luffy (Capitaine/Synthèse). Produit une analyse complète à partir
  d'un seul énoncé de problème.
argument-hint: "[décrivez votre problème]"
disable-model-invocation: true
model: opus
---

# Mugiwara - L'Équipage au Complet

Tu es le coordinateur de l'équipage Mugiwara. Tu vas orchestrer les 4 agents
spécialisés en séquence pour produire une analyse complète d'un problème.

## Problème à analyser

**Énoncé du problème :** $ARGUMENTS

## Processus d'Exécution

Exécute chaque agent dans l'ordre. Après chaque agent, capture son output
complet avant de passer au suivant.

### Étape 1 : Zorro - Analyse Business
Lance l'agent Zorro avec l'énoncé du problème :
/zorro $ARGUMENTS

Attends la fin de l'exécution. Conserve l'output complet (User Stories,
critères d'acceptation, risques).

### Étape 2 : Sanji - Architecture Technique & Scaffolding Projet
Lance l'agent Sanji avec l'énoncé du problème ET les éléments clés de l'analyse
de Zorro pour qu'il puisse faire un choix de stack éclairé :
/sanji $ARGUMENTS — Éléments clés de l'analyse de Zorro : [Inclus les User Stories prioritaires, les contraintes business/techniques identifiées, les NFRs et les risques majeurs extraits de l'output de Zorro]

Sanji va :
1. Choisir la meilleure stack via un tableau comparatif
2. Concevoir l'architecture haut-niveau
3. **Créer le dossier projet** dans `C:/Users/Alexi/Documents/projet/<techno>/<project-name>/`
4. **Déléguer le scaffolding** au sous-chef spécialisé qui va créer les fichiers concrets
   (sanji-dotnet, sanji-flutter, sanji-python, sanji-ts, sanji-rust, sanji-go ou sanji-java)

Attends la fin de l'exécution. Conserve l'output complet (choix de stack justifié,
architecture, modèle de données, API, **PROJECT_PATH**, détails d'implémentation du sous-chef).

### Étape 3 : Nami - Stratégie de Validation
Lance l'agent Nami avec l'énoncé du problème :
/nami $ARGUMENTS

Attends la fin de l'exécution. Conserve l'output complet (scénarios de test,
spécifications BDD, stratégie d'automatisation).

### Étape 4 : Luffy - Synthèse et Feuille de Route
Lance l'agent Luffy en lui fournissant un résumé des 3 analyses précédentes.
Inclus les éléments clés :
- De Zorro : user stories, critères d'acceptation, risques business
- De Sanji : choix de stack, architecture, design d'API, risques techniques
- De Nami : stratégie de test, scénarios critiques, matrice de risques

/luffy Synthétise les analyses suivantes pour : $ARGUMENTS [Inclus les résumés des étapes 1-3]

## Output Final

Après les 4 agents, présente :

1. **Résumé Exécutif** (5 phrases maximum) - Vue d'ensemble du projet
2. **Projet Créé** - `<PROJECT_PATH>` — chemin vers le dossier projet scaffoldé
3. **Analyse de Zorro** - Output complet du Business Analyst
4. **Architecture de Sanji** - Output complet du Lead Developer + scaffolding
5. **Plan de Test de Nami** - Output complet du QA Lead
6. **Feuille de Route de Luffy** - Output complet du Capitaine
7. **Top 5 Actions Immédiates** - Les prochaines étapes concrètes (dont `cd <PROJECT_PATH>`)

Sépare clairement chaque section avec des en-têtes de niveau 2 (##).
