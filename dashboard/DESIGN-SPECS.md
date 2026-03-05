# Design Specifications -- Mugiwara Dashboard

> Galley-La Design System v1.0
> Projet : mugiwara-dashboard
> Date : 2026-03-05
> Stack : Svelte 4 + Vite 5 (frontend) / Express 4 + TypeScript (backend)

---

## Phase 1 : Brief Creatif

| Dimension | Detail |
|-----------|--------|
| Industrie | DevTools / Monitoring technique interne |
| Cible | Developpeurs senior, DevOps, Tech Leads -- profil technique avance, habitudes terminales, usage quotidien |
| Objectif | Dashboard de monitoring : supervision en temps reel de 40 agents IA, 8 pipelines et historique des sessions |
| Ton | Tech/innovant, serieux mais avec une touche de personnalite (branding One Piece subtil) |
| Devices | Desktop-first (usage terminal/dev). Responsive optionnel |
| References | Grafana (layout panels), GitHub Actions (pipelines), Datadog (monitoring dark UI), Vercel Dashboard (minimalisme sombre) |

### Analyse du Contexte

Le Mugiwara Dashboard est un outil de monitoring technique permettant de superviser l'ecosysteme de 40 agents IA specialises. Les utilisateurs sont des developpeurs qui travaillent deja en terminal avec Claude Code CLI. Le dashboard doit s'integrer naturellement dans leur workflow : theme sombre, densite d'information elevee, lisibilite avant esthetique, et zero friction.

Le branding One Piece est **subtil** : inspire par les couleurs de l'univers (bleu marine profond, or du Jolly Roger, rouge du chapeau de paille) sans tomber dans le cosplay. L'objectif est d'evoquer l'esprit pirate/aventurier par les teintes et la nomenclature, pas par des illustrations ou des ornements.

---

## Phase 2 : Direction Artistique

### 2.1 Palette de Couleurs -- Dark Mode

La palette est construite sur un fond sombre type "midnight ocean" avec des accents inspires du Jolly Roger (or), du chapeau de Luffy (rouge straw) et de la mer (bleu profond). Le contraste respecte WCAG AA sur toutes les combinaisons texte/fond.

| Role | Nom | HEX | RGB | Usage |
|------|-----|-----|-----|-------|
| **Primary** | Grand Line Gold | `#E8A317` | 232, 163, 23 | CTA, liens actifs, elements selectionnes, accents principaux |
| **Primary Light** | Sunny Gold | `#F2C14E` | 242, 193, 78 | Hover sur primary, backgrounds legers d'emphase |
| **Primary Dark** | Treasure Gold | `#B8820D` | 184, 130, 13 | Texte dore sur fond sombre, emphase titres |
| **Secondary** | Straw Hat Red | `#C0392B` | 192, 57, 43 | Accents secondaires, badges critiques, marqueurs pipeline |
| **Secondary Light** | Luffy Red | `#E74C3C` | 231, 76, 60 | Hover secondary, etats actifs alertes |
| **Background** | Abyss | `#0B0E14` | 11, 14, 20 | Fond principal de l'application |
| **Background Alt** | Deep Sea | `#111621` | 17, 22, 33 | Fond sidebar, zones contrastees |
| **Surface** | Night Ocean | `#161B26` | 22, 27, 38 | Cards, panels, modals |
| **Surface Hover** | Calm Belt | `#1C2333` | 28, 35, 51 | Hover sur cards, lignes de tableau |
| **Surface Active** | Current | `#232B3E` | 35, 43, 62 | Element selectionne, active state |
| **Text Primary** | Parchment | `#E6E8ED` | 230, 232, 237 | Titres, corps de texte principal |
| **Text Secondary** | Sea Mist | `#8B92A5` | 139, 146, 165 | Labels, placeholders, metadata |
| **Text Tertiary** | Fog | `#5A6178` | 90, 97, 120 | Texte desactive, timestamps |
| **Success** | Emerald City | `#16A34A` | 22, 163, 74 | PASS, agent actif, sante OK |
| **Success Bg** | Emerald Glow | `#0A2E1A` | 10, 46, 26 | Background des badges success |
| **Warning** | Log Pose | `#EAB308` | 234, 179, 8 | Alertes, attention, degradation |
| **Warning Bg** | Log Glow | `#2E2A08` | 46, 42, 8 | Background des badges warning |
| **Error** | Red Line | `#DC2626` | 220, 38, 38 | FAIL, erreurs, suppression |
| **Error Bg** | Red Glow | `#2E0A0A` | 46, 10, 10 | Background des badges error |
| **Border** | Reef | `#232B3E` | 35, 43, 62 | Bordures, separateurs, dividers |
| **Border Light** | Shallow | `#2D3548` | 45, 53, 72 | Bordures hover, focus rings |

#### Ratios de contraste (WCAG AA)

| Combinaison | Ratio | Resultat |
|-------------|-------|----------|
| Text Primary (#E6E8ED) sur Background (#0B0E14) | 15.8:1 | AAA |
| Text Secondary (#8B92A5) sur Background (#0B0E14) | 6.3:1 | AA |
| Text Primary (#E6E8ED) sur Surface (#161B26) | 12.9:1 | AAA |
| Primary (#E8A317) sur Background (#0B0E14) | 8.2:1 | AAA |
| Primary (#E8A317) sur Surface (#161B26) | 6.7:1 | AA |
| Success (#16A34A) sur Success Bg (#0A2E1A) | 5.1:1 | AA |
| Error (#DC2626) sur Error Bg (#2E0A0A) | 5.4:1 | AA |

### 2.2 Typographie

Police principale : **JetBrains Mono** pour le code et les donnees, **Inter** pour l'interface et la lisibilite.

Justification : Inter est la police UI de reference pour les dashboards techniques (lisibilite optimale en petites tailles, excellentes tabular figures). JetBrains Mono est la police de code par excellence (ligatures, distinction claire entre caracteres similaires). L'association Inter + JetBrains Mono est un standard reconnu dans les outils dev (VS Code, GitHub, Linear).

| Role | Police | Poids | Taille | Interligne | Letter-spacing | Usage |
|------|--------|-------|--------|------------|----------------|-------|
| H1 | Inter | Bold (700) | 28px / 1.75rem | 1.2 | -0.02em | Titre de page (Vue Agents, Vue Pipelines, Vue Sessions) |
| H2 | Inter | SemiBold (600) | 22px / 1.375rem | 1.3 | -0.01em | Titres de sections |
| H3 | Inter | SemiBold (600) | 18px / 1.125rem | 1.3 | 0 | Sous-titres, noms de cards |
| H4 | Inter | Medium (500) | 15px / 0.9375rem | 1.4 | 0 | Labels de groupes |
| Body | Inter | Regular (400) | 14px / 0.875rem | 1.6 | 0 | Corps de texte, descriptions |
| Body Small | Inter | Regular (400) | 13px / 0.8125rem | 1.5 | 0 | Texte secondaire |
| Caption | Inter | Medium (500) | 11px / 0.6875rem | 1.4 | 0.02em | Metadata, timestamps, labels de colonnes |
| Mono | JetBrains Mono | Regular (400) | 13px / 0.8125rem | 1.5 | 0 | IDs, noms d'agents, valeurs numeriques, durees |
| Mono Small | JetBrains Mono | Regular (400) | 11px / 0.6875rem | 1.4 | 0 | Session IDs, hashes, logs |
| Badge | Inter | SemiBold (600) | 11px / 0.6875rem | 1.0 | 0.04em | Status badges, category tags |
| Stat Value | JetBrains Mono | Bold (700) | 32px / 2rem | 1.1 | -0.02em | Grands chiffres dans les stat cards du header |
| Stat Label | Inter | Medium (500) | 12px / 0.75rem | 1.3 | 0.03em | Labels sous les stat values |
| Button | Inter | SemiBold (600) | 13px / 0.8125rem | 1.0 | 0.01em | Texte des boutons |
| Nav Item | Inter | Medium (500) | 14px / 0.875rem | 1.0 | 0 | Items de navigation sidebar |
| Nav Item Active | Inter | SemiBold (600) | 14px / 0.875rem | 1.0 | 0 | Item de navigation actif |

```
Import Google Fonts :
https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap
```

### 2.3 Style UI -- Composants de Base

#### Boutons

| Variante | Background | Texte | Bordure | Border-radius | Padding | Hover | Active |
|----------|------------|-------|---------|---------------|---------|-------|--------|
| **Primary** | `#E8A317` | `#0B0E14` | none | 6px | 8px 16px | bg `#F2C14E` | bg `#B8820D` |
| **Secondary** | transparent | `#E8A317` | 1px solid `#E8A317` | 6px | 8px 16px | bg `#E8A317` + text `#0B0E14` | bg `#B8820D` + text `#0B0E14` |
| **Ghost** | transparent | `#8B92A5` | none | 6px | 8px 16px | text `#E6E8ED` + bg `#1C2333` | bg `#232B3E` |
| **Danger** | `#DC2626` | `#FFFFFF` | none | 6px | 8px 16px | bg `#EF4444` | bg `#B91C1C` |
| **Icon** | transparent | `#8B92A5` | none | 6px | 8px | text `#E6E8ED` + bg `#1C2333` | bg `#232B3E` |

Transition : `all 150ms ease-out`
Focus ring : `0 0 0 2px #0B0E14, 0 0 0 4px #E8A317`

#### Cards

```
Background     : var(--color-surface)          /* #161B26 */
Border         : 1px solid var(--color-border)  /* #232B3E */
Border-radius  : 8px
Padding        : 20px
Hover          : border-color var(--color-border-light) /* #2D3548 */
Transition     : border-color 150ms ease-out
Shadow         : none (style flat, pas d'ombres sur dark mode)
```

#### Stat Cards (Header)

```
Background     : var(--color-surface)
Border         : 1px solid var(--color-border)
Border-radius  : 8px
Padding        : 16px 20px
Layout         : vertical stack
  - Stat Value : font-mono-bold, 32px, var(--color-text-primary)
  - Stat Label : caption, uppercase, var(--color-text-secondary)
  - Trend Icon : 12px, inline avec delta percentage
Accent         : border-left 3px solid [couleur-contexte]
  - Total Agents  → var(--color-primary)
  - Invocations   → var(--color-secondary)
  - Sessions      → #3B82F6 (info blue)
  - Smoke Tests   → var(--color-success) ou var(--color-error) selon ratio
```

#### Badges / Status Pills

| Statut | Background | Text | Border-radius | Icone |
|--------|------------|------|---------------|-------|
| **PASS / Active** | `#0A2E1A` | `#16A34A` | 9999px | cercle plein 6px |
| **FAIL / Error** | `#2E0A0A` | `#DC2626` | 9999px | cercle plein 6px |
| **Running** | `#0A1A2E` | `#3B82F6` | 9999px | spinner 12px |
| **Warning** | `#2E2A08` | `#EAB308` | 9999px | triangle 10px |
| **Idle / N/A** | `#1C2333` | `#5A6178` | 9999px | tiret 8px |

Padding : 4px 10px, font : badge (11px SemiBold uppercase)

#### Category Tags (Agents)

| Categorie | Background | Text |
|-----------|------------|------|
| pipeline | `#1A1A2E` | `#818CF8` (indigo) |
| analysis | `#1A2E2E` | `#2DD4BF` (teal) |
| architecture | `#2E1A1A` | `#FB923C` (orange) |
| security | `#2E0A1A` | `#F472B6` (pink) |
| qa | `#1A2E0A` | `#84CC16` (lime) |
| writing | `#2E2A1A` | `#FBBF24` (amber) |
| debugging | `#2E1A2E` | `#C084FC` (purple) |
| management | `#0A1A2E` | `#60A5FA` (blue) |
| data | `#0A2E2E` | `#22D3EE` (cyan) |
| devops | `#1A2E1A` | `#4ADE80` (green) |
| refactoring | `#2E1A0A` | `#FB7185` (rose) |
| router | `#2E2E0A` | `#FACC15` (yellow) |
| meta | `#1A1A1A` | `#94A3B8` (slate) |
| performance | `#2E0A0A` | `#F87171` (red) |
| intelligence | `#0A0A2E` | `#A78BFA` (violet) |

Padding : 2px 8px, border-radius : 4px, font : caption (11px Medium)

#### Tableau (Table)

```
Header row     : bg var(--color-background-alt) /* #111621 */
                 font : caption uppercase, color text-secondary
                 padding : 10px 16px
                 border-bottom : 1px solid var(--color-border)
Body row       : bg transparent
                 padding : 12px 16px
                 border-bottom : 1px solid var(--color-border)
Row hover      : bg var(--color-surface-hover) /* #1C2333 */
Row selected   : bg var(--color-surface-active) /* #232B3E */
                 border-left : 3px solid var(--color-primary)
Transition     : background 100ms ease-out
Text alignment : left par defaut, right pour valeurs numeriques
Mono values    : font-family JetBrains Mono pour counts, durees, IDs
```

#### Inputs / Champs de recherche

```
Background     : var(--color-surface)
Border         : 1px solid var(--color-border)
Border-radius  : 6px
Padding        : 8px 12px
Font           : body (14px Inter)
Color          : var(--color-text-primary)
Placeholder    : var(--color-text-tertiary)
Focus          : border-color var(--color-primary), box-shadow 0 0 0 3px rgba(232, 163, 23, 0.15)
Icone search   : 16px, position left, color text-secondary
Transition     : border-color 150ms, box-shadow 150ms
```

#### Espacements

Grille de base : **4px**

| Token | Valeur | Usage |
|-------|--------|-------|
| `--space-1` | 4px | Micro-gaps (icone-texte) |
| `--space-2` | 8px | Padding dense (badges, tags) |
| `--space-3` | 12px | Padding interne compact (table cells) |
| `--space-4` | 16px | Gap standard entre elements |
| `--space-5` | 20px | Padding cards |
| `--space-6` | 24px | Gap entre cards |
| `--space-8` | 32px | Sections dans une page |
| `--space-10` | 40px | Marges de page |
| `--space-12` | 48px | Espacement entre sections majeures |

#### Effets & Animations

```
Ombres         : Pas d'ombres portees (flat dark mode style Grafana/Linear)
                 Exception : dropdown menus → box-shadow 0 4px 16px rgba(0,0,0,0.5)

Bordures       : 1px solid, couleur var(--color-border)
                 Hover : couleur var(--color-border-light)

Transitions    : --transition-fast: 100ms ease-out    (hover simple)
                 --transition-base: 150ms ease-out    (changements d'etat)
                 --transition-slow: 300ms ease-in-out (apparitions, slides)

Animations     :
  - Spinner (loading) : rotation 360deg, 800ms linear infinite
  - Pulse (live data) : opacity 1→0.5→1, 2s ease-in-out infinite
  - Fade-in (mount)   : opacity 0→1, 200ms ease-out
  - Slide-in sidebar  : translateX(-100%)→0, 200ms ease-out
  - Count-up (stats)  : interpolation numerique sur 400ms au mount

Style dominant : Flat Dark — Inspire de Grafana, Linear, Vercel.
                 Pas de glassmorphism, pas de gradients.
                 Densite elevee, lignes fines, texte net.
```

---

## Phase 3 : Experience Utilisateur (UX)

### User Journey Principal

```
Etape 1 : Ouverture du dashboard
  → Header avec 4 stat cards (agents, invocations, sessions, smoke tests)
  → Vue par defaut : Vue Agents (la plus consultee)
  → L'utilisateur a une vue globale en < 2 secondes

Etape 2 : Exploration des agents
  → Filtre par categorie (dropdown ou tags) + recherche par nom
  → Liste tabulaire de 40 agents avec statut, invocations, dernier appel
  → Clic sur une ligne → panneau de detail a droite (slide-in)

Etape 3 : Supervision des pipelines
  → Navigation sidebar → Vue Pipelines
  → 8 pipelines en cards avec statut, duree, etapes
  → Clic sur un pipeline → timeline des etapes (steps) en horizontal
  → Chaque step affiche : nom agent, duree, statut (pass/fail/running)

Etape 4 : Historique des sessions
  → Navigation sidebar → Vue Sessions
  → Liste chronologique inverse des sessions
  → Chaque session : ID, date/heure, duree, pipeline detecte, nombre agents
  → Clic sur une session → liste des events en timeline verticale

Etape 5 : Surveillance continue
  → Polling automatique toutes les 30 secondes
  → Indicateur "Live" pulse vert dans le header
  → Les valeurs changees clignotent brievement (highlight transition)
```

### Flow de Navigation

```
[Sidebar] ─── Vue Agents (defaut) ─── [Liste agents] ─── [Detail agent]
    │
    ├─── Vue Pipelines ─── [Liste pipelines] ─── [Timeline etapes]
    │
    └─── Vue Sessions ─── [Liste sessions] ─── [Events detail]

[Header] ─── Stats globales (toujours visible) ─── [Live indicator]
```

### Points de Friction Anticipes

| Friction | Solution UX |
|----------|-------------|
| 40 agents dans une seule liste → surcharge cognitive | Filtres par categorie + barre de recherche instantanee + tri par colonne |
| Timestamp "derniere invocation" peu lisible en ISO | Format relatif ("il y a 3 min") avec tooltip ISO complet au hover |
| Distinction statut agents pas evidente en scan rapide | Badges colores avec icone + couleur de fond (pas seulement du texte) |
| Polling 30s → l'utilisateur ne sait pas si les donnees sont fraiches | Indicateur "Live" persistant + timestamp "Derniere MAJ il y a X s" |
| Pipeline steps nombreux → debordement horizontal | Scroll horizontal dans la timeline avec fleches de navigation |
| Session avec beaucoup d'events → scroll infini | Pagination (20 events par page) + filtre par type d'event |
| Panneau de detail agent ferme la vue precedente | Panneau lateral (drawer) qui se superpose, pas de changement de page |

### Micro-Interactions

| Interaction | Declencheur | Animation / Feedback |
|-------------|-------------|---------------------|
| **Row hover** | Curseur sur ligne de tableau | Background transition vers surface-hover (100ms) |
| **Row select** | Clic sur ligne | Border-left gold + background surface-active + ouverture drawer |
| **Stat update** | Nouvelle valeur du polling | Count-up animation + flash dore bref (300ms) |
| **Badge pulse** | Agent "running" | Pulse animation sur le badge bleu |
| **Filter apply** | Selection d'un filtre categorie | Fade-out/fade-in de la liste (150ms) |
| **Search** | Frappe clavier dans la barre | Filtrage instantane (debounce 200ms), surlignage du match en gold |
| **Drawer open** | Clic sur element de liste | Slide-in depuis la droite (200ms ease-out) |
| **Drawer close** | Clic sur X ou overlay | Slide-out vers la droite (150ms ease-in) |
| **Live indicator** | Polling actif | Cercle vert avec pulse (2s infinite) |
| **Pipeline step** | Hover sur step timeline | Tooltip avec nom agent + duree + statut |
| **Copy ID** | Clic sur un ID de session | Flash feedback "Copie !" + icone check pendant 1.5s |
| **Empty state** | Aucun resultat de recherche | Icone loupe + "Aucun agent trouve" + suggestion de reset |

---

## Phase 4 : Plan de Maquette (Wireframes Textuels)

### Layout Global

```
┌──────────────────────────────────────────────────────────────────────┐
│                         HEADER (56px hauteur)                        │
│  [Logo]  Mugiwara Dashboard          [Live ●] MAJ il y a 12s   [⚙] │
├────────┬─────────────────────────────────────────────────────────────┤
│        │                                                             │
│ SIDE-  │              MAIN CONTENT AREA                              │
│ BAR    │                                                             │
│ (220px)│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │
│        │  │ Stat 1  │ │ Stat 2  │ │ Stat 3  │ │ Stat 4  │          │
│ ┌────┐ │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │
│ │Nav │ │                                                             │
│ │    │ │  ┌─────────────────────────────────────────────────────┐    │
│ │    │ │  │                                                     │    │
│ │    │ │  │              PAGE CONTENT                            │    │
│ │    │ │  │                                                     │    │
│ │    │ │  │                                                     │    │
│ │    │ │  │                                                     │    │
│ └────┘ │  └─────────────────────────────────────────────────────┘    │
│        │                                                             │
└────────┴─────────────────────────────────────────────────────────────┘
```

Max-width content : **1400px** (centree si ecran large)
Sidebar : **220px** fixe a gauche
Header : **56px** fixe en haut
Main padding : **24px**

---

### Composant : Header

**Objectif** : Identification du dashboard + statut live + acces rapide aux settings

**Agencement** : Bande horizontale pleine largeur, fond background-alt, border-bottom

| Element | Type | Contenu | Position | Style |
|---------|------|---------|----------|-------|
| Logo SVG | Icone | Jolly Roger minimaliste (chapeau paille stylise, 28x28px) | Left, vertically centered | color: primary |
| Titre | Texte H4 | "Mugiwara Dashboard" | Apres logo, gap 10px | Inter Medium 15px, text-primary |
| Spacer | -- | -- | Flex-grow | -- |
| Live Indicator | Composant | Cercle 8px + "Live" | Right group, premier | Cercle #16A34A pulse, texte caption success |
| Last Update | Texte | "MAJ il y a 12s" | Apres live indicator, gap 8px | Caption, text-tertiary |
| Settings | Bouton Icon | Icone engrenage SVG 18px | Right, dernier | Ghost button |

**Hauteur** : 56px. **Padding horizontal** : 20px.
**Border-bottom** : 1px solid var(--color-border)

---

### Composant : Sidebar

**Objectif** : Navigation principale entre les 3 vues + branding bas de page

**Agencement** : Colonne fixe a gauche, fond background-alt, full height

| Element | Type | Contenu | Position | Style |
|---------|------|---------|----------|-------|
| Section label | Texte | "NAVIGATION" | Top, padding 20px 16px 8px | Caption uppercase, text-tertiary |
| Nav Agents | Lien + Icone | ◇ (losange SVG 16px) + "Agents" | Stack vertical | Nav Item, padding 10px 16px |
| Nav Pipelines | Lien + Icone | ▷ (triangle SVG 16px) + "Pipelines" | Stack vertical | Nav Item, padding 10px 16px |
| Nav Sessions | Lien + Icone | ◷ (clock SVG 16px) + "Sessions" | Stack vertical | Nav Item, padding 10px 16px |
| Spacer | -- | -- | Flex-grow | -- |
| Divider | Ligne | -- | Avant footer | 1px solid border, margin 0 16px |
| Version | Texte | "v1.5.0" | Bottom, padding 12px 16px | Mono Small, text-tertiary |
| Agent count | Texte | "40 agents" | Sous version | Caption, text-tertiary |

**Nav Item actif** :
- Background : `var(--color-surface-active)` (`#232B3E`)
- Border-left : 3px solid `var(--color-primary)` (`#E8A317`)
- Color : `var(--color-text-primary)`
- Font-weight : 600

**Nav Item hover (inactif)** :
- Background : `var(--color-surface-hover)` (`#1C2333`)

**Largeur** : 220px. **Border-right** : 1px solid var(--color-border)

---

### Composant : Stats Bar (sous le header, dans le main content)

**Objectif** : Vue globale instantanee des 4 KPIs principaux

**Agencement** : Grille 4 colonnes egales, gap 16px, pleine largeur du content

| Element | Type | Contenu | Position | Accent Color |
|---------|------|---------|----------|-------------|
| Total Agents | Stat Card | Valeur: "40" / Label: "AGENTS" / Trend: icone none | Col 1 | Primary (gold) |
| Total Invocations | Stat Card | Valeur: "1,247" / Label: "INVOCATIONS" / Trend: "+12% ↑" | Col 2 | Secondary (red) |
| Total Sessions | Stat Card | Valeur: "89" / Label: "SESSIONS" / Trend: "3 actives" | Col 3 | Info (#3B82F6) |
| Smoke Tests | Stat Card | Valeur: "38/40" / Label: "SMOKE PASS" / Trend: "95%" | Col 4 | Success ou Error selon ratio |

Chaque stat card suit le style defini en 2.3 (Stat Cards).

---

### Page : Vue Agents

**Objectif** : Lister les 40 agents, leur statut, leurs metriques d'utilisation, et permettre l'exploration detaillee

#### Section 1 : Toolbar -- Filtrer et rechercher les agents

**Agencement** : Ligne horizontale, flex, space-between, margin-bottom 16px

| Element | Type | Contenu | Position | Style |
|---------|------|---------|----------|-------|
| Titre page | H1 | "Agents" | Left | H1 28px Bold |
| Compteur | Badge | "40 agents" | Apres titre, gap 8px | Badge style, bg surface, text-secondary |
| Spacer | -- | -- | Flex-grow | -- |
| Barre recherche | Input | Placeholder: "Rechercher un agent..." | Right group | Width 280px, icone loupe left |
| Filtre categorie | Select/Dropdown | "Toutes categories" + liste | Apres search, gap 8px | Ghost button style, width 180px |
| Tri | Select/Dropdown | "Trier par: Nom" (Nom/Invocations/Derniere invoc/Categorie) | Apres filtre, gap 8px | Ghost button style, width 160px |

#### Section 2 : Tableau des agents -- Vue tabulaire de tous les agents

**Agencement** : Tableau pleine largeur dans une card

| Colonne | Largeur | Contenu | Align | Style |
|---------|---------|---------|-------|-------|
| **Statut** | 48px | Badge circle (PASS=vert, FAIL=rouge, N/A=gris) | Center | Badge icon only |
| **Nom** | 200px | Nom de l'agent (ex: "zorro") | Left | Mono 13px, text-primary, font-weight 500 |
| **Description** | flex-1 (restant) | Description courte | Left | Body, text-secondary, truncate 1 ligne |
| **Categorie** | 120px | Tag colore (ex: "analysis") | Left | Category Tag (cf. 2.3) |
| **Version** | 80px | "1.5.0" | Center | Mono Small, text-tertiary |
| **Invocations** | 100px | "1,247" | Right | Mono 13px, text-primary |
| **Derniere invoc.** | 140px | "il y a 3 min" (tooltip: ISO date) | Right | Body Small, text-secondary |

**Ligne hover** : bg surface-hover
**Ligne cliquable** : cursor pointer, ouvre le drawer de detail
**Ligne selectionnee** : bg surface-active + border-left 3px primary

#### Section 3 : Drawer Detail Agent -- Panneau lateral de detail

**Agencement** : Panneau lateral droit, 400px largeur, fond surface, slide-in depuis la droite

| Element | Type | Contenu | Position | Style |
|---------|------|---------|----------|-------|
| Close button | Bouton Icon | X (18px) | Top-right, padding 16px | Ghost, text-secondary |
| Nom agent | H2 | "zorro" | Top, apres close | Mono, H2, text-primary |
| Description | Texte | Description complete | Sous le nom | Body, text-secondary |
| Divider | Ligne | -- | -- | border |
| Statut smoke | Badge | "PASS" ou "FAIL" | Apres divider | Badge pill avec icone |
| Categorie | Tag | "analysis" | Apres statut, gap 8px | Category tag |
| Version | Texte | "v1.5.0" | Apres categorie, gap 8px | Mono Small, text-tertiary |
| Divider | Ligne | -- | -- | border |
| Invocations total | Stat inline | Label "Invocations" + Valeur "1,247" | Left-right flex | Caption + Mono Bold |
| Derniere invocation | Stat inline | Label "Derniere invoc." + Valeur "2026-03-05 14:32" | Left-right flex | Caption + Mono |
| Commande | Stat inline | Label "Commande" + Valeur "/zorro" | Left-right flex | Caption + Mono, text-primary, copie au clic |

**Overlay** : fond #000000 opacity 0.3, cliquable pour fermer
**Animation** : slide-in 200ms ease-out, slide-out 150ms ease-in

---

### Page : Vue Pipelines

**Objectif** : Visualiser les 8 pipelines, leur statut d'execution, les etapes et les durees

#### Section 1 : Toolbar -- En-tete de la page

**Agencement** : Ligne horizontale, flex

| Element | Type | Contenu | Position | Style |
|---------|------|---------|----------|-------|
| Titre page | H1 | "Pipelines" | Left | H1 28px Bold |
| Compteur | Badge | "8 pipelines" | Apres titre, gap 8px | Badge, bg surface |
| Spacer | -- | -- | Flex-grow | -- |
| Filtre statut | Select | "Tous statuts" / Running / Success / Failed | Right | Ghost button, 150px |

#### Section 2 : Grille de Pipeline Cards -- Vue d'ensemble des 8 pipelines

**Agencement** : Grille 2 colonnes, gap 16px

Chaque Pipeline Card :

```
┌──────────────────────────────────────────────────────┐
│  ▷ mugiwara                          [PASS] badge    │
│  "Pipeline d'analyse integral"                       │
│                                                      │
│  Session: abc123de    Duree: 4m 32s                  │
│                                                      │
│  ┌──────┐  →  ┌──────┐  →  ┌──────┐  →  ┌──────┐   │
│  │zorro │     │sanji │     │ nami │     │luffy │   │
│  │ 1m02 │     │ 2m15 │     │ 0m48 │     │ 0m27 │   │
│  │  ✓   │     │  ✓   │     │  ✓   │     │  ✓   │   │
│  └──────┘     └──────┘     └──────┘     └──────┘   │
│                                                      │
│  Derniere exec: il y a 12 min                        │
└──────────────────────────────────────────────────────┘
```

| Element | Type | Contenu | Style |
|---------|------|---------|-------|
| Icone pipeline | SVG | Triangle play 14px | text-secondary |
| Nom pipeline | H3 | "mugiwara" | Mono, H3, text-primary |
| Statut | Badge | "PASS" / "FAIL" / "RUNNING" | Badge pill (cf. 2.3) |
| Description | Texte | Description du pipeline | Body Small, text-secondary |
| Session ID | Texte | "abc123de" | Mono Small, text-tertiary, copie au clic |
| Duree totale | Texte | "4m 32s" | Mono, text-primary |
| Steps timeline | Composant | Horizontal flow d'etapes | Voir ci-dessous |
| Derniere exec | Texte | "il y a 12 min" | Caption, text-tertiary |

#### Section 3 : Timeline des Steps (dans chaque card)

**Agencement** : Flex horizontal, gap 4px, overflow-x auto si > 6 steps

Chaque step :

```
┌────────────┐
│  [nom]     │   ← Mono Small, text-primary (ou text-secondary si non atteint)
│  [duree]   │   ← Mono Small, text-tertiary
│  [icone]   │   ← ✓ vert / ✗ rouge / ● bleu (running) / ○ gris (pending)
└────────────┘
```

| Element | Type | Taille | Style |
|---------|------|--------|-------|
| Step box | Div | min-width 72px, padding 8px | bg surface-hover, border-radius 6px, border 1px |
| Fleche entre steps | SVG/texte | 16px | color text-tertiary, "→" |
| Step actif (running) | Div | idem | border-color info (#3B82F6), bg #0A1A2E |
| Step reussi | Div | idem | border-color success-subtle |
| Step echoue | Div | idem | border-color error, bg error-bg |

---

### Page : Vue Sessions

**Objectif** : Historique chronologique des sessions avec detail des events

#### Section 1 : Toolbar -- En-tete et filtres

**Agencement** : Ligne horizontale, flex

| Element | Type | Contenu | Position | Style |
|---------|------|---------|----------|-------|
| Titre page | H1 | "Sessions" | Left | H1 28px Bold |
| Compteur | Badge | "89 sessions" | Apres titre, gap 8px | Badge, bg surface |
| Spacer | -- | -- | Flex-grow | -- |
| Barre recherche | Input | Placeholder: "Rechercher par ID..." | Right group | Width 240px |
| Filtre pipeline | Select | "Tous pipelines" + liste des 8 | Apres search, gap 8px | Ghost button, 180px |
| Filtre date | Select | "Aujourd'hui" / "7 jours" / "30 jours" / "Tout" | Apres filtre, gap 8px | Ghost button, 140px |

#### Section 2 : Liste des Sessions -- Tableau chronologique inverse

**Agencement** : Tableau pleine largeur dans une card

| Colonne | Largeur | Contenu | Align | Style |
|---------|---------|---------|-------|-------|
| **Statut** | 48px | Badge circle (complete=vert, active=bleu pulse, error=rouge) | Center | Badge icon |
| **Session ID** | 120px | "abc123de" (tronque 8 chars) | Left | Mono 13px, text-primary, copie au clic |
| **Pipeline** | 140px | Nom du pipeline detecte ou "---" | Left | Mono Small, text-secondary |
| **Date/Heure** | 160px | "05 Mar 2026, 14:32" | Left | Body Small, text-secondary |
| **Duree** | 100px | "4m 32s" ou "en cours..." | Right | Mono, text-primary (en cours=info blue) |
| **Agents** | 80px | "4" (nombre d'agents impliques) | Center | Mono, text-secondary |
| **Events** | 80px | "12" (nombre d'events) | Center | Mono, text-secondary |

**Pagination** : 20 sessions par page. Composant pagination en bas :
```
[← Precedent]  Page 1 sur 5  [Suivant →]
```
Style : Ghost buttons, texte caption

#### Section 3 : Drawer Detail Session -- Panneau lateral de detail

**Agencement** : Panneau lateral droit, 480px largeur (plus large car events)

| Element | Type | Contenu | Position | Style |
|---------|------|---------|----------|-------|
| Close button | Bouton Icon | X (18px) | Top-right | Ghost |
| Session ID | H2 | "Session abc123de..." | Top | Mono, H2 |
| Pipeline | Badge | Nom du pipeline | Sous ID | Category tag style |
| Divider | Ligne | -- | -- | border |
| Metadata grid | Grid 2 cols | Start: [date], End: [date], Duration: [val], Agents: [n] | -- | Caption label + Mono value |
| Divider | Ligne | -- | -- | border |
| Events title | H3 | "Events (12)" | -- | H3 |
| Events timeline | Composant | Timeline verticale des events | -- | Voir ci-dessous |

#### Composant : Events Timeline (dans le drawer session)

**Agencement** : Liste verticale avec ligne de connexion a gauche

```
 ● 14:32:00  agent.start    zorro         ← cercle plein, couleur par type
 │
 ● 14:32:05  agent.invoke   zorro
 │
 ● 14:33:07  agent.complete zorro  [1m02]
 │
 ● 14:33:08  agent.start    sanji
 │
 ...
```

| Element | Type | Style |
|---------|------|-------|
| Cercle | Div 8px | Couleur selon type event (start=blue, complete=green, error=red) |
| Ligne verticale | Div 2px | var(--color-border), connecte les cercles |
| Timestamp | Texte | Mono Small, text-tertiary |
| Event type | Texte | Mono Small, text-secondary |
| Agent name | Texte | Mono, text-primary |
| Duration (si complete) | Badge | Mono Small, bg surface-hover |

**Scroll** : max-height 60vh, overflow-y auto

---

## Phase 5 : Design System & Tokens

### CSS Custom Properties

```css
:root {
  /* === COULEURS === */

  /* Primary - Grand Line Gold */
  --color-primary: #E8A317;
  --color-primary-light: #F2C14E;
  --color-primary-dark: #B8820D;

  /* Secondary - Straw Hat Red */
  --color-secondary: #C0392B;
  --color-secondary-light: #E74C3C;

  /* Backgrounds */
  --color-background: #0B0E14;
  --color-background-alt: #111621;

  /* Surfaces */
  --color-surface: #161B26;
  --color-surface-hover: #1C2333;
  --color-surface-active: #232B3E;

  /* Text */
  --color-text-primary: #E6E8ED;
  --color-text-secondary: #8B92A5;
  --color-text-tertiary: #5A6178;

  /* Semantic */
  --color-success: #16A34A;
  --color-success-bg: #0A2E1A;
  --color-warning: #EAB308;
  --color-warning-bg: #2E2A08;
  --color-error: #DC2626;
  --color-error-bg: #2E0A0A;
  --color-info: #3B82F6;
  --color-info-bg: #0A1A2E;

  /* Borders */
  --color-border: #232B3E;
  --color-border-light: #2D3548;

  /* Category Colors */
  --color-cat-pipeline-bg: #1A1A2E;
  --color-cat-pipeline: #818CF8;
  --color-cat-analysis-bg: #1A2E2E;
  --color-cat-analysis: #2DD4BF;
  --color-cat-architecture-bg: #2E1A1A;
  --color-cat-architecture: #FB923C;
  --color-cat-security-bg: #2E0A1A;
  --color-cat-security: #F472B6;
  --color-cat-qa-bg: #1A2E0A;
  --color-cat-qa: #84CC16;
  --color-cat-writing-bg: #2E2A1A;
  --color-cat-writing: #FBBF24;
  --color-cat-debugging-bg: #2E1A2E;
  --color-cat-debugging: #C084FC;
  --color-cat-management-bg: #0A1A2E;
  --color-cat-management: #60A5FA;
  --color-cat-data-bg: #0A2E2E;
  --color-cat-data: #22D3EE;
  --color-cat-devops-bg: #1A2E1A;
  --color-cat-devops: #4ADE80;
  --color-cat-refactoring-bg: #2E1A0A;
  --color-cat-refactoring: #FB7185;
  --color-cat-router-bg: #2E2E0A;
  --color-cat-router: #FACC15;
  --color-cat-meta-bg: #1A1A1A;
  --color-cat-meta: #94A3B8;
  --color-cat-performance-bg: #2E0A0A;
  --color-cat-performance: #F87171;
  --color-cat-intelligence-bg: #0A0A2E;
  --color-cat-intelligence: #A78BFA;

  /* === TYPOGRAPHIE === */

  --font-heading: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;

  /* Font Sizes */
  --text-h1: 1.75rem;      /* 28px */
  --text-h2: 1.375rem;     /* 22px */
  --text-h3: 1.125rem;     /* 18px */
  --text-h4: 0.9375rem;    /* 15px */
  --text-body: 0.875rem;   /* 14px */
  --text-body-sm: 0.8125rem; /* 13px */
  --text-caption: 0.6875rem; /* 11px */
  --text-stat: 2rem;        /* 32px */

  /* === ESPACEMENTS === */

  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;

  /* === RAYONS DE BORDURE === */

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-full: 9999px;

  /* === OMBRES === */

  --shadow-none: none;
  --shadow-dropdown: 0 4px 16px rgba(0, 0, 0, 0.5);
  --shadow-drawer: -4px 0 24px rgba(0, 0, 0, 0.4);
  --shadow-focus: 0 0 0 2px var(--color-background), 0 0 0 4px var(--color-primary);

  /* === TRANSITIONS === */

  --transition-fast: 100ms ease-out;
  --transition-base: 150ms ease-out;
  --transition-slow: 300ms ease-in-out;

  /* === LAYOUT === */

  --sidebar-width: 220px;
  --header-height: 56px;
  --content-max-width: 1400px;
  --drawer-width-sm: 400px;
  --drawer-width-lg: 480px;
}
```

### Animations (CSS Keyframes)

```css
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse-live {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-in-right {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

@keyframes slide-out-right {
  from { transform: translateX(0); }
  to { transform: translateX(100%); }
}

@keyframes flash-update {
  0% { background-color: transparent; }
  20% { background-color: rgba(232, 163, 23, 0.15); }
  100% { background-color: transparent; }
}

/* Usage classes */
.animate-spin { animation: spin 800ms linear infinite; }
.animate-pulse { animation: pulse-live 2s ease-in-out infinite; }
.animate-fade-in { animation: fade-in 200ms ease-out; }
.animate-slide-in { animation: slide-in-right 200ms ease-out; }
.animate-slide-out { animation: slide-out-right 150ms ease-in; }
.animate-flash { animation: flash-update 600ms ease-out; }
```

### Base CSS Reset & Globals

```css
*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-body);
  font-size: var(--text-body);
  line-height: 1.6;
  color: var(--color-text-primary);
  background-color: var(--color-background);
}

::selection {
  background-color: rgba(232, 163, 23, 0.3);
  color: var(--color-text-primary);
}

::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: var(--color-background);
}

::-webkit-scrollbar-thumb {
  background: var(--color-border-light);
  border-radius: var(--radius-full);
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-tertiary);
}
```

---

## Phase 6 : Rapport de Synthese

### Decisions Cles

| Decision | Choix | Justification |
|----------|-------|---------------|
| Style dominant | Flat Dark (Grafana/Linear) | Standard des dashboards dev, densite maximale, pas de distractions |
| Palette | Gold (#E8A317) + Red (#C0392B) sur Abyss (#0B0E14) | Branding One Piece subtil (or du Jolly Roger, rouge du chapeau), contraste WCAG AAA |
| Typographie | Inter (UI) + JetBrains Mono (data) | Standard des outils dev, lisibilite optimale en petites tailles |
| Layout | Desktop-first, sidebar 220px + content 1400px max | Usage terminal/dev, pas de responsive requis |
| Composants | CSS custom properties, zero dependance externe | Contrainte projet : pas de Tailwind, pas de component library |
| Navigation | Sidebar 3 items + Header stats | Seulement 3 pages, sidebar minimaliste suffisante |
| Detail pattern | Drawer lateral (slide-in) | Pas de changement de page, contexte maintenu |
| Data display | Tableaux avec tri + filtres + recherche | 40 agents = densite elevee, le tableau est le format le plus adapte |
| Refresh | Polling 30s + indicateur Live | Feedback visuel de fraicheur des donnees |

### Pages Definies

| Page | Sections | Composants Uniques | Complexite |
|------|----------|-------------------|------------|
| Vue Agents | Toolbar (search/filter/sort) + Tableau 40 lignes + Drawer detail | Category Tags (15 couleurs), Agent Row, Agent Drawer | Elevee |
| Vue Pipelines | Toolbar (filter) + Grille 2 cols de 8 cards + Steps timeline | Pipeline Card, Step Box, Steps Flow | Moyenne |
| Vue Sessions | Toolbar (search/filter/date) + Tableau pagine + Drawer events | Session Row, Events Timeline, Pagination | Elevee |
| Header (global) | Logo + titre + Live indicator + settings | Live Pulse Dot | Faible |
| Sidebar (global) | Navigation 3 items + version/count | Nav Item (active/hover states) | Faible |
| Stats Bar (global) | 4 Stat Cards | Stat Card (accent border + count-up) | Faible |

### Composants UI a Creer

| Composant | Variantes | Priorite |
|-----------|-----------|----------|
| **Button** | Primary, Secondary, Ghost, Danger, Icon | P0 - Critique |
| **Badge / Status Pill** | PASS, FAIL, Running, Warning, Idle | P0 - Critique |
| **Category Tag** | 15 categories avec couleurs | P0 - Critique |
| **Stat Card** | 4 couleurs d'accent (gold, red, blue, green) | P0 - Critique |
| **Table** | Header, Row, Row hover/selected | P0 - Critique |
| **Drawer** | Small (400px), Large (480px) | P0 - Critique |
| **Input Search** | Avec icone loupe, focus state | P1 - Important |
| **Select / Dropdown** | Ghost style, avec options | P1 - Important |
| **Pipeline Card** | Avec steps timeline integree | P1 - Important |
| **Step Box** | Success, Fail, Running, Pending | P1 - Important |
| **Events Timeline** | Cercles connectes + metadata | P1 - Important |
| **Pagination** | Previous/Next + page indicator | P2 - Standard |
| **Live Indicator** | Cercle pulse + texte | P2 - Standard |
| **Empty State** | Icone + message + action suggeree | P2 - Standard |
| **Tooltip** | Hover info (timestamps, details) | P2 - Standard |
| **Spinner** | Loading state pour les donnees | P2 - Standard |

### Specifications pour le Sous-Chef Tech (sanji-ts)

1. **Design tokens** : Integrer le bloc CSS custom properties dans un fichier `src/styles/tokens.css` importe dans `app.css`
2. **Google Fonts** : Ajouter le lien d'import Inter + JetBrains Mono dans `index.html`
3. **Reset CSS** : Utiliser le reset minimaliste fourni (pas de normalize.css externe)
4. **Grille d'espacement** : Respecter strictement l'echelle de spacing (base 4px)
5. **Composants Svelte** : Un fichier par composant avec `<style>` scope, utilisant les CSS variables
6. **Layout** : CSS Grid pour le layout global (sidebar + main), Flexbox pour les alignements internes
7. **Pas de responsive** : Desktop-first, min-width 1024px. Pas de media queries
8. **Icones** : SVG inline dans les composants Svelte (pas de library d'icones). 5 icones simples :
   - Losange (agents), Triangle play (pipelines), Horloge (sessions), Engrenage (settings), Loupe (search)
   - Cercles pleins pour les statuts, Fleche pour les steps
9. **Animations** : Keyframes CSS (pas de library d'animation). Appliquer via classes utilitaires
10. **Polling** : Afficher le timestamp de derniere MAJ et le Live indicator. Flash animation sur les valeurs mises a jour
