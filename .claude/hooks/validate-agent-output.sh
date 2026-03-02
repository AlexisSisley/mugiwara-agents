#!/bin/bash
# ============================================================
# Hook: validate-agent-output.sh
# Event: PostToolUse (matcher: Skill) — sync
# Validates agent output quality and returns additionalContext
# if issues are detected
# ============================================================

set -euo pipefail

# Read hook payload from stdin
INPUT=$(cat)

SKILL=$(echo "$INPUT" | jq -r '.tool_input.skill // "unknown"' 2>/dev/null)
RESPONSE=$(echo "$INPUT" | jq -r '.tool_response // ""' 2>/dev/null)

# Skip validation for the router (one_piece returns short routing tables)
if [ "$SKILL" = "one_piece" ]; then
  exit 0
fi

WARNINGS=""

# Check 1: Output is non-empty
if [ -z "$RESPONSE" ] || [ "$RESPONSE" = "null" ]; then
  WARNINGS="${WARNINGS}[HOOK WARNING] Agent '$SKILL' returned empty output.\n"
fi

# Check 2: Minimum length (50 chars for non-trivial output)
RESPONSE_LEN=${#RESPONSE}
if [ "$RESPONSE_LEN" -gt 0 ] && [ "$RESPONSE_LEN" -lt 50 ]; then
  WARNINGS="${WARNINGS}[HOOK WARNING] Agent '$SKILL' output is suspiciously short (${RESPONSE_LEN} chars).\n"
fi

# Check 3: Structured sections for pipeline agents
case "$SKILL" in
  mugiwara|incident|pre-launch|onboard|modernize|discovery|doc-hunt|api-postman)
    if ! echo "$RESPONSE" | grep -qE "^#{1,3} |^\*\*.*\*\*|^- "; then
      WARNINGS="${WARNINGS}[HOOK WARNING] Pipeline agent '$SKILL' output lacks structured sections (headings, bold, lists).\n"
    fi
    ;;
esac

# Output warnings as additionalContext (sync hook stdout)
if [ -n "$WARNINGS" ]; then
  echo -e "$WARNINGS"
fi
