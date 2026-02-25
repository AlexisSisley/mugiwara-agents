#!/bin/bash
# ============================================================
# Mugiwara Agents - Installation Script
# One Piece Crew for Claude Code CLI
# ============================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SKILLS_DIR="$HOME/.claude/skills"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
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

# List of crew members
CREW=(zorro sanji sanji-dotnet sanji-flutter sanji-python sanji-ts sanji-rust sanji-go sanji-java nami luffy franky robin chopper brook usopp jinbe yamato vegapunk shanks vivi ace law incident pre-launch onboard modernize mugiwara)
ROLES=(
    "Business Analyst"
    "Architect & Tech Lead"
    "Sous-Chef C#/.NET"
    "Sous-Chef Flutter/Dart"
    "Sous-Chef Python"
    "Sous-Chef TypeScript/Node.js"
    "Sous-Chef Rust"
    "Sous-Chef Go"
    "Sous-Chef Java/Kotlin"
    "QA Lead"
    "Captain / Program Manager"
    "Code Reviewer"
    "System Cartographer"
    "Debugger & Diagnostician"
    "Technical Writer"
    "DevOps & IaC"
    "SecOps & Compliance"
    "Tech Intelligence & Dashboard"
    "Meta-Auditor & Agent Engineer"
    "Refactoring & Migration Expert"
    "Product Manager & UX"
    "Performance Engineer"
    "Data Engineer & Analytics"
    "Pipeline: Incident Response"
    "Pipeline: Pre-Launch Checklist"
    "Pipeline: Onboarding"
    "Pipeline: Modernization"
    "Full Pipeline"
)

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

echo ""
echo "  ──────────────────────────────────────"
echo -e "  ${GREEN}Installed: $installed${NC} | ${YELLOW}Skipped: $skipped${NC}"
echo ""
echo -e "  ${GREEN}Installation complete!${NC}"
echo ""
echo "  Next steps:"
echo "  1. Restart Claude Code (or start a new session)"
echo "  2. Type / to see the crew in autocomplete"
echo "  3. Try: /zorro Your first problem description"
echo ""
echo -e "  ${YELLOW}Set sail with the Mugiwara crew!${NC}"
echo ""
