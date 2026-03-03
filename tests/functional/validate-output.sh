#!/bin/bash
# ============================================================
# Validateur generique d'output agent
# ============================================================
# Valide qu'un output d'agent respecte les criteres de qualite
# minimaux : non-vide, longueur suffisante, pas d'erreur.
#
# Usage:
#   echo "output text" | ./validate-output.sh <agent_name> [min_length]
#
# Arguments:
#   $1 - Nom de l'agent (obligatoire)
#   $2 - Longueur minimale attendue (defaut: 50)
#
# Sortie:
#   Code retour 0 = output valide
#   Code retour 1 = output invalide (details sur stderr)
#
# En mode dry-run (DRYRUN=1), valide seulement que l'agent
# existe dans test-prompts.json sans verifier d'output reel.
# ============================================================

set -euo pipefail

# ── Parametres ────────────────────────────────────────────
AGENT_NAME="${1:-}"
MIN_LENGTH="${2:-50}"

if [ -z "$AGENT_NAME" ]; then
    echo "[ERREUR] Usage: echo 'output' | validate-output.sh <agent_name> [min_length]" >&2
    exit 1
fi

# ── Couleurs ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# ── Compteurs d'erreurs ──────────────────────────────────
ERRORS=0

# ── Lecture de l'output depuis stdin ─────────────────────
OUTPUT=$(cat)

# ── Validation 1 : Output non-vide ──────────────────────
if [ -z "$OUTPUT" ] || [ "$OUTPUT" = "null" ]; then
    echo -e "  ${RED}[ECHEC]${NC} $AGENT_NAME : output vide ou null" >&2
    ERRORS=$((ERRORS + 1))
fi

# ── Validation 2 : Longueur minimale ────────────────────
OUTPUT_LEN=${#OUTPUT}
if [ "$OUTPUT_LEN" -lt "$MIN_LENGTH" ]; then
    echo -e "  ${RED}[ECHEC]${NC} $AGENT_NAME : output trop court (${OUTPUT_LEN} chars, minimum ${MIN_LENGTH})" >&2
    ERRORS=$((ERRORS + 1))
fi

# ── Validation 3 : Pas de message d'erreur courant ─────
# Detecte les patterns d'erreur courants dans les outputs d'agents
ERROR_PATTERNS=(
    "^Error:"
    "^ERROR:"
    "FATAL"
    "Traceback"
    "SyntaxError"
    "TypeError"
    "ReferenceError"
    "panic:"
    "Unhandled exception"
    "Stack trace"
    "ENOENT"
    "EACCES"
    "Permission denied"
    "command not found"
    "No such file or directory"
)

for pattern in "${ERROR_PATTERNS[@]}"; do
    if echo "$OUTPUT" | grep -qiE "$pattern"; then
        echo -e "  ${RED}[ECHEC]${NC} $AGENT_NAME : pattern d'erreur detecte ('$pattern')" >&2
        ERRORS=$((ERRORS + 1))
        break
    fi
done

# ── Validation 4 : Pas de placeholder non-resolu ───────
# Detecte les variables/placeholders non resolus
PLACEHOLDER_PATTERNS=(
    '\$\{[A-Z_]+\}'
    'TODO:'
    'FIXME:'
    'XXX:'
    '\[INSERT'
    '<PLACEHOLDER>'
)

PLACEHOLDER_WARNINGS=0
for pattern in "${PLACEHOLDER_PATTERNS[@]}"; do
    if echo "$OUTPUT" | grep -qE "$pattern"; then
        PLACEHOLDER_WARNINGS=$((PLACEHOLDER_WARNINGS + 1))
    fi
done

if [ "$PLACEHOLDER_WARNINGS" -gt 2 ]; then
    echo -e "  ${RED}[ECHEC]${NC} $AGENT_NAME : trop de placeholders non-resolus ($PLACEHOLDER_WARNINGS detectes)" >&2
    ERRORS=$((ERRORS + 1))
fi

# ── Resultat ─────────────────────────────────────────────
if [ "$ERRORS" -eq 0 ]; then
    echo -e "  ${GREEN}[OK]${NC} $AGENT_NAME : output valide (${OUTPUT_LEN} chars)"
    exit 0
else
    echo -e "  ${RED}[ECHEC]${NC} $AGENT_NAME : ${ERRORS} erreur(s) de validation" >&2
    exit 1
fi
