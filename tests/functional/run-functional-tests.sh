#!/bin/bash
# ============================================================
# Mugiwara Agents - Tests Fonctionnels
# ============================================================
# Runner principal des tests fonctionnels pour les 40 agents.
#
# Usage:
#   ./tests/functional/run-functional-tests.sh              # Mode complet (appelle les agents)
#   ./tests/functional/run-functional-tests.sh --dry-run    # Mode dry-run (validation structure uniquement)
#   ./tests/functional/run-functional-tests.sh --agent zorro # Teste un seul agent
#   ./tests/functional/run-functional-tests.sh --dry-run --agent zorro
#
# Mode dry-run (pour CI) :
#   - Verifie que test-prompts.json est valide et contient 40 agents
#   - Verifie que chaque agent reference dans test-prompts.json existe dans skills/
#   - Verifie que chaque agent a un SKILL.md valide
#   - Verifie que validate-output.sh est present et executable
#   - NE lance PAS d'appel LLM
#
# Mode complet :
#   - Execute chaque agent avec son prompt de test via `claude -p`
#   - Valide l'output avec validate-output.sh
#   - Produit un rapport detaille
#
# Rapport :
#   - Affiche le nombre de tests passes/echoues et la duree totale
#   - Sauvegarde les resultats dans tests/functional/results/
#
# Exit code 0 = tous les tests passent, 1 = au moins un echec.
# ============================================================

set -euo pipefail

# ── Couleurs ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Paths ────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILLS_DIR="$PROJECT_ROOT/skills"
PROMPTS_FILE="$SCRIPT_DIR/test-prompts.json"
VALIDATOR="$SCRIPT_DIR/validate-output.sh"
RESULTS_DIR="$SCRIPT_DIR/results"

# ── Arguments ────────────────────────────────────────────
DRY_RUN=0
SINGLE_AGENT=""
TIMEOUT=120  # Timeout par agent en secondes

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        --agent)
            SINGLE_AGENT="${2:-}"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# ── Compteurs ────────────────────────────────────────────
PASS=0
FAIL=0
SKIP=0
TOTAL=0
START_TIME=$(date +%s)

# ── Fonctions d'affichage ────────────────────────────────
pass() {
    PASS=$((PASS + 1))
    TOTAL=$((TOTAL + 1))
    echo -e "  ${GREEN}[PASS]${NC} $1"
}

fail() {
    FAIL=$((FAIL + 1))
    TOTAL=$((TOTAL + 1))
    echo -e "  ${RED}[FAIL]${NC} $1"
}

skip() {
    SKIP=$((SKIP + 1))
    echo -e "  ${YELLOW}[SKIP]${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}  === $1 ===${NC}"
    echo ""
}

# ── En-tete ──────────────────────────────────────────────
echo ""
echo -e "${CYAN}  ╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}  ║   Mugiwara Agents - Tests Fonctionnels v1.4     ║${NC}"
if [ "$DRY_RUN" -eq 1 ]; then
echo -e "${CYAN}  ║   Mode: DRY-RUN (validation structure)          ║${NC}"
else
echo -e "${CYAN}  ║   Mode: EXECUTION COMPLETE                      ║${NC}"
fi
echo -e "${CYAN}  ╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Pre-requis ───────────────────────────────────────────
section "Phase 1 : Verification des pre-requis"

# P1.1 - Verifier que jq est disponible
if command -v jq &>/dev/null; then
    pass "jq est installe ($(jq --version 2>/dev/null || echo 'version inconnue'))"
else
    fail "jq n'est PAS installe (requis pour parser test-prompts.json)"
    echo -e "  ${RED}Arret des tests : jq est obligatoire.${NC}"
    exit 1
fi

# P1.2 - Verifier que test-prompts.json existe et est valide
if [ -f "$PROMPTS_FILE" ]; then
    if jq empty "$PROMPTS_FILE" 2>/dev/null; then
        pass "test-prompts.json existe et est du JSON valide"
    else
        fail "test-prompts.json existe mais n'est PAS du JSON valide"
        exit 1
    fi
else
    fail "test-prompts.json introuvable : $PROMPTS_FILE"
    exit 1
fi

# P1.3 - Verifier le nombre d'agents dans le fichier
AGENT_COUNT=$(jq '.agents | length' "$PROMPTS_FILE" | tr -d '\r')
if [ "$AGENT_COUNT" -eq 40 ]; then
    pass "test-prompts.json contient 40 agents"
else
    fail "test-prompts.json contient $AGENT_COUNT agents (attendu: 40)"
fi

# P1.4 - Verifier que validate-output.sh existe
if [ -f "$VALIDATOR" ]; then
    pass "validate-output.sh existe"
else
    fail "validate-output.sh introuvable : $VALIDATOR"
    exit 1
fi

# P1.5 - Verifier que le dossier skills/ existe
if [ -d "$SKILLS_DIR" ]; then
    SKILLS_COUNT=$(ls -1d "$SKILLS_DIR"/*/ 2>/dev/null | wc -l)
    pass "skills/ existe avec $SKILLS_COUNT agents"
else
    fail "skills/ introuvable : $SKILLS_DIR"
    exit 1
fi

# P1.6 - Creer le dossier de resultats
mkdir -p "$RESULTS_DIR"
pass "Dossier de resultats pret : $RESULTS_DIR"

# ── Validation structurelle des agents ───────────────────
section "Phase 2 : Validation structurelle (prompts <-> agents)"

# Extraire la liste des agents du JSON
AGENTS_IN_JSON=$(jq -r '.agents[].name' "$PROMPTS_FILE" | tr -d '\r' | sort)

# Pour chaque agent dans test-prompts.json, verifier qu'il existe dans skills/
while IFS= read -r agent; do
    # Filtrage si --agent specifie
    if [ -n "$SINGLE_AGENT" ] && [ "$agent" != "$SINGLE_AGENT" ]; then
        continue
    fi

    # Verifier que le dossier agent existe
    if [ ! -d "$SKILLS_DIR/$agent" ]; then
        fail "$agent : dossier skills/$agent/ introuvable"
        continue
    fi

    # Verifier que SKILL.md existe
    if [ ! -f "$SKILLS_DIR/$agent/SKILL.md" ]; then
        fail "$agent : SKILL.md introuvable dans skills/$agent/"
        continue
    fi

    # Verifier que SKILL.md a du front matter YAML
    FIRST_LINE=$(head -1 "$SKILLS_DIR/$agent/SKILL.md")
    if [ "$FIRST_LINE" != "---" ]; then
        fail "$agent : SKILL.md ne commence pas par '---' (YAML front matter)"
        continue
    fi

    # Verifier que le prompt n'est pas vide
    PROMPT=$(jq -r --arg name "$agent" '.agents[] | select(.name == $name) | .prompt' "$PROMPTS_FILE" | tr -d '\r')
    if [ -z "$PROMPT" ] || [ "$PROMPT" = "null" ]; then
        fail "$agent : prompt de test vide dans test-prompts.json"
        continue
    fi

    # Verifier la longueur minimale configuree
    MIN_LEN=$(jq -r --arg name "$agent" '.agents[] | select(.name == $name) | .min_output_length // 50' "$PROMPTS_FILE" | tr -d '\r')
    if [ "$MIN_LEN" -lt 1 ] 2>/dev/null; then
        fail "$agent : min_output_length invalide ($MIN_LEN)"
        continue
    fi

    pass "$agent : structure validee (prompt: ${#PROMPT} chars, min_output: ${MIN_LEN})"

done <<< "$AGENTS_IN_JSON"

# Verifier les agents dans skills/ non couverts par test-prompts.json
section "Phase 3 : Couverture des agents"

AGENTS_IN_SKILLS=$(ls -1 "$SKILLS_DIR" | sort)
MISSING_COVERAGE=0
while IFS= read -r agent; do
    if ! echo "$AGENTS_IN_JSON" | grep -qx "$agent"; then
        fail "Agent '$agent' present dans skills/ mais ABSENT de test-prompts.json"
        MISSING_COVERAGE=$((MISSING_COVERAGE + 1))
    fi
done <<< "$AGENTS_IN_SKILLS"

if [ "$MISSING_COVERAGE" -eq 0 ]; then
    pass "Tous les agents de skills/ sont couverts par test-prompts.json"
fi

# Verifier les agents dans test-prompts.json qui n'existent pas dans skills/
PHANTOM_AGENTS=0
while IFS= read -r agent; do
    if [ ! -d "$SKILLS_DIR/$agent" ]; then
        fail "Agent '$agent' dans test-prompts.json mais ABSENT de skills/"
        PHANTOM_AGENTS=$((PHANTOM_AGENTS + 1))
    fi
done <<< "$AGENTS_IN_JSON"

if [ "$PHANTOM_AGENTS" -eq 0 ]; then
    pass "Aucun agent fantome dans test-prompts.json"
fi

# ── Execution des tests (mode complet uniquement) ────────
if [ "$DRY_RUN" -eq 0 ]; then
    section "Phase 4 : Execution des tests fonctionnels"

    # Verifier que claude CLI est disponible
    if ! command -v claude &>/dev/null; then
        fail "claude CLI non trouvee (requise pour le mode complet)"
        echo -e "  ${YELLOW}Conseil : Utilisez --dry-run pour la validation structurelle sans LLM${NC}"
        FAIL=$((FAIL + 1))
    else
        pass "claude CLI disponible"

        TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
        REPORT_FILE="$RESULTS_DIR/report_${TIMESTAMP}.jsonl"

        while IFS= read -r agent; do
            # Filtrage si --agent specifie
            if [ -n "$SINGLE_AGENT" ] && [ "$agent" != "$SINGLE_AGENT" ]; then
                continue
            fi

            PROMPT=$(jq -r --arg name "$agent" '.agents[] | select(.name == $name) | .prompt' "$PROMPTS_FILE" | tr -d '\r')
            MIN_LEN=$(jq -r --arg name "$agent" '.agents[] | select(.name == $name) | .min_output_length // 50' "$PROMPTS_FILE" | tr -d '\r')

            echo -e "  ${CYAN}[TEST]${NC} $agent : execution en cours..."

            # Execution de l'agent avec timeout
            AGENT_START=$(date +%s)
            AGENT_OUTPUT=""
            AGENT_EXIT=0

            AGENT_OUTPUT=$(timeout "$TIMEOUT" claude -p "/$agent \"$PROMPT\"" 2>&1) || AGENT_EXIT=$?

            AGENT_END=$(date +%s)
            AGENT_DURATION=$((AGENT_END - AGENT_START))

            if [ "$AGENT_EXIT" -eq 124 ]; then
                fail "$agent : timeout apres ${TIMEOUT}s"
                RESULT_STATUS="timeout"
            elif [ "$AGENT_EXIT" -ne 0 ]; then
                fail "$agent : erreur d'execution (code: $AGENT_EXIT)"
                RESULT_STATUS="error"
            else
                # Validation de l'output
                VALIDATION_RESULT=$(echo "$AGENT_OUTPUT" | bash "$VALIDATOR" "$agent" "$MIN_LEN" 2>&1) || true
                VALIDATION_EXIT=$?

                if [ "$VALIDATION_EXIT" -eq 0 ]; then
                    pass "$agent : test fonctionnel reussi (${AGENT_DURATION}s)"
                    RESULT_STATUS="pass"
                else
                    fail "$agent : validation echouee"
                    echo "$VALIDATION_RESULT"
                    RESULT_STATUS="fail"
                fi
            fi

            # Ecrire le resultat dans le rapport JSONL
            jq -n -c \
                --arg agent "$agent" \
                --arg status "$RESULT_STATUS" \
                --argjson duration "$AGENT_DURATION" \
                --argjson exit_code "$AGENT_EXIT" \
                --arg output_preview "$(echo "$AGENT_OUTPUT" | head -c 500)" \
                --arg timestamp "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
                '{agent: $agent, status: $status, duration_seconds: $duration, exit_code: $exit_code, output_preview: $output_preview, timestamp: $timestamp}' \
                >> "$REPORT_FILE"

        done <<< "$AGENTS_IN_JSON"

        echo ""
        echo -e "  ${BLUE}Rapport sauvegarde :${NC} $REPORT_FILE"
    fi
else
    section "Phase 4 : Execution (IGNOREE - mode dry-run)"
    echo -e "  ${YELLOW}[INFO]${NC} Mode dry-run actif : aucun appel LLM effectue"
    echo -e "  ${YELLOW}[INFO]${NC} Utilisez sans --dry-run pour executer les tests reels"
fi

# ── Rapport final ────────────────────────────────────────
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "  ${BLUE}══════════════════════════════════════════${NC}"
echo -e "  ${BLUE}RAPPORT DES TESTS FONCTIONNELS${NC}"
echo -e "  ${BLUE}══════════════════════════════════════════${NC}"
echo ""
if [ "$DRY_RUN" -eq 1 ]; then
echo -e "  Mode       : ${YELLOW}DRY-RUN${NC} (structure uniquement)"
else
echo -e "  Mode       : ${CYAN}EXECUTION COMPLETE${NC}"
fi
echo -e "  ${GREEN}PASS${NC}       : $PASS"
echo -e "  ${RED}FAIL${NC}       : $FAIL"
echo -e "  ${YELLOW}SKIP${NC}       : $SKIP"
echo -e "  Total      : $TOTAL tests"
echo -e "  Duree      : ${DURATION}s"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "  ${GREEN}Tous les tests ont reussi !${NC}"
    echo ""
    exit 0
else
    echo -e "  ${RED}$FAIL test(s) echoue(s).${NC}"
    echo ""
    exit 1
fi
