#!/bin/bash
# ============================================================
# Mugiwara CLI — Project Sub-command
# Usage: mugiwara project <init|add|remove|list|preset|sync>
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

source "$SCRIPT_DIR/lib/colors.sh"
source "$SCRIPT_DIR/lib/project.sh"

cmd_project() {
    local action="${1:-help}"
    shift || true

    case "$action" in
        init)
            cmd_project_init "$@"
            ;;
        add)
            cmd_project_add "$@"
            ;;
        remove)
            cmd_project_remove "$@"
            ;;
        list)
            cmd_project_list "$@"
            ;;
        preset)
            cmd_project_preset "$@"
            ;;
        sync)
            cmd_project_sync "$@"
            ;;
        help|--help|-h)
            cmd_project_help
            ;;
        *)
            echo -e "${RED}Unknown project action: $action${NC}"
            cmd_project_help
            exit 1
            ;;
    esac
}

cmd_project_init() {
    local project_dir="${1:-.}"
    project_dir="$(cd "$project_dir" && pwd)"

    echo ""
    echo -e "${YELLOW}  ⚓ MUGIWARA — Project Initialization${NC}"
    echo "  ──────────────────────────────────────"
    echo ""

    # Step 1: Detect stack
    echo -e "  ${BLUE}Detecting stack...${NC}"
    local stacks
    stacks=$(detect_stack "$project_dir")

    if [[ -n "$stacks" ]]; then
        echo -e "  ${GREEN}[+]${NC} Detected: $stacks"
    else
        echo -e "  ${YELLOW}[~]${NC} No stack detected"
    fi

    # Step 2: Suggest preset
    local suggested_preset
    suggested_preset=$(suggest_preset "$stacks")
    echo -e "  ${GREEN}[+]${NC} Suggested preset: ${BLUE}$suggested_preset${NC}"
    echo ""

    # Step 3: Confirm or customize
    echo "  Available presets:"
    echo "    1) web-fullstack    — TypeScript/React/Next.js + DB + Docker"
    echo "    2) data-engineering — Python + dbt + SQL + BI + MLOps"
    echo "    3) devops           — Docker + K8s + Terraform + Monitoring"
    echo "    4) mobile           — Flutter/RN + Firebase + i18n + a11y"
    echo "    5) minimal          — Core crew only (7 agents)"
    echo ""

    read -p "  Choose preset [$suggested_preset]: " choice
    choice="${choice:-$suggested_preset}"

    case "$choice" in
        1|web-fullstack) choice="web-fullstack" ;;
        2|data-engineering) choice="data-engineering" ;;
        3|devops) choice="devops" ;;
        4|mobile) choice="mobile" ;;
        5|minimal) choice="minimal" ;;
    esac

    # Step 4: Get project name
    local project_name
    project_name=$(basename "$project_dir")
    read -p "  Project name [$project_name]: " name_input
    project_name="${name_input:-$project_name}"

    echo ""
    echo -e "  ${BLUE}Generating configuration...${NC}"

    # Step 5: Generate .mugiwara/project.yaml
    local config_file
    config_file=$(generate_project_yaml "$project_dir" "$choice" "$project_name" "$stacks")
    echo -e "  ${GREEN}[+]${NC} Created: $config_file"

    # Step 6: Generate/update CLAUDE.md
    local claude_file
    claude_file=$(generate_claude_md_section "$project_dir" "$choice")
    echo -e "  ${GREEN}[+]${NC} Updated: $claude_file"

    echo ""
    echo "  ──────────────────────────────────────"
    echo -e "  ${GREEN}Project initialized with preset: $choice${NC}"
    echo ""
    echo "  Next steps:"
    echo "    - Review .mugiwara/project.yaml"
    echo "    - Add/remove agents: mugiwara project add <agent>"
    echo "    - Sync CLAUDE.md: mugiwara project sync"
    echo ""
}

cmd_project_add() {
    local agent_name="${1:-}"
    local project_dir="${2:-.}"

    if [[ -z "$agent_name" ]]; then
        echo -e "${RED}Usage: mugiwara project add <agent-name> [project-dir]${NC}"
        exit 1
    fi

    project_add_agent "$(cd "$project_dir" && pwd)" "$agent_name"
    echo -e "${BLUE}Run 'mugiwara project sync' to update CLAUDE.md${NC}"
}

cmd_project_remove() {
    local agent_name="${1:-}"
    local project_dir="${2:-.}"

    if [[ -z "$agent_name" ]]; then
        echo -e "${RED}Usage: mugiwara project remove <agent-name> [project-dir]${NC}"
        exit 1
    fi

    project_remove_agent "$(cd "$project_dir" && pwd)" "$agent_name"
    echo -e "${BLUE}Run 'mugiwara project sync' to update CLAUDE.md${NC}"
}

cmd_project_list() {
    local project_dir="${1:-.}"
    project_list_agents "$(cd "$project_dir" && pwd)"
}

cmd_project_preset() {
    local preset_name="${1:-}"
    local project_dir="${2:-.}"
    project_dir="$(cd "$project_dir" && pwd)"

    if [[ -z "$preset_name" ]]; then
        echo "  Available presets:"
        for f in "$SCRIPT_DIR/skills/one_piece/presets/"*.yaml; do
            local name
            name=$(basename "$f" .yaml)
            local desc
            desc=$(grep '^description:' "$f" | sed 's/description: *"//' | sed 's/"$//')
            echo "    - $name: $desc"
        done
        return 0
    fi

    local stacks
    stacks=$(detect_stack "$project_dir")
    local project_name
    project_name=$(basename "$project_dir")

    generate_project_yaml "$project_dir" "$preset_name" "$project_name" "$stacks" > /dev/null
    generate_claude_md_section "$project_dir" "$preset_name" > /dev/null

    echo -e "${GREEN}[+] Applied preset: $preset_name${NC}"
}

cmd_project_sync() {
    local project_dir="${1:-.}"
    project_dir="$(cd "$project_dir" && pwd)"
    local config_file="$project_dir/.mugiwara/project.yaml"

    if [[ ! -f "$config_file" ]]; then
        echo -e "${RED}[!] No .mugiwara/project.yaml found. Run 'mugiwara project init' first.${NC}"
        exit 1
    fi

    local preset_name
    preset_name=$(grep '^preset:' "$config_file" | sed 's/preset: *//')

    generate_claude_md_section "$project_dir" "$preset_name" > /dev/null
    echo -e "${GREEN}[+] CLAUDE.md synced from .mugiwara/project.yaml${NC}"
}

cmd_project_help() {
    echo ""
    echo -e "${YELLOW}  mugiwara project — Project configuration management${NC}"
    echo ""
    echo "  Commands:"
    echo "    init [dir]              Initialize Mugiwara for a project"
    echo "    add <agent> [dir]       Add an agent to the project"
    echo "    remove <agent> [dir]    Remove an agent from the project"
    echo "    list [dir]              List active agents and pipelines"
    echo "    preset [name] [dir]     Apply or list presets"
    echo "    sync [dir]              Regenerate CLAUDE.md from project.yaml"
    echo ""
}
