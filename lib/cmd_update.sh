#!/bin/bash
# ============================================================
# Mugiwara CLI - Update Command
# mugiwara update [agent] [--all]
# ============================================================

cmd_update() {
    local agents=()
    local update_all=0

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --all)
                update_all=1
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

    # Fetch fresh registry
    info "Refreshing agent registry..."
    if ! registry_fetch "1"; then
        error "Failed to refresh registry"
        return 1
    fi

    # If no agents specified and not --all, update all installed
    if [[ ${#agents[@]} -eq 0 ]]; then
        update_all=1
    fi

    if [[ "$update_all" == "1" ]]; then
        # Get all installed agents (lock + legacy)
        mapfile -t agents < <(list_installed)

        # Also include legacy agents
        local legacy
        mapfile -t legacy < <(detect_legacy_installed)
        agents+=("${legacy[@]}")

        if [[ ${#agents[@]} -eq 0 ]]; then
            info "No agents installed. Use 'mugiwara install <agent>' to install agents."
            return 0
        fi

        info "Checking updates for ${#agents[@]} installed agents..."
    fi

    echo ""

    local updated=0
    local up_to_date=0
    local failed=0

    for agent in "${agents[@]}"; do
        if [[ -z "$agent" ]]; then
            continue
        fi

        local installed_ver
        installed_ver=$(installed_version "$agent")
        if [[ -z "$installed_ver" ]] && [[ -d "$SKILLS_DIR/$agent" ]]; then
            installed_ver="legacy"
        fi

        local available_ver
        available_ver=$(registry_agent_get "$agent" "version" 2>/dev/null)

        if [[ -z "$available_ver" ]]; then
            verbose "$agent: not in registry, skipping"
            continue
        fi

        if [[ "$installed_ver" == "legacy" ]] || version_gt "$available_ver" "$installed_ver" 2>/dev/null; then
            info "Updating $agent: $installed_ver -> $available_ver"
            if install_agent "$agent" "1"; then
                updated=$((updated + 1))
            else
                failed=$((failed + 1))
            fi
        else
            verbose "$agent is up to date ($installed_ver)"
            up_to_date=$((up_to_date + 1))
        fi
    done

    echo ""
    echo "  ──────────────────────────────────────"
    if [[ "$updated" -eq 0 ]] && [[ "$failed" -eq 0 ]]; then
        echo -e "  ${GREEN}All agents are up to date${NC}"
    else
        echo -e "  ${GREEN}Updated: $updated${NC} | ${DIM}Up to date: $up_to_date${NC} | ${RED}Failed: $failed${NC}"
    fi
    echo ""

    if [[ "$failed" -gt 0 ]]; then
        return 1
    fi
    return 0
}
