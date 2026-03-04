#!/bin/bash
# ============================================================
# Mugiwara Agents - Manifest Parser
# Parses mugiwara.yaml manifest files
# ============================================================

# Source core if not already loaded
if [[ -z "${MUGIWARA_VERSION:-}" ]]; then
    LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$LIB_DIR/core.sh"
fi

# ── Manifest accessors ───────────────────────────────────────

manifest_get_name() {
    yaml_get "$1" "name"
}

manifest_get_version() {
    yaml_get "$1" "version"
}

manifest_get_description() {
    yaml_get "$1" "description"
}

manifest_get_category() {
    yaml_get "$1" "category" "uncategorized"
}

manifest_get_author() {
    yaml_get "$1" "author" "unknown"
}

manifest_get_files() {
    yaml_get_list "$1" "files"
}

manifest_get_depends() {
    yaml_get_list "$1" "depends"
}

manifest_get_tags() {
    yaml_get_list "$1" "tags"
}

# ── Manifest checksum section ────────────────────────────────

# Get checksum for a specific file from the manifest
manifest_get_file_checksum() {
    local manifest="$1"
    local filename="$2"

    if [[ ! -f "$manifest" ]]; then
        echo ""
        return
    fi

    local in_checksum=0
    while IFS= read -r line; do
        if [[ "$line" == "checksum:" ]]; then
            in_checksum=1
            continue
        fi
        if [[ "$in_checksum" == "1" ]]; then
            if [[ "$line" =~ ^[a-z] ]]; then
                break
            fi
            if [[ "$line" =~ ^[[:space:]]+${filename}:[[:space:]]+(.*) ]]; then
                local value="${BASH_REMATCH[1]}"
                value=$(echo "$value" | sed 's/^"//' | sed 's/"$//' | sed "s/^'//" | sed "s/'$//")
                if [[ -n "$value" ]]; then
                    echo "$value"
                fi
                return
            fi
        fi
    done < "$manifest"
}

# ── Manifest validation ──────────────────────────────────────

validate_manifest() {
    local manifest="$1"

    if [[ ! -f "$manifest" ]]; then
        error "Manifest file not found: $manifest"
        return 1
    fi

    local name
    name=$(manifest_get_name "$manifest")
    if [[ -z "$name" ]]; then
        error "Manifest missing required field: name"
        return 1
    fi

    if ! validate_agent_name "$name" 2>/dev/null; then
        error "Manifest has invalid agent name: $name"
        return 1
    fi

    local version
    version=$(manifest_get_version "$manifest")
    if [[ -z "$version" ]]; then
        error "Manifest missing required field: version"
        return 1
    fi

    if [[ ! "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+ ]]; then
        error "Manifest has invalid version format: $version (expected semver)"
        return 1
    fi

    local files
    files=$(manifest_get_files "$manifest")
    if [[ -z "$files" ]]; then
        error "Manifest has no files listed"
        return 1
    fi

    verbose "Manifest valid: $name@$version"
    return 0
}

# ── Manifest display ─────────────────────────────────────────

manifest_print_info() {
    local manifest="$1"

    local name version description category author
    name=$(manifest_get_name "$manifest")
    version=$(manifest_get_version "$manifest")
    description=$(manifest_get_description "$manifest")
    category=$(manifest_get_category "$manifest")
    author=$(manifest_get_author "$manifest")

    echo ""
    echo -e "  ${BOLD}${name}${NC} @ ${CYAN}${version}${NC}"
    echo -e "  ${DIM}${description}${NC}"
    echo ""
    echo -e "  Category : ${category}"
    echo -e "  Author   : ${author}"

    local depends
    depends=$(manifest_get_depends "$manifest")
    if [[ -n "$depends" ]]; then
        echo -e "  Depends  : $(echo "$depends" | tr '\n' ', ' | sed 's/,$//')"
    fi

    local tags
    tags=$(manifest_get_tags "$manifest")
    if [[ -n "$tags" ]]; then
        echo -e "  Tags     : $(echo "$tags" | tr '\n' ', ' | sed 's/,$//')"
    fi

    local files
    files=$(manifest_get_files "$manifest")
    if [[ -n "$files" ]]; then
        echo -e "  Files    : $(echo "$files" | tr '\n' ', ' | sed 's/,$//')"
    fi

    echo ""
}
