#!/bin/bash
# ============================================================
# Hook: notify-slack.sh
# Event: Notification — async
# Forwards notifications to Slack via webhook (optional)
# No-op if SLACK_WEBHOOK_URL is not set
# ============================================================

set -euo pipefail

# Skip if no Slack webhook configured
if [ -z "${SLACK_WEBHOOK_URL:-}" ]; then
  exit 0
fi

# Read hook payload from stdin
INPUT=$(cat)

TITLE=$(echo "$INPUT" | jq -r '.title // "Claude Code Notification"' 2>/dev/null)
MESSAGE=$(echo "$INPUT" | jq -r '.message // ""' 2>/dev/null)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"' 2>/dev/null)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Build Slack Block Kit payload
PAYLOAD=$(jq -n -c \
  --arg title "$TITLE" \
  --arg msg "$MESSAGE" \
  --arg ts "$TIMESTAMP" \
  --arg session "$SESSION_ID" \
  '{
    blocks: [
      {
        type: "header",
        text: { type: "plain_text", text: ("⚓ " + $title), emoji: true }
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: $msg }
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: ("Session: `" + $session + "` | " + $ts) }
        ]
      }
    ]
  }')

# Send to Slack (fire and forget, don't fail the hook)
curl -s -X POST "$SLACK_WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" \
  > /dev/null 2>&1 || true
