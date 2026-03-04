#!/bin/bash
# ============================================================
# Mugiwara CLI - List Command
# mugiwara list [--installed|--available|--category <cat>]
# ============================================================

cmd_list() {
    local filter="all"  # all, installed, available
    local category_filter=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --installed|-i)
                filter="installed"
                shift
                ;;
            --available|-a)
                filter="available"
                shift
                ;;
            --category|-c)
                category_filter="$2"
                shift 2
                ;;
            --*)
                error "Unknown option: $1"
                return 1
                ;;
            *)
                error "Unexpected argument: $1"
                return 1
                ;;
        esac
    done

    # Fetch registry (unless only listing installed)
    if [[ "$filter" != "installed" ]]; then
        verbose "Fetching registry..."
        registry_fetch || true
    fi

    echo ""
    echo -e "  ${YELLOW}MUGIWARA AGENTS${NC}"
    echo "  ──────────────────────────────────────────────────────────────"
    echo ""

    # Table header
    printf "  ${BOLD}%-20s %-10s %-12s %-15s${NC}\n" "Name" "Version" "Status" "Category"
    printf "  %-20s %-10s %-12s %-15s\n" "────" "───────" "──────" "────────"

    local count_installed=0
    local count_available=0
    local count_total=0

    # Build a combined list of agents
    # 1. Get registry agents
    local registry_agents=()
    if [[ -f "$(registry_cache_file)" ]]; then
        mapfile -t registry_agents < <(registry_list_agents)
    fi

    # 2. Get installed agents (from locks)
    local installed_agents=()
    mapfile -t installed_agents < <(list_installed)

    # 3. Get legacy agents (installed via install.sh, no lock)
    local legacy_agents=()
    mapfile -t legacy_agents < <(detect_legacy_installed)

    # Build combined unique list
    declare -A seen
    local all_agents=()

    for agent in "${installed_agents[@]}" "${legacy_agents[@]}" "${registry_agents[@]}"; do
        if [[ -n "$agent" ]] && [[ -z "${seen[$agent]:-}" ]]; then
            seen[$agent]=1
            all_agents+=("$agent")
        fi
    done

    # Sort
    IFS=$'\n' sorted_agents=($(sort <<< "${all_agents[*]}")); unset IFS

    # Display
    for agent in "${sorted_agents[@]}"; do
        if [[ -z "$agent" ]]; then
            continue
        fi

        local version=""
        local status=""
        local category=""
        local status_color=""

        # Determine status
        if is_installed "$agent"; then
            local installed_ver
            installed_ver=$(installed_version "$agent")
            version="$installed_ver"
            status="installed"
            status_color="${GREEN}"
            count_installed=$((count_installed + 1))
        elif [[ -d "$SKILLS_DIR/$agent" ]]; then
            # Legacy installed
            version="legacy"
            status="legacy"
            status_color="${YELLOW}"
            count_installed=$((count_installed + 1))
        else
            status="available"
            status_color="${BLUE}"
            count_available=$((count_available + 1))
        fi

        # Get registry version and category
        local registry_ver=""
        registry_ver=$(registry_agent_get "$agent" "version" 2>/dev/null || echo "")
        local registry_cat=""
        registry_cat=$(registry_agent_get "$agent" "category" 2>/dev/null || echo "")

        if [[ -n "$registry_ver" ]] && [[ "$status" == "available" ]]; then
            version="$registry_ver"
        fi
        if [[ -n "$registry_cat" ]]; then
            category="$registry_cat"
        fi

        # Check for update available
        if [[ "$status" == "installed" ]] && [[ -n "$registry_ver" ]]; then
            if [[ "$version" != "$registry_ver" ]] && version_gt "$registry_ver" "$version" 2>/dev/null; then
                status="update"
                status_color="${CYAN}"
            fi
        fi

        # Apply filters
        if [[ "$filter" == "installed" ]] && [[ "$status" != "installed" ]] && [[ "$status" != "legacy" ]] && [[ "$status" != "update" ]]; then
            continue
        fi
        if [[ "$filter" == "available" ]] && [[ "$status" != "available" ]]; then
            continue
        fi
        if [[ -n "$category_filter" ]] && [[ "$category" != "$category_filter" ]]; then
            continue
        fi

        count_total=$((count_total + 1))

        # Format status display
        local status_display="$status"
        if [[ "$status" == "update" ]]; then
            status_display="update"
        fi

        printf "  %-20s %-10s ${status_color}%-12s${NC} %-15s\n" \
            "$agent" "$version" "$status_display" "$category"
    done

    echo ""
    echo "  ──────────────────────────────────────────────────────────────"
    echo -e "  ${GREEN}Installed: $count_installed${NC} | ${BLUE}Available: $count_available${NC} | Total: $count_total"
    echo ""

    return 0
}
