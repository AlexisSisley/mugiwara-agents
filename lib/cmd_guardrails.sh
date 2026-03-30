#!/bin/bash
# ============================================================
# Mugiwara CLI — Guardrails Sub-command
# Usage: mugiwara guardrails <init|check|reset>
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

source "$SCRIPT_DIR/lib/colors.sh"

cmd_guardrails() {
    local action="${1:-help}"
    shift || true

    case "$action" in
        init)
            cmd_guardrails_init "$@"
            ;;
        check)
            cmd_guardrails_check "$@"
            ;;
        reset)
            cmd_guardrails_reset "$@"
            ;;
        help|--help|-h)
            cmd_guardrails_help
            ;;
        *)
            echo -e "${RED}Unknown guardrails action: $action${NC}"
            cmd_guardrails_help
            exit 1
            ;;
    esac
}

cmd_guardrails_init() {
    local project_dir="${1:-.}"
    project_dir="$(cd "$project_dir" && pwd)"

    mkdir -p "$project_dir/.mugiwara"

    local output_file="$project_dir/.mugiwara/guardrails.yaml"

    if [ -f "$output_file" ]; then
        echo -e "${YELLOW}[~] $output_file already exists. Use --force to overwrite.${NC}"
        if [[ "${2:-}" != "--force" ]]; then
            return 0
        fi
    fi

    # Copy defaults with comments as template
    cp "$SCRIPT_DIR/lib/guardrails-defaults.yaml" "$output_file"

    # Add project-specific header
    sed -i '1s|^|# Project-specific guardrails overrides\n# Modify values below to customize limits for this project\n# Delete any section to use global defaults\n|' "$output_file"

    echo -e "${GREEN}[+] Created: $output_file${NC}"
    echo -e "${BLUE}Edit this file to customize guardrails for your project.${NC}"
}

cmd_guardrails_check() {
    local project_dir="${1:-.}"
    project_dir="$(cd "$project_dir" && pwd)"

    local guardrails_file="$project_dir/.mugiwara/guardrails.yaml"
    local session_state="${HOME}/.mugiwara/session-state.json"

    echo ""
    echo -e "${YELLOW}  Guardrails Status${NC}"
    echo "  ──────────────────────────────────────"

    # Check project guardrails
    if [ -f "$guardrails_file" ]; then
        echo -e "  ${GREEN}[+]${NC} Project guardrails: $guardrails_file"
    else
        echo -e "  ${YELLOW}[~]${NC} No project guardrails (using global defaults)"
    fi

    # Check session state
    if [ -f "$session_state" ]; then
        local total
        total=$(jq '.invocations.total' "$session_state" 2>/dev/null || echo "0")
        echo -e "  ${BLUE}Session invocations:${NC} $total / 50"

        echo -e "  ${BLUE}Per-agent counts:${NC}"
        jq -r '.invocations.by_agent | to_entries[] | "    \(.key): \(.value)"' "$session_state" 2>/dev/null || echo "    (none)"
    else
        echo -e "  ${YELLOW}[~]${NC} No session state yet"
    fi
    echo ""
}

cmd_guardrails_reset() {
    local session_state="${HOME}/.mugiwara/session-state.json"

    if [ -f "$session_state" ]; then
        rm -f "$session_state"
        echo -e "${GREEN}[+] Session state reset.${NC}"
    else
        echo -e "${YELLOW}[~] No session state to reset.${NC}"
    fi
}

cmd_guardrails_help() {
    echo ""
    echo -e "${YELLOW}  mugiwara guardrails — Agent limits and scope enforcement${NC}"
    echo ""
    echo "  Commands:"
    echo "    init [dir]      Create .mugiwara/guardrails.yaml with defaults"
    echo "    check [dir]     Show guardrails status and session counters"
    echo "    reset           Reset session invocation counters"
    echo ""
}
