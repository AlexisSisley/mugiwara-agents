#!/bin/bash
# ============================================================
# Mugiwara Agents - Tests des Hooks v1.3
# ============================================================
# Suite de tests automatises pour les 6 hooks Claude Code.
# Chaque hook est teste avec des events simules (mock) sans
# appeler Claude ni de service externe.
#
# Usage:
#   chmod +x tests/hooks/test-hooks.sh
#   ./tests/hooks/test-hooks.sh
#
# Pre-requis : jq
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
HOOKS_DIR="$PROJECT_ROOT/.claude/hooks"
MOCK_FILE="$SCRIPT_DIR/mock-event.json"

# ── Repertoire temporaire pour les tests ─────────────────
TEST_TMP=$(mktemp -d)
trap 'rm -rf "$TEST_TMP"' EXIT

# Simuler CLAUDE_PROJECT_DIR pour que les hooks ecrivent dans notre tmp
export CLAUDE_PROJECT_DIR="$TEST_TMP"
mkdir -p "$TEST_TMP/logs"
mkdir -p "$TEST_TMP/tests"
# Creer un test_structural.sh factice pour run-smoke-tests.sh
cat > "$TEST_TMP/tests/test_structural.sh" << 'FAKESCRIPT'
#!/bin/bash
echo "  [PASS] Fake smoke test 1"
echo "  [PASS] Fake smoke test 2"
echo "  PASS: 2"
echo "  FAIL: 0"
echo "  Total: 2 tests"
exit 0
FAKESCRIPT
chmod +x "$TEST_TMP/tests/test_structural.sh"

# ── Compteurs ────────────────────────────────────────────
PASS=0
FAIL=0
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

section() {
    echo ""
    echo -e "${BLUE}  === $1 ===${NC}"
    echo ""
}

# ── En-tete ──────────────────────────────────────────────
echo ""
echo -e "${CYAN}  ╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}  ║   Mugiwara Agents - Tests Hooks v1.3            ║${NC}"
echo -e "${CYAN}  ╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Pre-requis ───────────────────────────────────────────
section "Phase 0 : Verification des pre-requis"

# Verifier jq
if command -v jq &>/dev/null; then
    pass "jq est installe"
else
    fail "jq n'est PAS installe (requis pour les hooks)"
    exit 1
fi

# Verifier que les 6 hooks existent
EXPECTED_HOOKS=(
    "log-agent-output.sh"
    "validate-agent-output.sh"
    "log-session.sh"
    "notify-slack.sh"
    "notify-complete.sh"
    "run-smoke-tests.sh"
)

for hook in "${EXPECTED_HOOKS[@]}"; do
    if [ -f "$HOOKS_DIR/$hook" ]; then
        pass "Hook $hook existe"
    else
        fail "Hook $hook introuvable dans $HOOKS_DIR/"
    fi
done

# Verifier que mock-event.json existe et est valide
if [ -f "$MOCK_FILE" ] && jq empty "$MOCK_FILE" 2>/dev/null; then
    pass "mock-event.json existe et est du JSON valide"
else
    fail "mock-event.json introuvable ou invalide"
    exit 1
fi

# ════════════════════════════════════════════════════════════
# HOOK 1 : log-agent-output.sh
# Event: PostToolUse (Skill) — async
# ════════════════════════════════════════════════════════════
section "Hook 1 : log-agent-output.sh"

# T1.1 - Log une invocation agent standard
rm -f "$TEST_TMP/logs/agents.jsonl"
jq '.PostToolUse_Skill' "$MOCK_FILE" | bash "$HOOKS_DIR/log-agent-output.sh"
if [ -f "$TEST_TMP/logs/agents.jsonl" ]; then
    LAST_LINE=$(tail -1 "$TEST_TMP/logs/agents.jsonl")

    # Verifier que les champs essentiels sont presents
    EVENT=$(echo "$LAST_LINE" | jq -r '.event')
    AGENT=$(echo "$LAST_LINE" | jq -r '.agent')
    SESSION=$(echo "$LAST_LINE" | jq -r '.session_id')
    TIMESTAMP=$(echo "$LAST_LINE" | jq -r '.timestamp')

    if [ "$EVENT" = "agent_invocation" ]; then
        pass "log-agent-output : event='agent_invocation' correct"
    else
        fail "log-agent-output : event='$EVENT' (attendu: agent_invocation)"
    fi

    if [ "$AGENT" = "zorro" ]; then
        pass "log-agent-output : agent='zorro' correct"
    else
        fail "log-agent-output : agent='$AGENT' (attendu: zorro)"
    fi

    if [ "$SESSION" = "test-session-001" ]; then
        pass "log-agent-output : session_id correct"
    else
        fail "log-agent-output : session_id='$SESSION' (attendu: test-session-001)"
    fi

    if [ -n "$TIMESTAMP" ] && [ "$TIMESTAMP" != "null" ]; then
        pass "log-agent-output : timestamp present"
    else
        fail "log-agent-output : timestamp absent"
    fi
else
    fail "log-agent-output : fichier agents.jsonl non cree"
fi

# T1.2 - Detection pipeline pour un agent pipeline
rm -f "$TEST_TMP/logs/agents.jsonl"
jq '.PostToolUse_Skill_Pipeline' "$MOCK_FILE" | bash "$HOOKS_DIR/log-agent-output.sh"
if [ -f "$TEST_TMP/logs/agents.jsonl" ]; then
    IS_PIPELINE=$(tail -1 "$TEST_TMP/logs/agents.jsonl" | jq -r '.is_pipeline')
    if [ "$IS_PIPELINE" = "true" ]; then
        pass "log-agent-output : is_pipeline=true pour mugiwara"
    else
        fail "log-agent-output : is_pipeline='$IS_PIPELINE' pour mugiwara (attendu: true)"
    fi
else
    fail "log-agent-output : fichier agents.jsonl non cree (pipeline)"
fi

# T1.3 - Agent non-pipeline doit avoir is_pipeline=false
rm -f "$TEST_TMP/logs/agents.jsonl"
jq '.PostToolUse_Skill' "$MOCK_FILE" | bash "$HOOKS_DIR/log-agent-output.sh"
if [ -f "$TEST_TMP/logs/agents.jsonl" ]; then
    IS_PIPELINE=$(tail -1 "$TEST_TMP/logs/agents.jsonl" | jq -r '.is_pipeline')
    if [ "$IS_PIPELINE" = "false" ]; then
        pass "log-agent-output : is_pipeline=false pour zorro"
    else
        fail "log-agent-output : is_pipeline='$IS_PIPELINE' pour zorro (attendu: false)"
    fi
else
    fail "log-agent-output : fichier agents.jsonl non cree (non-pipeline)"
fi

# T1.4 - Le fichier JSONL est appendable (deux ecritures)
rm -f "$TEST_TMP/logs/agents.jsonl"
jq '.PostToolUse_Skill' "$MOCK_FILE" | bash "$HOOKS_DIR/log-agent-output.sh"
jq '.PostToolUse_Skill_Pipeline' "$MOCK_FILE" | bash "$HOOKS_DIR/log-agent-output.sh"
LINE_COUNT=$(wc -l < "$TEST_TMP/logs/agents.jsonl")
if [ "$LINE_COUNT" -eq 2 ]; then
    pass "log-agent-output : JSONL appendable (2 lignes apres 2 ecritures)"
else
    fail "log-agent-output : $LINE_COUNT lignes (attendu: 2)"
fi

# ════════════════════════════════════════════════════════════
# HOOK 2 : validate-agent-output.sh
# Event: PostToolUse (Skill) — sync
# ════════════════════════════════════════════════════════════
section "Hook 2 : validate-agent-output.sh"

# T2.1 - Output normal ne genere pas de warning
RESULT=$(jq '.PostToolUse_Skill' "$MOCK_FILE" | bash "$HOOKS_DIR/validate-agent-output.sh" 2>&1) || true
if [ -z "$RESULT" ]; then
    pass "validate-agent-output : pas de warning pour output normal (zorro)"
else
    fail "validate-agent-output : warning inattendu pour output normal : $RESULT"
fi

# T2.2 - Output vide genere un warning
RESULT=$(jq '.PostToolUse_Skill_Empty' "$MOCK_FILE" | bash "$HOOKS_DIR/validate-agent-output.sh" 2>&1) || true
if echo "$RESULT" | grep -q "HOOK WARNING"; then
    pass "validate-agent-output : warning correct pour output vide"
else
    fail "validate-agent-output : pas de warning pour output vide"
fi

# T2.3 - Output trop court genere un warning
RESULT=$(jq '.PostToolUse_Skill_Short' "$MOCK_FILE" | bash "$HOOKS_DIR/validate-agent-output.sh" 2>&1) || true
if echo "$RESULT" | grep -q "suspiciously short"; then
    pass "validate-agent-output : warning correct pour output trop court"
else
    fail "validate-agent-output : pas de warning pour output court (result: '$RESULT')"
fi

# T2.4 - Pipeline avec structure ne genere pas de warning de structure
RESULT=$(jq '.PostToolUse_Skill_Pipeline' "$MOCK_FILE" | bash "$HOOKS_DIR/validate-agent-output.sh" 2>&1) || true
if echo "$RESULT" | grep -q "lacks structured"; then
    fail "validate-agent-output : faux positif — pipeline avec structure genere un warning de structure"
else
    pass "validate-agent-output : pas de warning de structure pour pipeline bien forme"
fi

# T2.5 - Pipeline sans structure genere un warning
RESULT=$(jq '.PostToolUse_Skill_Pipeline_NoStructure' "$MOCK_FILE" | bash "$HOOKS_DIR/validate-agent-output.sh" 2>&1) || true
if echo "$RESULT" | grep -q "lacks structured"; then
    pass "validate-agent-output : warning correct pour pipeline sans structure"
else
    fail "validate-agent-output : pas de warning pour pipeline sans structure"
fi

# T2.6 - Le routeur one_piece est ignore (skip validation)
RESULT=$(jq '.PostToolUse_Skill_OneRoute' "$MOCK_FILE" | bash "$HOOKS_DIR/validate-agent-output.sh" 2>&1)
EXIT_CODE=$?
if [ "$EXIT_CODE" -eq 0 ] && [ -z "$RESULT" ]; then
    pass "validate-agent-output : one_piece ignore (exit 0, pas de warning)"
else
    fail "validate-agent-output : one_piece non ignore (exit=$EXIT_CODE, output='$RESULT')"
fi

# ════════════════════════════════════════════════════════════
# HOOK 3 : log-session.sh
# Event: SessionStart / SessionEnd — sync
# ════════════════════════════════════════════════════════════
section "Hook 3 : log-session.sh"

# T3.1 - SessionStart ecrit dans sessions.jsonl
rm -f "$TEST_TMP/logs/sessions.jsonl"
STDOUT=$(jq '.SessionStart' "$MOCK_FILE" | bash "$HOOKS_DIR/log-session.sh" 2>&1) || true

if [ -f "$TEST_TMP/logs/sessions.jsonl" ]; then
    LAST_LINE=$(tail -1 "$TEST_TMP/logs/sessions.jsonl")
    EVENT=$(echo "$LAST_LINE" | jq -r '.event')

    if [ "$EVENT" = "session_start" ]; then
        pass "log-session : event='session_start' correct"
    else
        fail "log-session : event='$EVENT' (attendu: session_start)"
    fi

    SESSION=$(echo "$LAST_LINE" | jq -r '.session_id')
    if [ "$SESSION" = "test-session-009" ]; then
        pass "log-session : session_id correct"
    else
        fail "log-session : session_id='$SESSION' (attendu: test-session-009)"
    fi
else
    fail "log-session : sessions.jsonl non cree (SessionStart)"
fi

# T3.2 - SessionStart injecte un message de contexte (stdout)
if echo "$STDOUT" | grep -q "Mugiwara Hooks v1.3"; then
    pass "log-session : message de contexte injecte sur SessionStart"
else
    fail "log-session : pas de message de contexte sur SessionStart (stdout: '$STDOUT')"
fi

# T3.3 - SessionEnd ecrit avec event='session_end'
jq '.SessionEnd' "$MOCK_FILE" | bash "$HOOKS_DIR/log-session.sh" >/dev/null 2>&1 || true
LAST_LINE=$(tail -1 "$TEST_TMP/logs/sessions.jsonl")
EVENT=$(echo "$LAST_LINE" | jq -r '.event')

if [ "$EVENT" = "session_end" ]; then
    pass "log-session : event='session_end' correct"
else
    fail "log-session : event='$EVENT' (attendu: session_end)"
fi

# T3.4 - SessionEnd contient le champ reason
REASON=$(echo "$LAST_LINE" | jq -r '.reason')
if [ "$REASON" = "user_exit" ]; then
    pass "log-session : reason='user_exit' correct"
else
    fail "log-session : reason='$REASON' (attendu: user_exit)"
fi

# T3.5 - Deux entrees dans le fichier (start + end)
LINE_COUNT=$(wc -l < "$TEST_TMP/logs/sessions.jsonl")
if [ "$LINE_COUNT" -eq 2 ]; then
    pass "log-session : 2 entrees JSONL (start + end)"
else
    fail "log-session : $LINE_COUNT entrees (attendu: 2)"
fi

# ════════════════════════════════════════════════════════════
# HOOK 4 : notify-slack.sh
# Event: Notification — async
# ════════════════════════════════════════════════════════════
section "Hook 4 : notify-slack.sh"

# T4.1 - Sans SLACK_WEBHOOK_URL, le hook quitte silencieusement (exit 0)
unset SLACK_WEBHOOK_URL 2>/dev/null || true
RESULT=$(jq '.Notification' "$MOCK_FILE" | bash "$HOOKS_DIR/notify-slack.sh" 2>&1) || true
EXIT_CODE=$?

if [ "$EXIT_CODE" -eq 0 ]; then
    pass "notify-slack : exit 0 quand SLACK_WEBHOOK_URL non defini"
else
    fail "notify-slack : exit=$EXIT_CODE quand SLACK_WEBHOOK_URL non defini (attendu: 0)"
fi

# T4.2 - Avec un mock webhook, le hook construit un payload JSON valide
# On utilise un faux webhook qui ne sera pas appele (timeout 1)
# mais on intercepte le payload en mockant curl
MOCK_CURL="$TEST_TMP/mock_curl.sh"
cat > "$MOCK_CURL" << 'CURLFAKE'
#!/bin/bash
# Mock curl : capture le payload et sauve dans un fichier
while [[ $# -gt 0 ]]; do
    case "$1" in
        -d) echo "$2" > "$MOCK_CURL_OUTPUT"; shift 2 ;;
        *) shift ;;
    esac
done
exit 0
CURLFAKE
chmod +x "$MOCK_CURL"

export MOCK_CURL_OUTPUT="$TEST_TMP/slack_payload.json"
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/FAKE/FAKE/FAKE"

# Remplacer curl par notre mock dans le PATH
MOCK_BIN="$TEST_TMP/bin"
mkdir -p "$MOCK_BIN"
cp "$MOCK_CURL" "$MOCK_BIN/curl"
export PATH="$MOCK_BIN:$PATH"

jq '.Notification' "$MOCK_FILE" | bash "$HOOKS_DIR/notify-slack.sh" 2>&1 || true

if [ -f "$MOCK_CURL_OUTPUT" ]; then
    # Verifier que le payload est du JSON valide
    if jq empty "$MOCK_CURL_OUTPUT" 2>/dev/null; then
        pass "notify-slack : payload Slack est du JSON valide"

        # Verifier que le payload contient des blocks
        BLOCKS_COUNT=$(jq '.blocks | length' "$MOCK_CURL_OUTPUT")
        if [ "$BLOCKS_COUNT" -eq 3 ]; then
            pass "notify-slack : payload contient 3 blocks (header, section, context)"
        else
            fail "notify-slack : payload contient $BLOCKS_COUNT blocks (attendu: 3)"
        fi

        # Verifier le contenu du header
        HEADER_TEXT=$(jq -r '.blocks[0].text.text' "$MOCK_CURL_OUTPUT")
        if echo "$HEADER_TEXT" | grep -q "Test Notification"; then
            pass "notify-slack : titre present dans le header"
        else
            fail "notify-slack : titre absent du header ('$HEADER_TEXT')"
        fi
    else
        fail "notify-slack : payload Slack n'est PAS du JSON valide"
    fi
else
    fail "notify-slack : curl n'a pas ete appele (pas de payload capture)"
fi

# Nettoyage
unset SLACK_WEBHOOK_URL
unset MOCK_CURL_OUTPUT

# ════════════════════════════════════════════════════════════
# HOOK 5 : notify-complete.sh
# Event: Stop — async
# ════════════════════════════════════════════════════════════
section "Hook 5 : notify-complete.sh"

# T5.1 - Stop avec pattern pipeline detecte
rm -f "$TEST_TMP/logs/agents.jsonl"
unset SLACK_WEBHOOK_URL 2>/dev/null || true
jq '.Stop' "$MOCK_FILE" | bash "$HOOKS_DIR/notify-complete.sh" 2>&1 || true

if [ -f "$TEST_TMP/logs/agents.jsonl" ]; then
    LAST_LINE=$(tail -1 "$TEST_TMP/logs/agents.jsonl")
    EVENT=$(echo "$LAST_LINE" | jq -r '.event')
    PIPELINE=$(echo "$LAST_LINE" | jq -r '.pipeline_detected')

    if [ "$EVENT" = "session_stop" ]; then
        pass "notify-complete : event='session_stop' correct"
    else
        fail "notify-complete : event='$EVENT' (attendu: session_stop)"
    fi

    if [ "$PIPELINE" = "mugiwara" ]; then
        pass "notify-complete : pipeline_detected='mugiwara' correct"
    else
        fail "notify-complete : pipeline_detected='$PIPELINE' (attendu: mugiwara)"
    fi
else
    fail "notify-complete : agents.jsonl non cree"
fi

# T5.2 - Stop sans pattern pipeline
rm -f "$TEST_TMP/logs/agents.jsonl"
jq '.Stop_NoPipeline' "$MOCK_FILE" | bash "$HOOKS_DIR/notify-complete.sh" 2>&1 || true

if [ -f "$TEST_TMP/logs/agents.jsonl" ]; then
    PIPELINE=$(tail -1 "$TEST_TMP/logs/agents.jsonl" | jq -r '.pipeline_detected')
    if [ "$PIPELINE" = "none" ]; then
        pass "notify-complete : pipeline_detected='none' pour message sans pipeline"
    else
        fail "notify-complete : pipeline_detected='$PIPELINE' (attendu: none)"
    fi
else
    fail "notify-complete : agents.jsonl non cree (no pipeline)"
fi

# T5.3 - Le champ reason est correct
REASON=$(tail -1 "$TEST_TMP/logs/agents.jsonl" | jq -r '.reason')
if [ "$REASON" = "end_turn" ]; then
    pass "notify-complete : reason='end_turn' correct"
else
    fail "notify-complete : reason='$REASON' (attendu: end_turn)"
fi

# T5.4 - Le session_id est correct
SESSION=$(tail -1 "$TEST_TMP/logs/agents.jsonl" | jq -r '.session_id')
if [ "$SESSION" = "test-session-012" ]; then
    pass "notify-complete : session_id correct"
else
    fail "notify-complete : session_id='$SESSION' (attendu: test-session-012)"
fi

# ════════════════════════════════════════════════════════════
# HOOK 6 : run-smoke-tests.sh
# Event: PostToolUse (Write|Edit) — async
# ════════════════════════════════════════════════════════════
section "Hook 6 : run-smoke-tests.sh"

# T6.1 - Modification d'un fichier dans skills/ declenche les tests
rm -f "$TEST_TMP/logs/agents.jsonl"
jq '.PostToolUse_Write' "$MOCK_FILE" | bash "$HOOKS_DIR/run-smoke-tests.sh" 2>&1 || true

if [ -f "$TEST_TMP/logs/agents.jsonl" ]; then
    LAST_LINE=$(tail -1 "$TEST_TMP/logs/agents.jsonl")
    EVENT=$(echo "$LAST_LINE" | jq -r '.event')
    EXIT_CODE_LOG=$(echo "$LAST_LINE" | jq -r '.exit_code')

    if [ "$EVENT" = "smoke_tests" ]; then
        pass "run-smoke-tests : event='smoke_tests' correct"
    else
        fail "run-smoke-tests : event='$EVENT' (attendu: smoke_tests)"
    fi

    if [ "$EXIT_CODE_LOG" = "0" ]; then
        pass "run-smoke-tests : exit_code=0 (tests passes)"
    else
        fail "run-smoke-tests : exit_code=$EXIT_CODE_LOG (attendu: 0)"
    fi

    TRIGGER=$(echo "$LAST_LINE" | jq -r '.trigger_file')
    if echo "$TRIGGER" | grep -q "skills/"; then
        pass "run-smoke-tests : trigger_file contient 'skills/'"
    else
        fail "run-smoke-tests : trigger_file='$TRIGGER' ne contient pas 'skills/'"
    fi
else
    fail "run-smoke-tests : agents.jsonl non cree"
fi

# T6.2 - Modification d'un fichier HORS skills/ ne declenche PAS les tests
rm -f "$TEST_TMP/logs/agents.jsonl"
jq '.PostToolUse_Write_NonSkill' "$MOCK_FILE" | bash "$HOOKS_DIR/run-smoke-tests.sh" 2>&1 || true

if [ -f "$TEST_TMP/logs/agents.jsonl" ]; then
    fail "run-smoke-tests : tests declenches pour un fichier hors skills/ (agents.jsonl cree)"
else
    pass "run-smoke-tests : correctement ignore pour fichier hors skills/"
fi

# ════════════════════════════════════════════════════════════
# RAPPORT FINAL
# ════════════════════════════════════════════════════════════
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo ""
echo -e "  ${BLUE}══════════════════════════════════════════${NC}"
echo -e "  ${BLUE}RAPPORT DES TESTS HOOKS${NC}"
echo -e "  ${BLUE}══════════════════════════════════════════${NC}"
echo ""
echo -e "  ${GREEN}PASS${NC}       : $PASS"
echo -e "  ${RED}FAIL${NC}       : $FAIL"
echo -e "  Total      : $TOTAL tests"
echo -e "  Duree      : ${DURATION}s"
echo ""

if [ "$FAIL" -eq 0 ]; then
    echo -e "  ${GREEN}Tous les tests hooks ont reussi !${NC}"
    echo ""
    exit 0
else
    echo -e "  ${RED}$FAIL test(s) echoue(s).${NC}"
    echo ""
    exit 1
fi
