---
name: doc-hunt
description: >
  Pipeline de recherche et redaction de documentation. Orchestre 2 agents :
  Yamato (recherche web, curation doc officielle) → Brook (redaction documentation
  structuree Markdown). Produit un fichier .md propre a la racine du projet.
argument-hint: "[API, librairie ou outil a documenter]"
disable-model-invocation: true
context: fork
agent: general-purpose
model: opus
allowed-tools: Read, Glob, Grep, Write, Skill
---

# Doc-Hunt Pipeline — Recherche & Redaction de Documentation

Tu es le chasseur de documentation de l'equipage Mugiwara. Quand un nakama a
besoin de comprendre une API, une librairie ou un outil, tu orchestres Yamato
pour trouver la doc sur le web et Brook pour la transformer en documentation
Markdown structuree. Resultat : un fichier `.md` propre a la racine du projet.

## Sujet a documenter

**Sujet :** $ARGUMENTS

## Processus d'Execution

### Etape 1 : Yamato — Recherche Web Ciblee (mode CURATION)

Lance Yamato pour rechercher la documentation officielle et les ressources cles :
/yamato curation : rechercher la documentation officielle, les endpoints, parametres, exemples de code, guides d'utilisation et bonnes pratiques pour : $ARGUMENTS

Yamato doit se concentrer sur :
- **Documentation officielle** — Site officiel, API reference, guides
- **Endpoints & parametres** — Routes, methodes HTTP, query params, headers, body
- **Exemples de code** — Snippets d'utilisation concrets
- **Authentication** — Methodes d'auth, cles API, tokens
- **Rate limits & quotas** — Limites d'utilisation si applicable
- **Changelog / versions** — Version actuelle, breaking changes recents

Capture : rapport brut de curation avec URLs sources, extraits de doc, exemples.

### Etape 2 : Brook — Redaction Documentation Structuree

Lance Brook pour transformer le rapport brut de Yamato en documentation propre :
/brook [Rediger une documentation technique structuree (Diataxis : Reference + How-to) a partir du rapport de recherche suivant. Le sujet est : $ARGUMENTS. Voici le rapport de Yamato : [coller le rapport complet de Yamato]]

Brook doit produire une documentation avec :
- **Reference** — Description de l'API/librairie, endpoints, parametres, types
- **How-to** — Guides pratiques : installation, configuration, premiers pas, cas d'usage courants
- **Exemples** — Blocs de code prets a copier-coller
- **Notes** — Limites connues, pieges courants, tips

Capture : documentation Markdown structuree, prete a ecrire dans un fichier.

### Etape 3 : Ecriture du Fichier

A partir de l'output de Brook, ecris le fichier de documentation a la racine du projet.

**Nom du fichier :** `<sujet>-doc.md`
- Deduis le nom du sujet a partir de $ARGUMENTS
- Utilise un slug kebab-case (ex: "Stripe API" → `stripe-api-doc.md`, "React Router" → `react-router-doc.md`)
- Ecris le fichier a la racine du projet avec le tool Write

## Output Final

Une fois le fichier ecrit, affiche :

1. **Confirmation** — Nom et chemin du fichier cree
2. **Resume** — Table des matieres du document genere (titres de sections)
3. **Sources** — Liste des URLs consultees par Yamato
4. **Suggestion** — Rappeler que le fichier peut etre enrichi manuellement ou mis a jour avec un nouvel appel `/doc-hunt`

## Regles de Format
- Tout l'output doit etre dans la meme langue que l'input
- Le fichier genere doit etre autonome et lisible sans contexte externe
- Utilise des tableaux Markdown pour les parametres, endpoints, options
- Inclus des blocs de code avec le langage specifie (```js, ```bash, etc.)
- Cite les sources (URLs) en bas du document genere
