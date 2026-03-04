#!/bin/bash
# ============================================================
# Mugiwara CLI - Info Command
# mugiwara info <agent>
# ============================================================

cmd_info() {
    local agent=""

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --*)
                error "Unknown option: $1"
                return 1
                ;;
            *)
                agent="$1"
                shift
                ;;
        esac
    done

    if [[ -z "$agent" ]]; then
        echo ""
        echo -e "  ${BOLD}Usage:${NC} mugiwara info <agent>"
        echo ""
        echo "  Show detailed information about an agent."
        echo ""
        return 1
    fi

    # Validate name
    if ! validate_agent_name "$agent"; then
        return 1
    fi

    # Fetch registry
    registry_fetch || true

    echo ""
    echo -e "  ${YELLOW}Agent Information${NC}"
    echo "  ──────────────────────────────────────"

    # Check registry
    local reg_version reg_desc reg_category reg_checksum
    reg_version=$(registry_agent_get "$agent" "version" 2>/dev/null || echo "")
    reg_desc=$(registry_agent_get "$agent" "description" 2>/dev/null || echo "")
    reg_category=$(registry_agent_get "$agent" "category" 2>/dev/null || echo "")
    reg_checksum=$(registry_agent_get "$agent" "checksum" 2>/dev/null || echo "")

    if [[ -z "$reg_version" ]]; then
        error "Agent '$agent' not found in registry"
        return 1
    fi

    echo ""
    echo -e "  ${BOLD}Name:${NC}        $agent"
    echo -e "  ${BOLD}Version:${NC}     $reg_version"
    echo -e "  ${BOLD}Description:${NC} $reg_desc"
    echo -e "  ${BOLD}Category:${NC}    $reg_category"

    if [[ -n "$reg_checksum" ]]; then
        echo -e "  ${BOLD}Checksum:${NC}    $reg_checksum"
    fi

    # Check installation status
    echo ""
    if is_installed "$agent"; then
        local installed_ver
        installed_ver=$(installed_version "$agent")
        echo -e "  ${BOLD}Status:${NC}      ${GREEN}Installed${NC} ($installed_ver)"

        local lock
        lock=$(lock_file_path "$agent")
        local installed_at
        installed_at=$(yaml_get "$lock" "installed_at")
        if [[ -n "$installed_at" ]]; then
            echo -e "  ${BOLD}Installed:${NC}   $installed_at"
        fi

        # Check for updates
        if version_gt "$reg_version" "$installed_ver" 2>/dev/null; then
            echo -e "  ${BOLD}Update:${NC}      ${CYAN}$reg_version available${NC}"
        fi
    elif [[ -d "$SKILLS_DIR/$agent" ]]; then
        echo -e "  ${BOLD}Status:${NC}      ${YELLOW}Legacy (installed via install.sh)${NC}"
    else
        echo -e "  ${BOLD}Status:${NC}      ${BLUE}Available (not installed)${NC}"
    fi

    # Try to download and show manifest details
    local manifest_tmp="$CACHE_DIR/${agent}.mugiwara.yaml"
    if registry_download_manifest "$agent" "$manifest_tmp" 2>/dev/null; then
        local depends
        depends=$(manifest_get_depends "$manifest_tmp")
        if [[ -n "$depends" ]]; then
            echo ""
            echo -e "  ${BOLD}Dependencies:${NC}"
            while IFS= read -r dep; do
                if [[ -n "$dep" ]]; then
                    local dep_status=""
                    if is_installed "$dep" || [[ -d "$SKILLS_DIR/$dep" ]]; then
                        dep_status="${GREEN}(installed)${NC}"
                    else
                        dep_status="${RED}(not installed)${NC}"
                    fi
                    echo -e "    - $dep $dep_status"
                fi
            done <<< "$depends"
        fi

        local tags
        tags=$(manifest_get_tags "$manifest_tmp")
        if [[ -n "$tags" ]]; then
            echo -e "  ${BOLD}Tags:${NC}        $(echo "$tags" | tr '\n' ', ' | sed 's/,$//')"
        fi
    fi

    echo ""
    return 0
}
