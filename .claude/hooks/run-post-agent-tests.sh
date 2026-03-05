#!/bin/bash
# ============================================================
# Hook: run-post-agent-tests.sh
# Event: PostToolUse (matcher: Skill) — sync
# Runs structural smoke tests after every agent invocation
# to verify that no agent has broken the ecosystem.
#
# Returns additionalContext with test results so the calling
# agent (typically one_piece) is aware of any regressions.
# ============================================================

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
LOG_FILE="$PROJECT_DIR/logs/agents.jsonl"
TEST_SCRIPT="$PROJECT_DIR/tests/test_structural.sh"

mkdir -p "$PROJECT_DIR/logs"

# Read hook payload from stdin
INPUT=$(cat)

# Extract agent name
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // "unknown"' 2>/dev/null)

# Skip self-testing when one_piece is just routing (it doesn't modify files)
# But still test for all other agents that may modify the ecosystem
if [ "$SKILL" = "one_piece" ]; then
  exit 0
fi

# Check that the test script exists
if [ ! -f "$TEST_SCRIPT" ]; then
  echo "[POST-AGENT TEST] WARNING: test script not found at $TEST_SCRIPT — skipping verification."
  exit 0
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Run the structural smoke tests
TEST_OUTPUT=$("$TEST_SCRIPT" 2>&1) || true
EXIT_CODE=$?

# Extract summary metrics from test output
PASS_COUNT=$(echo "$TEST_OUTPUT" | grep -oP 'PASS: \K[0-9]+' || echo "?")
FAIL_COUNT=$(echo "$TEST_OUTPUT" | grep -oP 'FAIL: \K[0-9]+' || echo "?")
WARN_COUNT=$(echo "$TEST_OUTPUT" | grep -oP 'WARN: \K[0-9]+' || echo "?")
TOTAL_COUNT=$(echo "$TEST_OUTPUT" | grep -oP 'Total: \K[0-9]+' || echo "?")

# Log test results
jq -n -c \
  --arg ts "$TIMESTAMP" \
  --arg event "post_agent_tests" \
  --arg agent "$SKILL" \
  --arg pass "$PASS_COUNT" \
  --arg fail "$FAIL_COUNT" \
  --arg warn "$WARN_COUNT" \
  --arg total "$TOTAL_COUNT" \
  --argjson exit_code "$EXIT_CODE" \
  '{timestamp: $ts, event: $event, trigger_agent: $agent, exit_code: $exit_code, pass: $pass, fail: $fail, warn: $warn, total: $total}' \
  >> "$LOG_FILE"

# Output result as additionalContext for the calling agent
if [ "$EXIT_CODE" -ne 0 ]; then
  echo ""
  echo "[POST-AGENT TEST] FAIL — Agent '$SKILL' may have introduced regressions."
  echo "Results: $PASS_COUNT passed, $FAIL_COUNT failed, $WARN_COUNT warnings out of $TOTAL_COUNT tests."
  echo ""
  # Show the failing test lines for diagnosis
  echo "Failing tests:"
  echo "$TEST_OUTPUT" | grep -E "\[FAIL\]" | head -20
  echo ""
  echo "ACTION REQUIRED: Review and fix the regressions before proceeding."
else
  echo "[POST-AGENT TEST] PASS — All $TOTAL_COUNT structural tests passed after agent '$SKILL' execution. ($PASS_COUNT passed, $WARN_COUNT warnings)"
fi
