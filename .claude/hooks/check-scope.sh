#!/bin/bash
# ============================================================
# Hook: check-scope.sh
# Event: PreToolUse (matcher: Write|Edit) — sync
# Prevents agents from writing to forbidden paths (secrets,
# credentials, env files). Checks both global defaults and
# per-project guardrails.
# ============================================================

set -euo pipefail

INPUT=$(cat)

# Extract file path from tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.path // ""' 2>/dev/null)

if [ -z "$FILE_PATH" ] || [ "$FILE_PATH" = "null" ]; then
    exit 0
fi

# Normalize path for matching
BASENAME=$(basename "$FILE_PATH")
LOWER_PATH=$(echo "$FILE_PATH" | tr '[:upper:]' '[:lower:]')

# ── Forbidden Pattern Check ──
BLOCKED=false
REASON=""

# Check .env files
case "$BASENAME" in
    .env|.env.*)
        BLOCKED=true
        REASON="Environment variable files (.env) are protected by guardrails."
        ;;
esac

# Check credentials/secrets patterns
case "$LOWER_PATH" in
    *credentials*|*secrets*|*secret_key*|*api_key*)
        BLOCKED=true
        REASON="Credential/secret files are protected by guardrails."
        ;;
esac

# Check key/certificate files
case "$BASENAME" in
    *.pem|*.key|*.p12|*.pfx|*.jks|*.keystore)
        BLOCKED=true
        REASON="Key/certificate files are protected by guardrails."
        ;;
esac

# Check per-project forbidden paths
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
if [ -f "$PROJECT_DIR/.mugiwara/guardrails.yaml" ]; then
    # Simple check: extract forbidden_paths and match
    FORBIDDEN=$(grep -A 50 'forbidden_paths:' "$PROJECT_DIR/.mugiwara/guardrails.yaml" 2>/dev/null | grep '^ *-' | sed 's/^ *- *//' | sed 's/"//g' | sed "s/'//g")
    while IFS= read -r pattern; do
        [ -z "$pattern" ] && continue
        # Simple glob matching via bash
        if [[ "$FILE_PATH" == $pattern ]] || [[ "$BASENAME" == $pattern ]]; then
            BLOCKED=true
            REASON="Path matches project guardrail forbidden pattern: $pattern"
            break
        fi
    done <<< "$FORBIDDEN"
fi

if [ "$BLOCKED" = "true" ]; then
    echo "[GUARDRAIL SCOPE] BLOCKED: Cannot write to '$FILE_PATH'. $REASON"
fi
