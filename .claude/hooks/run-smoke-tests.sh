#!/bin/bash
# ============================================================
# Hook: run-smoke-tests.sh
# Event: PostToolUse (matcher: Write|Edit) — async
# Runs smoke tests when a file in skills/ is modified
# ============================================================

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
LOG_FILE="$PROJECT_DIR/logs/agents.jsonl"
TEST_SCRIPT="$PROJECT_DIR/tests/test_structural.sh"

mkdir -p "$PROJECT_DIR/logs"

# Read hook payload from stdin
INPUT=$(cat)

# Extract the file path that was written/edited
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null)

# Only trigger if the modified file is in skills/
if ! echo "$FILE_PATH" | grep -q "skills/"; then
  exit 0
fi

# Check that the test script exists
if [ ! -f "$TEST_SCRIPT" ]; then
  exit 0
fi

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Run smoke tests and capture result
TEST_OUTPUT=$("$TEST_SCRIPT" 2>&1) || true
EXIT_CODE=$?

# Extract summary line (last line typically has PASS/FAIL counts)
SUMMARY=$(echo "$TEST_OUTPUT" | tail -5 | head -c 500)

# Log test results
jq -n -c \
  --arg ts "$TIMESTAMP" \
  --arg event "smoke_tests" \
  --arg trigger "$FILE_PATH" \
  --arg summary "$SUMMARY" \
  --argjson exit_code "$EXIT_CODE" \
  '{timestamp: $ts, event: $event, trigger_file: $trigger, exit_code: $exit_code, summary: $summary}' \
  >> "$LOG_FILE"
