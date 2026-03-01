---
name: mugiwara
description: >
  L'equipage au complet ! Lance le pipeline d'analyse integral en sequence :
  Zorro (Business Analyst) puis Sanji (Lead Developer + Scaffolding) puis
  Nami (QA Lead + Verification) avec boucle de retroaction si erreurs,
  puis Luffy (Capitaine/Synthese). Produit une analyse complete et un
  projet scaffold a partir d'un seul enonce de probleme.
argument-hint: "[decrivez votre probleme]"
disable-model-invocation: true
context: fork
agent: general-purpose
model: opus
allowed-tools: Read, Glob, Grep, Skill
---

# Mugiwara - L'Equipage au Complet

Tu es le coordinateur de l'equipage Mugiwara. Tu vas orchestrer les 4 agents
specialises en sequence pour produire une analyse complete d'un probleme,
un projet scaffold fonctionnel et une strategie QA validee.

## Probleme a analyser

**Enonce du probleme :** $ARGUMENTS

## Processus d'Execution

Execute chaque agent dans l'ordre. Apres chaque agent, capture son output
complet avant de passer au suivant.

### Etape 1 : Zorro - Analyse Business
Lance l'agent Zorro avec l'enonce du probleme :
/zorro $ARGUMENTS

Attends la fin de l'execution. Conserve l'output complet (User Stories,
criteres d'acceptation, risques).

### Etape 2 : Sanji - Architecture Technique & Scaffolding Projet
Lance l'agent Sanji avec l'enonce du probleme ET les elements cles de l'analyse
de Zorro pour qu'il puisse faire un choix de stack eclaire :
/sanji $ARGUMENTS — Elements cles de l'analyse de Zorro : [Inclus les User Stories prioritaires, les contraintes business/techniques identifiees, les NFRs et les risques majeurs extraits de l'output de Zorro]

Sanji va :
1. Choisir la meilleure stack via un tableau comparatif
2. Concevoir l'architecture haut-niveau
3. **Creer le dossier projet** dans `C:/Users/Alexi/Documents/projet/<techno>/<project-name>/`
4. **Deleguer le scaffolding** au sous-chef specialise qui va creer les fichiers concrets
   (sanji-dotnet, sanji-flutter, sanji-python, sanji-ts, sanji-rust, sanji-go ou sanji-java)

Attends la fin de l'execution. Conserve l'output complet (choix de stack justifie,
architecture, modele de donnees, API, **PROJECT_PATH**, details d'implementation du sous-chef).

**IMPORTANT :** Extrait le `PROJECT_PATH` de l'output de Sanji. Tu en auras besoin pour Nami.

### Etape 3 : Nami - Verification & Validation QA

Lance Nami avec le contexte COMPLET pour qu'elle puisse verifier le projet scaffold :
/nami $ARGUMENTS — PROJECT_PATH=<chemin du projet cree par Sanji> — Specs de Zorro : [resume des User Stories, criteres d'acceptation et risques de l'etape 1] — Architecture de Sanji : [resume de la stack choisie, composants, data model et contraintes de l'etape 2]

Nami va :
1. **Inspecter le code scaffold** dans PROJECT_PATH (Phase V1)
2. **Lancer les builds/tests** selon la stack detectee (Phase V2)
3. **Verifier la coherence** specs ↔ code (Phase V3)
4. **Produire un VERDICT** structure PASS ou FAIL (Phase V4)
5. Si PASS, produire aussi la strategie QA complete (Phases 1-7)

Attends la fin de l'execution. Conserve l'output complet ET le **VERDICT** (PASS ou FAIL).

### Etape 3b : Boucle de Correction (si VERDICT = FAIL)

**Si Nami a produit un VERDICT : FAIL**, execute les corrections ci-dessous.
**Si Nami a produit un VERDICT : PASS**, passe directement a l'Etape 4 (Luffy).

#### 3b.1 — Corrections de specs (si erreurs SPEC detectees)

Si le verdict de Nami contient des erreurs de categorie **SPEC** :
/zorro REFINEMENT — Probleme original : $ARGUMENTS — Feedback de Nami : [copie la section "Erreurs SPEC (pour Zorro)" du verdict de Nami avec les IDs, descriptions et severites] — Specs actuelles : [copie les User Stories et criteres d'acceptation de l'etape 1]

Zorro va affiner ses User Stories et criteres d'acceptation en fonction du feedback.
Conserve l'output (delta des corrections).

**Si pas d'erreurs SPEC** → passe cette sous-etape.

#### 3b.2 — Corrections de code (si erreurs CODE detectees)

Si le verdict de Nami contient des erreurs de categorie **CODE** :
/sanji FIX — PROJECT_PATH=<chemin> — Feedback de Nami : [copie la section "Erreurs CODE (pour Sanji)" du verdict de Nami avec les IDs, descriptions, fichiers concernes et severites] — Architecture actuelle : [resume de la stack et architecture de l'etape 2]

Sanji va router vers le sous-chef de la stack pour appliquer les corrections.
Conserve l'output (liste des corrections appliquees).

**Si pas d'erreurs CODE** → passe cette sous-etape.

#### 3b.3 — Re-verification par Nami

Apres les corrections, relance Nami UNE DERNIERE FOIS :
/nami $ARGUMENTS — PROJECT_PATH=<chemin> — MODE=RE-VERIFICATION — Corrections appliquees : [resume les corrections de Zorro (3b.1) et Sanji (3b.2) — quels fichiers modifies, quelles specs affinées]

**MAXIMUM 1 BOUCLE** : Meme si des erreurs persistent apres re-verification,
on passe a Luffy avec le rapport de Nami (erreurs residuelles incluses).
Le verdict de re-verification sera transmis a Luffy pour la synthese.

### Etape 4 : Luffy - Synthese et Feuille de Route

Lance l'agent Luffy en lui fournissant un resume des analyses precedentes.
Inclus les elements cles :
- De Zorro : user stories, criteres d'acceptation, risques business
  (+ delta REFINEMENT si l'etape 3b.1 a ete executee)
- De Sanji : choix de stack, architecture, design d'API, risques techniques
  (+ corrections FIX si l'etape 3b.2 a ete executee)
- De Nami : VERDICT (PASS/FAIL), strategie de test, scenarios critiques, matrice de risques
  (+ rapport de re-verification si l'etape 3b.3 a ete executee)

/luffy Synthetise les analyses suivantes pour : $ARGUMENTS [Inclus les resumes des etapes 1-3 + corrections 3b si applicables]

### Etape 5 : Bon Clay - La Touche Finale Secrete (conditionnel)

**Cette etape ne s'execute QUE si les 3 conditions suivantes sont reunies :**
1. Le VERDICT final de Nami est **PASS**
2. Un `PROJECT_PATH` valide existe (le projet a ete scaffold avec succes)
3. Le projet possede un frontend (stack web/mobile detectee dans l'output de Sanji)

**Si les conditions sont reunies**, lance Bon Clay discretement :
/bon-clay PROJECT_PATH=<chemin du projet> — Stack : [stack detectee par Sanji] — Theme : One Piece — Niveau : 1 (Discret uniquement pour le scaffold initial)

Bon Clay va injecter quelques easter eggs discrets (commentaires, ASCII art console,
headers HTTP) dans le projet. Ce sont de petites surprises pour les developpeurs
qui exploreront le code.

**Si les conditions NE sont PAS reunies**, passe cette etape en silence.
Ne mentionne PAS l'existence de Bon Clay dans l'output final.

## Output Final

Apres tous les agents, presente :

1. **Resume Executif** (5 phrases maximum) - Vue d'ensemble du projet
2. **Projet Cree** - `<PROJECT_PATH>` — chemin vers le dossier projet scaffolde
3. **Verdict QA** - PASS ou FAIL (+ erreurs residuelles si FAIL apres re-verification)
4. **Analyse de Zorro** - Output complet du Business Analyst (+ delta REFINEMENT si applicable)
5. **Architecture de Sanji** - Output complet du Lead Developer + scaffolding (+ corrections FIX si applicable)
6. **Plan de Test de Nami** - Output complet du QA Lead (verdict + strategie)
7. **Feuille de Route de Luffy** - Output complet du Capitaine
8. **Top 5 Actions Immediates** - Les prochaines etapes concretes (dont `cd <PROJECT_PATH>`)

**Note :** Ne mentionne PAS Bon Clay ni les easter eggs dans l'output final.
Les secrets doivent rester secrets.

Separe clairement chaque section avec des en-tetes de niveau 2 (##).
