#!/bin/bash
# ============================================================
# Hook: log-session.sh
# Event: SessionStart / SessionEnd — sync
# Logs session start/end to logs/sessions.jsonl
# On SessionStart, injects context message via stdout
# ============================================================

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
LOG_FILE="$PROJECT_DIR/logs/sessions.jsonl"

mkdir -p "$PROJECT_DIR/logs"

# Read hook payload from stdin
INPUT=$(cat)

HOOK_EVENT=$(echo "$INPUT" | jq -r '.hook_event // "unknown"' 2>/dev/null)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

if [ "$HOOK_EVENT" = "SessionStart" ] || [ "$HOOK_EVENT" = "unknown" ]; then
  # Log session start
  jq -n -c \
    --arg ts "$TIMESTAMP" \
    --arg event "session_start" \
    --arg session "$SESSION_ID" \
    '{timestamp: $ts, event: $event, session_id: $session}' \
    >> "$LOG_FILE"

  # Inject context for Claude (sync hook → stdout goes to additionalContext)
  echo "Mugiwara Hooks v1.3 active — agent logging, validation & notifications enabled."
else
  # SessionEnd — log with reason
  REASON=$(echo "$INPUT" | jq -r '.reason // "normal"' 2>/dev/null)

  jq -n -c \
    --arg ts "$TIMESTAMP" \
    --arg event "session_end" \
    --arg session "$SESSION_ID" \
    --arg reason "$REASON" \
    '{timestamp: $ts, event: $event, session_id: $session, reason: $reason}' \
    >> "$LOG_FILE"
fi
