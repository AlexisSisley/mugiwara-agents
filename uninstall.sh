#!/bin/bash
# ============================================================
# Mugiwara Agents - Uninstallation Script
# ============================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SKILLS_DIR="$HOME/.claude/skills"
CREW=(zorro sanji nami luffy franky robin chopper brook usopp jinbe mugiwara)

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

echo ""
echo -e "  ${GREEN}Removed $removed agents. Restart Claude Code to apply.${NC}"
echo ""
