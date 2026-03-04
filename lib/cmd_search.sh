#!/bin/bash
# ============================================================
# Mugiwara CLI - Search Command
# mugiwara search <query>
# ============================================================

cmd_search() {
    local query=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --*)
                error "Unknown option: $1"
                return 1
                ;;
            *)
                if [[ -z "$query" ]]; then
                    query="$1"
                else
                    query="$query $1"
                fi
                shift
                ;;
        esac
    done

    if [[ -z "$query" ]]; then
        echo ""
        echo -e "  ${BOLD}Usage:${NC} mugiwara search <query>"
        echo ""
        echo "  Search agents by name, description, or category."
        echo ""
        echo "  Examples:"
        echo "    mugiwara search qa          Search for QA agents"
        echo "    mugiwara search devops       Search for DevOps agents"
        echo "    mugiwara search pipeline     Search for pipelines"
        echo ""
        return 1
    fi

    # Fetch registry
    registry_fetch || true

    local query_lower
    query_lower=$(echo "$query" | tr '[:upper:]' '[:lower:]')

    echo ""
    echo -e "  ${YELLOW}Search results for:${NC} $query"
    echo "  ──────────────────────────────────────────────────────────────"
    echo ""

    printf "  ${BOLD}%-20s %-10s %-15s %-30s${NC}\n" "Name" "Version" "Category" "Description"
    printf "  %-20s %-10s %-15s %-30s\n" "────" "───────" "────────" "───────────"

    local count=0
    local registry_agents=()
    if [[ -f "$(registry_cache_file)" ]]; then
        mapfile -t registry_agents < <(registry_list_agents)
    fi

    for agent in "${registry_agents[@]}"; do
        if [[ -z "$agent" ]]; then
            continue
        fi

        local name_lower
        name_lower=$(echo "$agent" | tr '[:upper:]' '[:lower:]')
        local desc
        desc=$(registry_agent_get "$agent" "description" 2>/dev/null || echo "")
        local desc_lower
        desc_lower=$(echo "$desc" | tr '[:upper:]' '[:lower:]')
        local cat
        cat=$(registry_agent_get "$agent" "category" 2>/dev/null || echo "")
        local cat_lower
        cat_lower=$(echo "$cat" | tr '[:upper:]' '[:lower:]')

        # Match against name, description, category
        if [[ "$name_lower" == *"$query_lower"* ]] || \
           [[ "$desc_lower" == *"$query_lower"* ]] || \
           [[ "$cat_lower" == *"$query_lower"* ]]; then

            local version
            version=$(registry_agent_get "$agent" "version" 2>/dev/null || echo "")

            # Truncate description for display
            local desc_short
            if [[ ${#desc} -gt 28 ]]; then
                desc_short="${desc:0:25}..."
            else
                desc_short="$desc"
            fi

            local status_indicator=""
            if is_installed "$agent"; then
                status_indicator="${GREEN}*${NC}"
            fi

            printf "  ${status_indicator}%-20s %-10s %-15s %-30s\n" \
                "$agent" "$version" "$cat" "$desc_short"

            count=$((count + 1))
        fi
    done

    echo ""
    if [[ "$count" -eq 0 ]]; then
        echo -e "  ${DIM}No agents found matching '$query'${NC}"
    else
        echo -e "  ${DIM}Found $count agent(s). ${GREEN}*${NC}${DIM} = installed${NC}"
    fi
    echo ""

    return 0
}
