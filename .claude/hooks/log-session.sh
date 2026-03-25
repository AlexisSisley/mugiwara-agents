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

  # Dual-write to SQLite (non-blocking, silent failures)
  HOOK_WRITER="$PROJECT_DIR/dashboard/dist/server/db/hook-writer.js"
  if [ -f "$HOOK_WRITER" ]; then
    echo "$INPUT" | node "$HOOK_WRITER" session 2>/dev/null &
  fi

  # Auto weekly report on Monday
  DAY_OF_WEEK=$(date +%u 2>/dev/null || echo "0")
  if [ "$DAY_OF_WEEK" = "1" ]; then
    REPORT_SCRIPT="$PROJECT_DIR/dashboard/scripts/generate-report.ts"
    if command -v tsx >/dev/null 2>&1 && [ -f "$REPORT_SCRIPT" ]; then
      tsx "$REPORT_SCRIPT" --auto 2>/dev/null &
    fi
    # Notify Claude if a report is pending
    WEEK_START=$(date -d 'last monday' +%Y-%m-%d 2>/dev/null || date -v-monday +%Y-%m-%d 2>/dev/null || echo "")
    if [ -n "$WEEK_START" ]; then
      REPORT_FILE="$HOME/.mugiwara/reports/weekly-${WEEK_START}.html"
      if [ -f "$REPORT_FILE" ]; then
        echo "[WEEKLY REPORT] Rapport hebdo disponible : $REPORT_FILE — demande a One Piece de creer le brouillon Gmail."
      fi
    fi
  fi

  # Inject context for Claude (sync hook → stdout goes to additionalContext)
  echo "Mugiwara Hooks v1.4 active — agent logging, validation, notifications & SQLite enabled."
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

  # Dual-write to SQLite (non-blocking, silent failures)
  HOOK_WRITER="$PROJECT_DIR/dashboard/dist/server/db/hook-writer.js"
  if [ -f "$HOOK_WRITER" ]; then
    echo "$INPUT" | node "$HOOK_WRITER" session 2>/dev/null &
  fi
fi
