#!/bin/bash
# ============================================================
# Hook: log-session.sh
# Event: SessionStart / SessionEnd — sync
# Logs session start/end to logs/sessions.jsonl + SQLite
# On SessionStart, injects context message via stdout
# Uses Node.js for JSON parsing (no jq dependency)
# ============================================================

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
LOG_FILE="$PROJECT_DIR/logs/sessions.jsonl"

mkdir -p "$PROJECT_DIR/logs"

# Read hook payload from stdin
INPUT=$(cat)

# SQLite writer paths (compiled JS or dev tsx)
HOOK_WRITER_JS="$PROJECT_DIR/dashboard/dist/server/db/hook-writer.js"
HOOK_WRITER_TS="$PROJECT_DIR/dashboard/server/db/hook-writer.ts"

# Use Node.js to parse JSON and determine hook event
HOOK_EVENT=$(node -e "const d=JSON.parse(process.argv[1]); process.stdout.write(d.hook_event||'unknown')" -- "$INPUT" 2>/dev/null || echo "unknown")
SESSION_ID=$(node -e "const d=JSON.parse(process.argv[1]); process.stdout.write(d.session_id||'unknown')" -- "$INPUT" 2>/dev/null || echo "unknown")

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Extract project from cwd
PROJECT=$(node -e "
const d=JSON.parse(process.argv[1]);
const path=require('path');
const cwd=d.cwd||process.cwd();
process.stdout.write(path.basename(cwd));
" -- "$INPUT" 2>/dev/null || echo "unknown")

if [ "$HOOK_EVENT" = "SessionStart" ] || [ "$HOOK_EVENT" = "unknown" ]; then
  # Write JSONL session_start
  node -e "
const fs=require('fs');
const entry=JSON.stringify({
  timestamp:'$TIMESTAMP', event:'session_start',
  session_id:'$SESSION_ID', project:'$PROJECT'
});
fs.appendFileSync('$LOG_FILE', entry+'\n');
" 2>/dev/null || true

  # Dual-write to SQLite (non-blocking, silent failures)
  if [ -f "$HOOK_WRITER_JS" ]; then
    echo "$INPUT" | node "$HOOK_WRITER_JS" session 2>/dev/null &
  elif command -v tsx >/dev/null 2>&1 && [ -f "$HOOK_WRITER_TS" ]; then
    echo "$INPUT" | tsx "$HOOK_WRITER_TS" session 2>/dev/null &
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
  echo "Mugiwara Hooks v1.5 active — agent+subagent logging, validation, notifications & SQLite enabled."
else
  # SessionEnd — log with reason
  REASON=$(node -e "const d=JSON.parse(process.argv[1]); process.stdout.write(d.reason||'normal')" -- "$INPUT" 2>/dev/null || echo "normal")

  node -e "
const fs=require('fs');
const entry=JSON.stringify({
  timestamp:'$TIMESTAMP', event:'session_end',
  session_id:'$SESSION_ID', reason:'$REASON', project:'$PROJECT'
});
fs.appendFileSync('$LOG_FILE', entry+'\n');
" 2>/dev/null || true

  # Dual-write to SQLite (non-blocking, silent failures)
  if [ -f "$HOOK_WRITER_JS" ]; then
    echo "$INPUT" | node "$HOOK_WRITER_JS" session 2>/dev/null &
  elif command -v tsx >/dev/null 2>&1 && [ -f "$HOOK_WRITER_TS" ]; then
    echo "$INPUT" | tsx "$HOOK_WRITER_TS" session 2>/dev/null &
  fi
fi
