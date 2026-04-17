# Token Limits Dashboard — Jauges de consommation & seuils d'alerte

**Date:** 2026-04-17
**Status:** Approved
**Approach:** Nouvel onglet "Limites" avec auto-refresh 60s, jauges circulaires D3 + barres horizontales

---

## Problem

Le dashboard tokens affiche la consommation passée (coûts, tokens, sessions) mais ne permet pas de visualiser en temps réel où l'on se situe par rapport aux limites de son plan Claude Code (fenêtre 5h, semaine). L'utilisateur ne peut pas anticiper quand il va atteindre sa limite, ni se fixer des seuils personnels pour optimiser ses coûts.

## Solution

### 1. Modèle de données (`tokens/models.py`)

Nouveau modèle singleton `TokenLimit` :

```python
class TokenLimit(models.Model):
    plan_name = models.CharField(max_length=50, default="Pro Team")
    limit_5h_tokens = models.BigIntegerField(default=0)
    limit_weekly_tokens = models.BigIntegerField(default=0)
    alert_5h_tokens = models.BigIntegerField(null=True, blank=True)
    alert_weekly_tokens = models.BigIntegerField(null=True, blank=True)
    alert_5h_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    alert_weekly_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Token Limit Configuration"

    def save(self, *args, **kwargs):
        self.pk = 1  # Singleton pattern
        super().save(*args, **kwargs)
```

- Singleton : une seule ligne en base, pk=1 forcé
- Limites officielles à 0 par défaut (l'utilisateur renseigne ses valeurs observées)
- Seuils perso nullable (non affichés si non configurés)

Migration : `CreateModel` standard.

### 2. Settings par défaut (`config/settings.py`)

```python
TOKEN_LIMITS_DEFAULTS = {
    "plan_name": "Pro Team",
    "limit_5h_tokens": 0,
    "limit_weekly_tokens": 0,
    "alert_5h_tokens": None,
    "alert_weekly_tokens": None,
    "alert_5h_cost": None,
    "alert_weekly_cost": None,
}
```

Utilisé à la création initiale du singleton (premier accès ou migration).

### 3. Routes (`tokens/urls.py`)

Deux nouvelles routes :

| Route | Méthode | Vue | Description |
|---|---|---|---|
| `limits/` | GET | `tab_limits()` | Partial HTMX de l'onglet Limites |
| `limits/config/` | POST | `update_limits_config()` | Sauvegarde de la config |

### 4. Vues (`tokens/views.py`)

**`tab_limits(request)`** :
- Récupère ou crée le singleton `TokenLimit` (avec defaults depuis settings)
- Identifie la session active : dernière `session_id` ayant un message dans les 5 dernières heures
- Agrège les tokens de cette session depuis son premier message
- Agrège les tokens de la semaine ISO en cours (lundi 00:00 → maintenant)
- Calcule les coûts via `pricing.py`
- Calcule les pourcentages et niveaux d'alerte (vert < 70%, orange 70-90%, rouge > 90%)
- Retourne le partial `_tab_limits.html`

**`update_limits_config(request)`** :
- POST uniquement
- Met à jour le singleton `TokenLimit` avec les valeurs du formulaire
- Retourne le partial complet `_tab_limits.html` (refresh après sauvegarde)

### 5. Template principal (`tokens/templates/tokens/index.html`)

Ajouter le 4ème onglet dans la barre de navigation :

```html
<button hx-get="{% url 'tokens:tab_limits' %}" hx-target="#tab-content">
    Limites
</button>
```

### 6. Template partial (`tokens/templates/tokens/partials/_tab_limits.html`)

Le conteneur principal a `hx-trigger="every 60s"` pour l'auto-refresh.

**Structure :**

```
┌─────────────────────────────────────────────────────┐
│  Jauges officielles                                 │
│  ┌──────────────┐          ┌──────────────┐         │
│  │   ◕  72%     │          │   ◕  45%     │         │
│  │  Session 5h  │          │   Semaine    │         │
│  │ 180K / 250K  │          │ 1.2M / 2.7M │         │
│  │ depuis 14:32 │          │ lun. → dim.  │         │
│  └──────────────┘          └──────────────┘         │
│                                                     │
│  Seuils personnels                                  │
│  Session 5h  ████████████░░░░  150K / 200K tokens   │
│  Session 5h  ████████░░░░░░░░  $1.20 / $2.00       │
│  Semaine     ██████░░░░░░░░░░  800K / 2.0M tokens   │
│  Semaine     █████░░░░░░░░░░░  $8.50 / $15.00      │
│                                                     │
│  ─── Configuration ──────────────────────────       │
│  Plan: [Pro Team    ▾]                              │
│  Limite 5h:     [250000    ] tokens                 │
│  Limite semaine: [2700000   ] tokens                │
│  Alerte 5h:     [200000    ] tokens  [$2.00  ]      │
│  Alerte semaine: [2000000   ] tokens  [$15.00 ]     │
│                        [Enregistrer]                │
└─────────────────────────────────────────────────────┘
```

**Comportement conditionnel :**
- Si les limites officielles sont à 0 : les jauges circulaires affichent un message invitant à configurer les limites
- Si les seuils perso sont null : les barres horizontales correspondantes sont masquées
- Texte d'aide dans la section config : "Les limites varient selon votre plan et le modèle utilisé. Renseignez les valeurs observées dans votre usage Claude Code."

### 7. Visualisation D3 (`static/js/charts.js`)

**Nouveau composant `MugiCharts.Gauge` :**
- Arc SVG de 270° (ouvert en bas, style demi-circulaire)
- Fond gris `#2a2a3e`, remplissage coloré selon le seuil :
  - Vert (`#22c55e`) : < 70%
  - Orange (`#f59e0b`) : 70-90%
  - Rouge (`#ef4444`) : > 90%
- Pourcentage en gros au centre (texte blanc)
- Sous-texte : "180K / 250K tokens"
- Annotation : "depuis 14:32" ou "lun. → dim."
- Transition animée (`d3.transition().duration(800)`) au chargement et refresh

**Barres horizontales :**
- Pas de nouveau composant D3 — CSS pur avec `div` imbriquées
- Fond gris, remplissage coloré (même palette vert/orange/rouge)
- Cohérent avec le style existant du dashboard

**Intégration HTMX :**
- Les jauges D3 se ré-initialisent après chaque `htmx:afterSwap` (pattern existant dans `charts.js`)
- L'auto-refresh `every 60s` déclenche un swap → redraw des jauges

### 8. Calcul de la consommation

**Session 5h :**
- Requête : `TokenUsage.objects.filter(session_id=<active_session>)` où la session active = dernière session avec un message < 5h
- Agrégation : `Sum('input_tokens') + Sum('output_tokens') + Sum('cache_creation_tokens') + Sum('cache_read_tokens')`
- Début de session = `Min('timestamp')` de cette session
- Coût = `Sum('cost')`

**Semaine :**
- Fenêtre : lundi 00:00 de la semaine ISO en cours → maintenant
- Requête : `TokenUsage.objects.filter(timestamp__gte=<monday_00>)`
- Mêmes agrégations

**Niveaux d'alerte (3 couleurs) :**
- Vert : < 70% de la limite
- Orange : 70-90% de la limite
- Rouge : > 90% de la limite

Pour les seuils perso : même logique mais basée sur le seuil personnalisé. Si un seuil perso est défini ET la limite officielle aussi, les deux indicateurs sont visibles.

## Fichiers impactés

| Fichier | Action |
|---|---|
| `tokens/models.py` | Ajouter modèle `TokenLimit` |
| `tokens/migrations/0003_tokenlimit.py` | Nouvelle migration |
| `config/settings.py` | Ajouter `TOKEN_LIMITS_DEFAULTS` |
| `tokens/urls.py` | Ajouter 2 routes (`limits/`, `limits/config/`) |
| `tokens/views.py` | Ajouter 2 vues (`tab_limits`, `update_limits_config`) |
| `tokens/templates/tokens/index.html` | Ajouter le 4ème onglet |
| `tokens/templates/tokens/partials/_tab_limits.html` | Nouveau partial |
| `static/js/charts.js` | Ajouter `MugiCharts.Gauge` |

## Hors scope

- Notifications push quand un seuil est atteint (future feature)
- Support multi-plans simultanés
- Historique des limites dans le temps
- Prédiction de consommation restante
