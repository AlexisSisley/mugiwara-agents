#!/bin/bash
# ============================================================
# Hook: check-init.sh
# Event: SessionStart (matcher: startup|resume)
# Checks if the current project has Mugiwara configuration.
# If not, suggests initialization via one_piece.
# ============================================================

set -euo pipefail

# Read hook payload from stdin
INPUT=$(cat)

# Extract the current working directory from the session context
# The hook runs in the project directory context via $CLAUDE_PROJECT_DIR
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"

# Skip if we're inside the mugiwara-agents repo itself
if [[ -f "$PROJECT_DIR/install.sh" ]] && [[ -d "$PROJECT_DIR/skills/one_piece" ]]; then
    exit 0
fi

# Check for Mugiwara config marker in CLAUDE.md
CLAUDE_MD="$PROJECT_DIR/CLAUDE.md"
MUGIWARA_CONFIG="$PROJECT_DIR/.mugiwara/project.yaml"

HAS_MARKER=false
HAS_CONFIG=false

if [[ -f "$CLAUDE_MD" ]] && grep -q "mugiwara-config:start" "$CLAUDE_MD" 2>/dev/null; then
    HAS_MARKER=true
fi

if [[ -f "$MUGIWARA_CONFIG" ]]; then
    HAS_CONFIG=true
fi

# If both exist, project is initialized — nothing to do
if [[ "$HAS_MARKER" == "true" ]] && [[ "$HAS_CONFIG" == "true" ]]; then
    exit 0
fi

# If config exists but CLAUDE.md marker is missing, suggest sync
if [[ "$HAS_CONFIG" == "true" ]] && [[ "$HAS_MARKER" == "false" ]]; then
    echo "[MUGIWARA] Configuration .mugiwara/project.yaml found but CLAUDE.md is not synced. Run: /one_piece sync project config"
    exit 0
fi

# Project not initialized — suggest init
echo "[MUGIWARA] This project has no Mugiwara configuration. To set up the agent crew for this project, use: /one_piece init"
