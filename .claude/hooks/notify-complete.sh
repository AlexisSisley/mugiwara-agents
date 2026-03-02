#!/bin/bash
# ============================================================
# Hook: notify-complete.sh
# Event: Stop — async
# Detects pipeline completion via pattern matching on last
# assistant message, logs it, and notifies Slack if configured
# ============================================================

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
LOG_FILE="$PROJECT_DIR/logs/agents.jsonl"

mkdir -p "$PROJECT_DIR/logs"

# Anti-infinite-loop guard
if [ "${STOP_HOOK_ACTIVE:-}" = "1" ]; then
  exit 0
fi
export STOP_HOOK_ACTIVE=1

# Read hook payload from stdin
INPUT=$(cat)

SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null)
LAST_MSG=$(echo "$INPUT" | jq -r '.last_assistant_message // ""' 2>/dev/null)
STOP_REASON=$(echo "$INPUT" | jq -r '.reason // "unknown"' 2>/dev/null)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Detect pipeline patterns in last message
PIPELINE=""
LAST_MSG_LOWER=$(echo "$LAST_MSG" | tr '[:upper:]' '[:lower:]')

if echo "$LAST_MSG_LOWER" | grep -qE "mugiwara|pipeline.*complet|equipage.*complet"; then
  PIPELINE="mugiwara"
elif echo "$LAST_MSG_LOWER" | grep -qE "incident.*response|incident.*resolved|rca.*complet"; then
  PIPELINE="incident"
elif echo "$LAST_MSG_LOWER" | grep -qE "pre-launch|checklist.*complet|go.?live"; then
  PIPELINE="pre-launch"
elif echo "$LAST_MSG_LOWER" | grep -qE "discovery|decouverte.*produit|product.*discovery"; then
  PIPELINE="discovery"
elif echo "$LAST_MSG_LOWER" | grep -qE "onboard|onboarding.*complet"; then
  PIPELINE="onboard"
elif echo "$LAST_MSG_LOWER" | grep -qE "modernize|modernisation.*complet"; then
  PIPELINE="modernize"
elif echo "$LAST_MSG_LOWER" | grep -qE "api-postman|collection.*postman.*complet"; then
  PIPELINE="api-postman"
elif echo "$LAST_MSG_LOWER" | grep -qE "doc-hunt|documentation.*complet"; then
  PIPELINE="doc-hunt"
fi

# Log stop event
jq -n -c \
  --arg ts "$TIMESTAMP" \
  --arg event "session_stop" \
  --arg session "$SESSION_ID" \
  --arg reason "$STOP_REASON" \
  --arg pipeline "${PIPELINE:-none}" \
  '{timestamp: $ts, event: $event, session_id: $session, reason: $reason, pipeline_detected: $pipeline}' \
  >> "$LOG_FILE"

# Notify Slack if pipeline detected and webhook configured
if [ -n "$PIPELINE" ] && [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
  PAYLOAD=$(jq -n -c \
    --arg pipeline "$PIPELINE" \
    --arg session "$SESSION_ID" \
    --arg ts "$TIMESTAMP" \
    '{
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: ("⚓ Pipeline Complete: " + $pipeline), emoji: true }
        },
        {
          type: "section",
          text: { type: "mrkdwn", text: ("Pipeline `" + $pipeline + "` has finished execution.") }
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: ("Session: `" + $session + "` | " + $ts) }
          ]
        }
      ]
    }')

  curl -s -X POST "$SLACK_WEBHOOK_URL" \
    -H "Content-Type: application/json" \
    -d "$PAYLOAD" \
    > /dev/null 2>&1 || true
fi
