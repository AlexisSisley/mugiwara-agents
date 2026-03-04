#!/bin/bash
# ============================================================
# Mugiwara CLI - Install Command
# mugiwara install <agent> [agent2...] [--all] [--force]
# ============================================================

cmd_install() {
    local agents=()
    local install_all=0
    local force=0

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --all)
                install_all=1
                shift
                ;;
            --force|-f)
                force=1
                shift
                ;;
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
    if [[ ${#agents[@]} -eq 0 ]] && [[ "$install_all" != "1" ]]; then
        echo ""
        echo -e "  ${BOLD}Usage:${NC} mugiwara install <agent> [agent2...] [--all] [--force]"
        echo ""
        echo "  Examples:"
        echo "    mugiwara install zorro          Install a single agent"
        echo "    mugiwara install zorro sanji     Install multiple agents"
        echo "    mugiwara install --all           Install all available agents"
        echo "    mugiwara install zorro --force   Force reinstall"
        echo ""
        return 1
    fi

    # Fetch registry
    info "Fetching agent registry..."
    if ! registry_fetch; then
        error "Failed to fetch registry"
        return 1
    fi

    # If --all, get all agents from registry
    if [[ "$install_all" == "1" ]]; then
        mapfile -t agents < <(registry_list_agents)
        if [[ ${#agents[@]} -eq 0 ]]; then
            error "No agents found in registry"
            return 1
        fi
        info "Installing all ${#agents[@]} agents..."
    fi

    echo ""

    # Install each agent
    local installed=0
    local failed=0
    local skipped=0

    for agent in "${agents[@]}"; do
        if install_agent "$agent" "$force"; then
            installed=$((installed + 1))
        else
            # Check if it was skipped (already installed) vs failed
            if is_installed "$agent"; then
                skipped=$((skipped + 1))
            else
                failed=$((failed + 1))
            fi
        fi
    done

    # Summary
    echo ""
    echo "  ──────────────────────────────────────"
    echo -e "  ${GREEN}Installed: $installed${NC} | ${YELLOW}Skipped: $skipped${NC} | ${RED}Failed: $failed${NC}"
    echo ""

    if [[ "$failed" -gt 0 ]]; then
        return 1
    fi
    return 0
}
