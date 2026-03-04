#!/bin/bash
# ============================================================
# Mugiwara Agents - Installer Module
# Handles agent installation, uninstallation, and updates
# ============================================================

# Source dependencies if not already loaded
if [[ -z "${MUGIWARA_VERSION:-}" ]]; then
    LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$LIB_DIR/core.sh"
    source "$LIB_DIR/registry.sh"
    source "$LIB_DIR/manifest.sh"
fi

# ── Lock file management ─────────────────────────────────────

lock_file_path() {
    local agent="$1"
    echo "$INSTALLED_DIR/${agent}.lock"
}

is_installed() {
    local agent="$1"
    [[ -f "$(lock_file_path "$agent")" ]]
}

installed_version() {
    local agent="$1"
    local lock
    lock=$(lock_file_path "$agent")
    if [[ -f "$lock" ]]; then
        yaml_get "$lock" "version"
    fi
}

write_lock() {
    local agent="$1"
    local version="$2"
    local checksum="${3:-}"
    local lock
    lock=$(lock_file_path "$agent")

    cat > "$lock" << YAML
name: ${agent}
version: ${version}
installed_at: $(now_iso)
source: github
checksum: ${checksum}
files:
  - ${SKILLS_DIR}/${agent}/SKILL.md
YAML
}

remove_lock() {
    local agent="$1"
    local lock
    lock=$(lock_file_path "$agent")
    rm -f "$lock"
}

# ── List installed agents ────────────────────────────────────

list_installed() {
    local agent
    for lock_file in "$INSTALLED_DIR"/*.lock; do
        if [[ -f "$lock_file" ]]; then
            agent=$(basename "$lock_file" .lock)
            echo "$agent"
        fi
    done
}

# ── Detect legacy (install.sh) installed agents ─────────────

detect_legacy_installed() {
    # Find agents in ~/.claude/skills/ that don't have a .lock file
    # These were installed via install.sh
    local agent
    for skill_dir in "$SKILLS_DIR"/*/; do
        if [[ -d "$skill_dir" ]]; then
            agent=$(basename "$skill_dir")
            if [[ ! -f "$(lock_file_path "$agent")" ]]; then
                echo "$agent"
            fi
        fi
    done
}

# Adopt legacy agents into the lock system
adopt_legacy() {
    local agent="$1"
    if [[ -d "$SKILLS_DIR/$agent" ]] && [[ ! -f "$(lock_file_path "$agent")" ]]; then
        local checksum=""
        if [[ -f "$SKILLS_DIR/$agent/SKILL.md" ]]; then
            checksum=$(compute_checksum "$SKILLS_DIR/$agent/SKILL.md")
        fi
        write_lock "$agent" "legacy" "$checksum"
        verbose "Adopted legacy agent: $agent"
        return 0
    fi
    return 1
}

# ── Install agent ────────────────────────────────────────────

install_agent() {
    local agent="$1"
    local force="${2:-0}"

    # Validate agent name
    if ! validate_agent_name "$agent"; then
        return 1
    fi

    # Check if already installed
    if is_installed "$agent" && [[ "$force" != "1" ]]; then
        local installed_ver
        installed_ver=$(installed_version "$agent")
        local available_ver
        available_ver=$(registry_agent_get "$agent" "version" 2>/dev/null || echo "")

        if [[ -n "$available_ver" ]] && [[ "$installed_ver" == "$available_ver" ]]; then
            info "$agent is already installed ($installed_ver), use --force to reinstall"
            return 0
        fi
    fi

    # Check agent exists in registry
    local remote_version
    remote_version=$(registry_agent_get "$agent" "version" 2>/dev/null)
    if [[ -z "$remote_version" ]]; then
        error "Agent '$agent' not found in registry"
        return 1
    fi

    verbose "Installing $agent@$remote_version"

    # Download manifest
    local manifest_tmp="$CACHE_DIR/${agent}.mugiwara.yaml"
    if ! registry_download_manifest "$agent" "$manifest_tmp"; then
        error "Failed to download manifest for $agent"
        return 1
    fi

    # Validate manifest
    if ! validate_manifest "$manifest_tmp"; then
        return 1
    fi

    # Check dependencies
    local deps
    deps=$(manifest_get_depends "$manifest_tmp")
    if [[ -n "$deps" ]]; then
        while IFS= read -r dep; do
            if [[ -n "$dep" ]] && ! is_installed "$dep"; then
                # Check if dep exists in skills dir (legacy)
                if [[ ! -d "$SKILLS_DIR/$dep" ]]; then
                    warn "Dependency '$dep' is not installed, installing..."
                    install_agent "$dep" "$force" || {
                        error "Failed to install dependency: $dep"
                        return 1
                    }
                fi
            fi
        done <<< "$deps"
    fi

    # Create target directory
    mkdir -p "$SKILLS_DIR/$agent"

    # Download and install files
    local files
    files=$(manifest_get_files "$manifest_tmp")
    if [[ -z "$files" ]]; then
        files="SKILL.md"  # Default
    fi

    local checksum=""
    while IFS= read -r file; do
        if [[ -n "$file" ]]; then
            local dest="$SKILLS_DIR/$agent/$file"
            mkdir -p "$(dirname "$dest")"

            if ! registry_download_file "$agent" "$file" "$dest"; then
                error "Failed to download $file for $agent"
                return 1
            fi

            # Verify checksum if available
            local expected_checksum
            expected_checksum=$(manifest_get_file_checksum "$manifest_tmp" "$file")
            if [[ -n "$expected_checksum" ]]; then
                if ! verify_checksum "$dest" "$expected_checksum"; then
                    rm -f "$dest"
                    return 1
                fi
            fi

            # Compute checksum for lock file (first file only)
            if [[ -z "$checksum" ]]; then
                checksum=$(compute_checksum "$dest")
            fi
        fi
    done <<< "$files"

    # Write lock file
    write_lock "$agent" "$remote_version" "$checksum"

    success "$agent@$remote_version installed"
    return 0
}

# ── Install from local source ────────────────────────────────
# Used for local development / dual support with install.sh

install_agent_local() {
    local agent="$1"
    local source_dir="$2"
    local force="${3:-0}"

    if [[ ! -d "$source_dir" ]]; then
        error "Source directory not found: $source_dir"
        return 1
    fi

    # Check if already installed
    if is_installed "$agent" && [[ "$force" != "1" ]]; then
        info "$agent is already installed, use --force to reinstall"
        return 0
    fi

    # Create target directory and copy files
    mkdir -p "$SKILLS_DIR/$agent"
    cp -r "$source_dir/"* "$SKILLS_DIR/$agent/"

    # Determine version from manifest if available
    local version="local"
    if [[ -f "$source_dir/mugiwara.yaml" ]]; then
        version=$(manifest_get_version "$source_dir/mugiwara.yaml")
        version="${version:-local}"
    fi

    # Compute checksum
    local checksum=""
    if [[ -f "$SKILLS_DIR/$agent/SKILL.md" ]]; then
        checksum=$(compute_checksum "$SKILLS_DIR/$agent/SKILL.md")
    fi

    write_lock "$agent" "$version" "$checksum"
    success "$agent@$version installed (local)"
    return 0
}

# ── Uninstall agent ──────────────────────────────────────────

uninstall_agent() {
    local agent="$1"

    if ! is_installed "$agent" && [[ ! -d "$SKILLS_DIR/$agent" ]]; then
        warn "$agent is not installed"
        return 0
    fi

    # Remove skill files
    if [[ -d "$SKILLS_DIR/$agent" ]]; then
        rm -rf "$SKILLS_DIR/$agent"
        verbose "Removed $SKILLS_DIR/$agent"
    fi

    # Remove lock file
    remove_lock "$agent"

    # Remove cached manifest
    rm -f "$CACHE_DIR/${agent}.mugiwara.yaml"

    success "$agent uninstalled"
    return 0
}

# ── Update agent ─────────────────────────────────────────────

update_agent() {
    local agent="$1"

    if ! is_installed "$agent"; then
        # Check legacy
        if [[ -d "$SKILLS_DIR/$agent" ]]; then
            verbose "Adopting legacy agent $agent before update"
            adopt_legacy "$agent"
        else
            warn "$agent is not installed, use 'mugiwara install $agent' instead"
            return 1
        fi
    fi

    local installed_ver
    installed_ver=$(installed_version "$agent")

    local available_ver
    available_ver=$(registry_agent_get "$agent" "version" 2>/dev/null)

    if [[ -z "$available_ver" ]]; then
        warn "$agent not found in remote registry, skipping"
        return 0
    fi

    # Compare versions
    if [[ "$installed_ver" == "legacy" ]] || version_gt "$available_ver" "$installed_ver"; then
        info "Updating $agent: $installed_ver -> $available_ver"
        install_agent "$agent" "1"
        return $?
    else
        verbose "$agent is up to date ($installed_ver)"
        return 0
    fi
}
