#!/bin/bash
# ============================================================
# Hook: enforce-guardrails.sh
# Event: PostToolUse (matcher: Skill|Agent) — sync
# Tracks agent invocation counts and enforces rate limits.
# Uses graduated enforcement: warn → soft limit → hard limit.
# ============================================================

set -euo pipefail

INPUT=$(cat)

SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // .tool_input.subagent_type // "unknown"' 2>/dev/null)

# Skip for the router itself
if [ "$SKILL" = "one_piece" ]; then
    exit 0
fi

# ── Session State File ──
SESSION_STATE="${HOME}/.mugiwara/session-state.json"
mkdir -p "${HOME}/.mugiwara"

# Initialize session state if it doesn't exist
if [ ! -f "$SESSION_STATE" ]; then
    cat > "$SESSION_STATE" << 'EOF'
{
  "session_id": "",
  "started_at": "",
  "invocations": {
    "total": 0,
    "by_agent": {}
  },
  "pipeline_runs": 0
}
EOF
fi

# ── Load Guardrails Defaults ──
GUARDRAILS_FILE=""
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Check for per-project guardrails override first
if [ -f "$PROJECT_DIR/.mugiwara/guardrails.yaml" ]; then
    GUARDRAILS_FILE="$PROJECT_DIR/.mugiwara/guardrails.yaml"
fi

# Defaults (hardcoded fallback — matches guardrails-defaults.yaml)
MAX_PER_SESSION=10
MAX_TOTAL_INVOCATIONS=50
MAX_PIPELINE_RUNS=5
WARN_THRESHOLD=80   # percentage
SOFT_THRESHOLD=95
HARD_THRESHOLD=100

# ── Update Counters ──
TOTAL=$(jq '.invocations.total' "$SESSION_STATE" 2>/dev/null || echo "0")
AGENT_COUNT=$(jq -r ".invocations.by_agent[\"$SKILL\"] // 0" "$SESSION_STATE" 2>/dev/null || echo "0")

NEW_TOTAL=$((TOTAL + 1))
NEW_AGENT_COUNT=$((AGENT_COUNT + 1))

# Update session state atomically
jq --arg skill "$SKILL" \
   --argjson new_total "$NEW_TOTAL" \
   --argjson new_count "$NEW_AGENT_COUNT" \
   '.invocations.total = $new_total | .invocations.by_agent[$skill] = $new_count' \
   "$SESSION_STATE" > "${SESSION_STATE}.tmp" && mv "${SESSION_STATE}.tmp" "$SESSION_STATE"

# ── Enforcement Logic ──
WARNINGS=""

# Check per-agent rate limit
AGENT_PCT=$((NEW_AGENT_COUNT * 100 / MAX_PER_SESSION))
if [ "$AGENT_PCT" -ge "$HARD_THRESHOLD" ]; then
    WARNINGS="${WARNINGS}[GUARDRAIL HARD LIMIT] Agent '$SKILL' has reached max invocations ($NEW_AGENT_COUNT/$MAX_PER_SESSION). STOP: complete the current task and stop invoking this agent.\n"
elif [ "$AGENT_PCT" -ge "$SOFT_THRESHOLD" ]; then
    WARNINGS="${WARNINGS}[GUARDRAIL SOFT LIMIT] Agent '$SKILL' is at $NEW_AGENT_COUNT/$MAX_PER_SESSION invocations. Complete the current task concisely.\n"
elif [ "$AGENT_PCT" -ge "$WARN_THRESHOLD" ]; then
    WARNINGS="${WARNINGS}[GUARDRAIL WARNING] Agent '$SKILL' budget at ${AGENT_PCT}% ($NEW_AGENT_COUNT/$MAX_PER_SESSION). Be concise.\n"
fi

# Check total session limit
SESSION_PCT=$((NEW_TOTAL * 100 / MAX_TOTAL_INVOCATIONS))
if [ "$SESSION_PCT" -ge "$HARD_THRESHOLD" ]; then
    WARNINGS="${WARNINGS}[GUARDRAIL HARD LIMIT] Session agent budget exhausted ($NEW_TOTAL/$MAX_TOTAL_INVOCATIONS). STOP: summarize in 3 lines and stop.\n"
elif [ "$SESSION_PCT" -ge "$SOFT_THRESHOLD" ]; then
    WARNINGS="${WARNINGS}[GUARDRAIL SOFT LIMIT] Session budget at ${SESSION_PCT}% ($NEW_TOTAL/$MAX_TOTAL_INVOCATIONS). Wrap up.\n"
elif [ "$SESSION_PCT" -ge "$WARN_THRESHOLD" ]; then
    WARNINGS="${WARNINGS}[GUARDRAIL WARNING] Session budget at ${SESSION_PCT}% ($NEW_TOTAL/$MAX_TOTAL_INVOCATIONS).\n"
fi

# Output warnings as additionalContext
if [ -n "$WARNINGS" ]; then
    echo -e "$WARNINGS"
fi
