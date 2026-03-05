# Design Specifications -- Mugiwara Dashboard

> Galley-La Design System v2.0 -- ONE PIECE MANGA EDITION
> Projet : mugiwara-dashboard
> Date : 2026-03-05
> Stack : Svelte 4 + Vite 5 (frontend) / Express 4 + TypeScript (backend)

---

## Phase 1 : Brief Creatif

| Dimension | Detail |
|-----------|--------|
| Industrie | DevTools / Monitoring technique interne |
| Cible | Developpeurs senior, DevOps, Tech Leads -- profil technique avance, fans de One Piece |
| Objectif | Dashboard de monitoring avec une identite visuelle manga One Piece assumee |
| Ton | Manga/aventurier, energique mais lisible -- l'esprit de Luffy dans un dashboard tech |
| Devices | Desktop-first (usage terminal/dev). Responsive optionnel |
| References | Manga UI trends, Neubrutalism (ombres offset), Jump comics color spreads, Oda's color art |

### Analyse du Contexte

Le Mugiwara Dashboard v2.0 pousse le branding One Piece au-dela du subtil. L'objectif est de creer une experience visuelle qui evoque immediatement l'univers manga :
- **Palette chaude** inspiree des color spreads d'Eiichiro Oda (rouge chapeau de paille, or du tresor, bleu ocean)
- **Typographie manga** avec la police Bangers pour les titres (evoque les onomatopees et titres de chapitres)
- **Ombres offset** style neubrutalism/manga (comme les bulles de dialogue et effets sonores)
- **Bordures epaisses** qui rappellent les cases de manga
- **Elements decoratifs** : barres d'accent colorees, lignes de vitesse subtiles, nomenclature pirate

Le dashboard reste parfaitement fonctionnel et lisible -- l'esthetique manga enrichit l'experience sans compromettre l'ergonomie.

---

## Phase 2 : Direction Artistique

### 2.1 Palette de Couleurs -- Dark Mode Manga

La palette est construite sur un fond dark slate moderne avec des accents vibrants.

| Role | Nom | HEX | Usage |
|------|-----|-----|-------|
| **Primary** | Straw Hat Red | `#E63946` | CTA, accents principaux, selections, bordures actives |
| **Primary Light** | Light Red | `#FF5C6A` | Hover primary, emphase |
| **Primary Dark** | Deep Red | `#B81C2A` | Active states, pressed |
| **Secondary** | Ocean Blue | `#38BDF8` | Accents secondaires, noms d'agents, labels de colonnes |
| **Secondary Light** | Light Blue | `#7DD3FC` | Hover secondary, highlights |
| **Accent** | Log Pose Orange | `#FB923C` | Info, liens, sessions |
| **Accent Light** | Light Orange | `#FDBA74` | Hover accent |
| **Background** | Dark Slate | `#0F1117` | Fond principal |
| **Background Alt** | Deep Slate | `#161821` | Fond sidebar, zones contrastees |
| **Surface** | Dark Surface | `#1C1E2B` | Cards, panels, modals |
| **Surface Hover** | Hover Surface | `#252836` | Hover sur cards, lignes de tableau |
| **Surface Active** | Active Surface | `#2D3041` | Element selectionne |
| **Text Primary** | Light Gray | `#E8ECF4` | Titres, corps de texte |
| **Text Secondary** | Mid Gray | `#9CA3B8` | Labels, metadata |
| **Text Tertiary** | Muted Gray | `#5C6378` | Texte desactive, timestamps |
| **Success** | Emerald | `#34D399` | PASS, agent actif |
| **Error** | Coral Red | `#F87171` | FAIL, erreurs |
| **Warning** | Amber | `#FBBF24` | Alertes, attention |
| **Info** | Sky Blue | `#60A5FA` | Info, running |
| **Border** | Subtle Border | `#2A2D3A` | Bordures standard (2px) |
| **Border Strong** | Strong Border | `#4A4F64` | Bordures epaisses d'accentuation |

### 2.2 Typographie

| Role | Police | Poids | Taille | Usage |
|------|--------|-------|--------|-------|
| H1 (Page titles) | Bangers | Regular | 32px / 2rem | Titres manga des pages |
| H2 (Drawer titles) | Bangers | Regular | 22px / 1.375rem | Titres des drawers |
| H3 (Card titles) | Bangers | Regular | 18px / 1.125rem | Noms de pipelines, sections |
| Nav Labels | Bangers | Regular | 13px | Labels de navigation |
| Stat Labels | Bangers | Regular | 14px | Labels des stat cards |
| Body | Inter | Regular (400) | 14px / 0.875rem | Corps de texte |
| Caption | Inter | Bold (700) | 11px | Labels, metadata |
| Mono | JetBrains Mono | Regular (400) | 13px | IDs, valeurs, durees |
| Badge | Inter | Bold (700) | 11px | Status badges |

```
Import Google Fonts :
https://fonts.googleapis.com/css2?family=Bangers&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap
```

### 2.3 Style UI -- Manga Edition

#### Ombres (Manga-style offset)

```
--shadow-sm: 2px 2px 0px rgba(0, 0, 0, 0.5)     /* Elements legers */
--shadow-md: 3px 3px 0px rgba(0, 0, 0, 0.6)      /* Cards, tableaux */
--shadow-lg: 5px 5px 0px rgba(0, 0, 0, 0.5)       /* Hover elevate */
--shadow-xl: 6px 6px 0px rgba(0, 0, 0, 0.6)       /* Drawers */
--shadow-glow-red: 0 0 20px rgba(230, 57, 70, 0.3) /* Glow primary */
--shadow-glow-blue: 0 0 20px rgba(56, 189, 248, 0.3) /* Glow secondary */
```

#### Bordures

Bordures **2px** par defaut (vs 1px avant) -- style manga/BD avec des cases bien definies.
Bordures **3px** pour les elements structurels (sidebar, header, drawer border-left).
Couleur accent `--color-border-strong` (#4A4F64) pour les separateurs importants.

#### Cards

```
Background     : var(--color-surface)
Border         : 2px solid var(--color-border)
Border-radius  : 10px
Shadow         : var(--shadow-md)
Hover          : border-color var(--color-border-strong), translateY(-2px), shadow-lg
Accent bar     : 4px de hauteur en haut de la card, couleur contextuelle
```

#### Badges

```
Border-radius  : 6px (rectangulaire, pas pilule -- style manga)
Border         : 1px solid (couleur semi-transparente du variant)
Font-weight    : 700 (bold)
Letter-spacing : 0.06em
Shadow         : var(--shadow-sm)
```

#### Tables

```
Header row     : bg var(--color-bg-alt)
                 font : 11px Bold uppercase, color SECONDARY (#38BDF8)
                 border-bottom : 2px solid var(--color-border)
Body row       : bg transparent
                 border-bottom : 1px solid var(--color-border)
Row hover      : bg var(--color-surface-hover)
Row selected   : bg var(--color-surface-active) + border-left 4px solid PRIMARY
Table border   : 2px solid var(--color-border) + shadow-md
```

---

## Phase 3 : Identite Manga

### Labels de navigation

| Terme technique | Label UI |
|----------------|----------|
| Agents | Monitoring |
| Pipelines | Workflows |
| Sessions | Activity |
| Search placeholder | "Rechercher un nakama..." |
| Version footer | "Mugiwara Agents Dashboard" |

### Elements decoratifs

1. **Barres d'accent gradient** : lignes red-to-blue sous les titres et en haut des cards
2. **Sidebar brand icon** : icone chart dans un cercle rouge avec bordure
3. **Speed lines subtiles** : motif repeating-linear-gradient diagonal dans le body et le header
4. **Radial gradients** : lueurs rouge/bleu tres subtiles dans les coins du layout
5. **Floating animation** : l'icone brand flotte doucement (3s ease-in-out)

---

## Phase 5 : Design Tokens

### CSS Custom Properties

```css
:root {
  /* Primary - Straw Hat Red */
  --color-primary: #E63946;
  --color-primary-light: #FF5C6A;
  --color-primary-dark: #B81C2A;

  /* Secondary - Ocean Blue */
  --color-secondary: #38BDF8;
  --color-secondary-light: #7DD3FC;

  /* Accent - Log Pose Orange */
  --color-accent: #FB923C;
  --color-accent-light: #FDBA74;

  /* Backgrounds - Dark Slate */
  --color-bg: #0F1117;
  --color-bg-alt: #161821;
  --color-surface: #1C1E2B;
  --color-surface-hover: #252836;
  --color-surface-active: #2D3041;

  /* Text */
  --color-text-primary: #E8ECF4;
  --color-text-secondary: #9CA3B8;
  --color-text-tertiary: #5C6378;

  /* Semantic */
  --color-success: #34D399;
  --color-success-bg: #0D2E23;
  --color-error: #F87171;
  --color-error-bg: #2D1215;
  --color-warning: #FBBF24;
  --color-warning-bg: #2D2506;
  --color-info: #60A5FA;
  --color-info-bg: #0C1A33;

  /* Borders */
  --color-border: #2A2D3A;
  --color-border-light: #363A4A;
  --color-border-strong: #4A4F64;

  /* Typography */
  --font-manga: 'Bangers', 'Impact', cursive;
  --font-ui: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Shadows - Manga offset */
  --shadow-sm: 2px 2px 0px rgba(0, 0, 0, 0.5);
  --shadow-md: 3px 3px 0px rgba(0, 0, 0, 0.6);
  --shadow-lg: 5px 5px 0px rgba(0, 0, 0, 0.5);
  --shadow-xl: 6px 6px 0px rgba(0, 0, 0, 0.6);
}
```

---

## Phase 6 : Rapport de Synthese

### Decisions Cles

| Decision | Choix | Justification |
|----------|-------|---------------|
| Style dominant | Manga Dark / Neubrutalism-light | Ombres offset, bordures epaisses, couleurs vibrantes = esthetique manga |
| Palette | Red (#E63946) + Ocean Blue (#38BDF8) sur Dark Slate (#0F1117) | Rouge accent principal + bleu ocean secondaire sur fond sombre moderne |
| Typographie | Bangers (titres) + Inter (body) + JetBrains Mono (data) | Bangers evoque les onomatopees/titres de chapitre manga |
| Fond | Dark slate #0F1117 | Fond sombre moderne, neutre et professionnel |
| Bordures | 2-3px au lieu de 1px | Style BD/manga avec des cases bien definies |
| Ombres | Hard offset au lieu de blur | Reference directe aux bulles de dialogue et onomatopees manga |
| Nomenclature | Monitoring, Workflows, Activity | Labels neutres et professionnels |
| Decorations | Gradient accent bars, speed lines, brand icon | Enrichissement visuel sans surcharge |
