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
CREW=(zorro sanji sanji-dotnet sanji-flutter sanji-python sanji-ts sanji-rust sanji-go sanji-java sanji-design sanji-i18n nami luffy franky robin chopper brook usopp jinbe yamato vegapunk shanks vivi ace law law-sql bartholomew perona senor-pink morgans monitoring feature-flags api-postman incident pre-launch onboard modernize mugiwara discovery doc-hunt one_piece bon-clay)
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
    "Sous-Chef Design & UI/UX"
    "Sous-Chef Traduction & i18n"
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
    "SQL Specialist & Doc-to-SQL Converter"
    "Local API Analyzer"
    "Postman Collection Creator"
    "E2E Test Collection Creator"
    "Release Email Generator (QA & Prod)"
    "Monitoring & Alerting (Prometheus, Grafana, SRE)"
    "Feature Flags (env-based, Unleash, LaunchDarkly)"
    "Pipeline: API Analyze → Postman Collection → E2E Tests"
    "Pipeline: Incident Response"
    "Pipeline: Pre-Launch Checklist"
    "Pipeline: Onboarding"
    "Pipeline: Modernization"
    "Full Pipeline"
    "Pipeline: Product Discovery"
    "Pipeline: Documentation Hunting"
    "Smart Router"
    "... 🤫"
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

# Copy hooks to project .claude/hooks/
HOOKS_SOURCE="$SCRIPT_DIR/.claude/hooks"
HOOKS_DEST="$SCRIPT_DIR/.claude/hooks"

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
