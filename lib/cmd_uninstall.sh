#!/bin/bash
# ============================================================
# Mugiwara CLI - Uninstall Command
# mugiwara uninstall <agent> [agent2...]
# ============================================================

cmd_uninstall() {
    local agents=()

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --*)
                error "Unknown option: $1"
                return 1
                ;;
            *)
                agents+=("$1")
                shift
                ;;
        esac
    done

    # Validate input
    if [[ ${#agents[@]} -eq 0 ]]; then
        echo ""
        echo -e "  ${BOLD}Usage:${NC} mugiwara uninstall <agent> [agent2...]"
        echo ""
        echo "  Examples:"
        echo "    mugiwara uninstall zorro          Remove a single agent"
        echo "    mugiwara uninstall zorro sanji     Remove multiple agents"
        echo ""
        return 1
    fi

    echo ""

    local removed=0
    local failed=0

    for agent in "${agents[@]}"; do
        if uninstall_agent "$agent"; then
            removed=$((removed + 1))
        else
            failed=$((failed + 1))
        fi
    done

    echo ""
    echo "  ──────────────────────────────────────"
    echo -e "  ${RED}Removed: $removed${NC} | ${YELLOW}Failed: $failed${NC}"
    echo ""

    return 0
}
