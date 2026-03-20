#!/bin/bash
# ============================================================
# Mugiwara Agents - Installation Script
# One Piece Crew for Claude Code CLI
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared constants (single source of truth)
source "$SCRIPT_DIR/lib/colors.sh"
source "$SCRIPT_DIR/lib/crew.sh"

SKILLS_DIR="$HOME/.claude/skills"
SOURCE_DIR="$SCRIPT_DIR/skills"

echo ""
echo -e "${YELLOW}  ⚓ MUGIWARA AGENTS - Installation${NC}"
echo -e "${YELLOW}  One Piece Crew for Claude Code CLI${NC}"
echo "  ──────────────────────────────────────"
echo ""

# Check if Claude Code skills directory exists
if [ ! -d "$HOME/.claude" ]; then
    echo -e "${RED}  [!] ~/.claude directory not found.${NC}"
    echo -e "  Make sure Claude Code CLI is installed first."
    echo -e "  Visit: https://docs.anthropic.com/en/docs/claude-code"
    exit 1
fi

# Create skills directory if it doesn't exist
mkdir -p "$SKILLS_DIR"

# CREW and ROLES are sourced from lib/crew.sh

echo -e "  Installing crew members to ${BLUE}$SKILLS_DIR${NC}"
echo ""

installed=0
skipped=0

for i in "${!CREW[@]}"; do
    member="${CREW[$i]}"
    role="${ROLES[$i]}"

    if [ ! -d "$SOURCE_DIR/$member" ]; then
        echo -e "  ${RED}[!]${NC} $member - source not found, skipping"
        skipped=$((skipped + 1))
        continue
    fi

    if [ -d "$SKILLS_DIR/$member" ]; then
        echo -e "  ${YELLOW}[~]${NC} $member ($role) - already exists, updating..."
    else
        echo -e "  ${GREEN}[+]${NC} $member ($role) - installing..."
    fi

    # Copy skill directory
    mkdir -p "$SKILLS_DIR/$member"
    cp -r "$SOURCE_DIR/$member/"* "$SKILLS_DIR/$member/"
    installed=$((installed + 1))
done


# ──────────────────────────────────────
# Hooks installation
# ──────────────────────────────────────
echo ""
echo -e "  ${BLUE}Installing hooks...${NC}"

# Check jq dependency
if ! command -v jq &> /dev/null; then
    echo -e "  ${YELLOW}[!]${NC} jq not found — hooks require jq for JSON parsing"
    echo -e "      Install: https://jqlang.github.io/jq/download/"
else
    echo -e "  ${GREEN}[+]${NC} jq found"
fi

# Copy hooks to user's project .claude/hooks/
HOOKS_SOURCE="$SCRIPT_DIR/.claude/hooks"
HOOKS_DEST="$HOME/.claude/hooks"

if [ -d "$HOOKS_SOURCE" ]; then
    mkdir -p "$HOOKS_DEST"
    for hook in "$HOOKS_SOURCE"/*.sh; do
        if [ -f "$hook" ]; then
            hook_name=$(basename "$hook")
            cp "$hook" "$HOOKS_DEST/$hook_name"
            chmod +x "$HOOKS_DEST/$hook_name"
            echo -e "  ${GREEN}[+]${NC} Hook: $hook_name"
        fi
    done
else
    echo -e "  ${YELLOW}[!]${NC} No hooks source directory found, skipping"
fi

# Create logs directory
mkdir -p "$SCRIPT_DIR/logs"
echo -e "  ${GREEN}[+]${NC} logs/ directory ready"

# Copy settings.json if not already present
if [ -f "$SCRIPT_DIR/.claude/settings.json" ]; then
    echo -e "  ${GREEN}[+]${NC} .claude/settings.json (hooks config) present"
fi

echo ""
echo "  ──────────────────────────────────────"
echo -e "  ${GREEN}Installed: $installed agents${NC} | ${YELLOW}Skipped: $skipped${NC}"
echo ""
echo -e "  ${GREEN}Installation complete!${NC}"
echo ""
echo "  Next steps:"
echo "  1. Restart Claude Code (or start a new session)"
echo "  2. Type / to see the crew in autocomplete"
echo "  3. Try: /zorro Your first problem description"
echo ""

# ──────────────────────────────────────
# Suggest mugiwara CLI (v1.5+)
# ──────────────────────────────────────
if [[ -f "$SCRIPT_DIR/bin/mugiwara" ]]; then
    echo -e "  ${BLUE}Tip:${NC} You can also manage agents individually with the mugiwara CLI:"
    echo ""
    echo "    # Add bin/ to your PATH (add to ~/.bashrc or ~/.zshrc):"
    echo "    export PATH=\"$SCRIPT_DIR/bin:\$PATH\""
    echo ""
    echo "    # Then use:"
    echo "    mugiwara list              # List installed/available agents"
    echo "    mugiwara install <agent>   # Install a single agent"
    echo "    mugiwara update            # Update all agents"
    echo ""
fi

echo -e "  ${YELLOW}Set sail with the Mugiwara crew!${NC}"
echo ""
