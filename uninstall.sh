#!/bin/bash
# ============================================================
# Mugiwara Agents - Uninstallation Script
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source shared constants (single source of truth)
source "$SCRIPT_DIR/lib/colors.sh"
source "$SCRIPT_DIR/lib/crew.sh"

SKILLS_DIR="$HOME/.claude/skills"

echo ""
echo -e "${RED}  Mugiwara Agents - Uninstall${NC}"
echo "  ──────────────────────────────────────"
echo ""

read -p "  Are you sure you want to remove all Mugiwara agents? (y/N) " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "  Cancelled."
    exit 0
fi

echo ""
removed=0
for member in "${CREW[@]}"; do
    if [ -d "$SKILLS_DIR/$member" ]; then
        rm -rf "$SKILLS_DIR/$member"
        echo -e "  ${RED}[-]${NC} Removed $member"
        ((removed++))
    fi
done

# Clean up lock files in ~/.mugiwara/installed/
LOCK_DIR="$HOME/.mugiwara/installed"
if [ -d "$LOCK_DIR" ]; then
    lock_removed=0
    for lock_file in "$LOCK_DIR"/*.lock; do
        if [ -f "$lock_file" ]; then
            rm -f "$lock_file"
            lock_removed=$((lock_removed + 1))
        fi
    done
    if [ "$lock_removed" -gt 0 ]; then
        echo ""
        echo -e "  ${RED}[-]${NC} Removed $lock_removed lock file(s) from $LOCK_DIR"
    fi
fi

# Clean up hooks
echo ""
echo -e "  ${YELLOW}Cleaning up hooks...${NC}"

HOOKS_DIR="$SCRIPT_DIR/.claude/hooks"

if [ -d "$HOOKS_DIR" ]; then
    rm -rf "$HOOKS_DIR"
    echo -e "  ${RED}[-]${NC} Removed .claude/hooks/"
fi

if [ -f "$SCRIPT_DIR/.claude/settings.json" ]; then
    rm -f "$SCRIPT_DIR/.claude/settings.json"
    echo -e "  ${RED}[-]${NC} Removed .claude/settings.json"
fi

if [ -d "$SCRIPT_DIR/logs" ]; then
    rm -rf "$SCRIPT_DIR/logs"
    echo -e "  ${RED}[-]${NC} Removed logs/"
fi

echo ""
echo -e "  ${GREEN}Removed $removed agents + hooks. Restart Claude Code to apply.${NC}"
echo ""
