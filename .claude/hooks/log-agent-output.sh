#!/bin/bash
# ============================================================
# Hook: log-agent-output.sh
# Event: PostToolUse (matcher: Skill) — async
# Logs each agent invocation to logs/agents.jsonl
# ============================================================

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
LOG_FILE="$PROJECT_DIR/logs/agents.jsonl"

mkdir -p "$PROJECT_DIR/logs"

# Read hook payload from stdin
INPUT=$(cat)

# Extract fields from hook payload
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // "unknown"' 2>/dev/null)
SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // "unknown"' 2>/dev/null)
ARGS=$(echo "$INPUT" | jq -r '.tool_input.args // ""' 2>/dev/null)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null)
RESPONSE=$(echo "$INPUT" | jq -r '.tool_response // ""' 2>/dev/null)

# Truncate for log readability
ARGS_PREVIEW=$(echo "$ARGS" | head -c 200)
OUTPUT_SUMMARY=$(echo "$RESPONSE" | head -c 500)

# Detect pipeline patterns
IS_PIPELINE="false"
case "$SKILL" in
  mugiwara|incident|pre-launch|onboard|modernize|discovery|doc-hunt|api-postman)
    IS_PIPELINE="true"
    ;;
esac

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Write JSONL entry
jq -n -c \
  --arg ts "$TIMESTAMP" \
  --arg event "agent_invocation" \
  --arg agent "$SKILL" \
  --arg tool "$TOOL_NAME" \
  --arg args "$ARGS_PREVIEW" \
  --arg output "$OUTPUT_SUMMARY" \
  --arg session "$SESSION_ID" \
  --argjson pipeline "$IS_PIPELINE" \
  '{timestamp: $ts, event: $event, agent: $agent, tool: $tool, args_preview: $args, output_summary: $output, session_id: $session, is_pipeline: $pipeline}' \
  >> "$LOG_FILE"
