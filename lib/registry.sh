#!/bin/bash
# ============================================================
# Mugiwara Agents - Registry Module
# Manages the remote registry and local cache
# ============================================================

# Source core if not already loaded
if [[ -z "${MUGIWARA_VERSION:-}" ]]; then
    LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    source "$LIB_DIR/core.sh"
fi

# ── Registry URL helpers ─────────────────────────────────────
registry_raw_url() {
    local repo
    repo=$(get_registry_repo)
    local branch
    branch=$(get_registry_branch)
    echo "https://raw.githubusercontent.com/${repo}/${branch}"
}

registry_api_url() {
    local repo
    repo=$(get_registry_repo)
    echo "https://api.github.com/repos/${repo}"
}

# ── Registry cache ───────────────────────────────────────────
registry_cache_file() {
    echo "$CACHE_DIR/registry.yaml"
}

registry_cache_valid() {
    local cache_file
    cache_file=$(registry_cache_file)

    if [[ ! -f "$cache_file" ]]; then
        return 1
    fi

    local age
    age=$(file_age_seconds "$cache_file")
    if (( age > CACHE_TTL )); then
        verbose "Registry cache expired (age: ${age}s, TTL: ${CACHE_TTL}s)"
        return 1
    fi

    verbose "Registry cache valid (age: ${age}s)"
    return 0
}

# ── Fetch registry ───────────────────────────────────────────
registry_fetch() {
    local force="${1:-0}"
    local cache_file
    cache_file=$(registry_cache_file)

    # Check if we're in offline mode
    if [[ "${OFFLINE:-0}" == "1" ]]; then
        if [[ -f "$cache_file" ]]; then
            verbose "Offline mode: using cached registry"
            return 0
        else
            error "Offline mode: no cached registry available"
            return 1
        fi
    fi

    # Check cache validity
    if [[ "$force" != "1" ]] && registry_cache_valid; then
        return 0
    fi

    local url
    url="$(registry_raw_url)/registry.yaml"
    verbose "Fetching registry from: $url"

    local http_code
    http_code=$(curl -sL -w "%{http_code}" -o "$cache_file.tmp" \
        --connect-timeout 10 \
        --max-time 30 \
        "$url" 2>/dev/null)

    if [[ "$http_code" == "200" ]] && [[ -s "$cache_file.tmp" ]]; then
        mv "$cache_file.tmp" "$cache_file"
        verbose "Registry fetched successfully"
        return 0
    else
        rm -f "$cache_file.tmp"
        if [[ -f "$cache_file" ]]; then
            warn "Failed to fetch registry (HTTP $http_code), using cached version"
            return 0
        else
            error "Failed to fetch registry (HTTP $http_code) and no cache available"
            return 1
        fi
    fi
}

# ── Query registry ───────────────────────────────────────────

# List all agent names from the registry
registry_list_agents() {
    local cache_file
    cache_file=$(registry_cache_file)

    if [[ ! -f "$cache_file" ]]; then
        return 1
    fi

    # Parse agent names from registry.yaml (lines matching "  <name>:" under "agents:")
    local in_agents=0
    while IFS= read -r line; do
        if [[ "$line" == "agents:" ]]; then
            in_agents=1
            continue
        fi
        if [[ "$in_agents" == "1" ]]; then
            # Top-level keys under agents are agent names (2-space indent, no further indent)
            if [[ "$line" =~ ^[[:space:]]{2}([a-z][a-z0-9_-]*): ]]; then
                echo "${BASH_REMATCH[1]}"
            fi
        fi
    done < "$cache_file"
}

# Get a field for an agent from the registry
registry_agent_get() {
    local agent="$1"
    local field="$2"
    local cache_file
    cache_file=$(registry_cache_file)

    if [[ ! -f "$cache_file" ]]; then
        return 1
    fi

    local in_agent=0
    while IFS= read -r line; do
        # Look for the agent entry (2-space indent)
        if [[ "$line" =~ ^[[:space:]]{2}${agent}:[[:space:]]*$ ]]; then
            in_agent=1
            continue
        fi
        if [[ "$in_agent" == "1" ]]; then
            # Check for end of agent block (next agent at 2-space or end of file)
            if [[ "$line" =~ ^[[:space:]]{2}[a-z] ]] && [[ ! "$line" =~ ^[[:space:]]{4} ]]; then
                break
            fi
            # Extract field value (4-space indent)
            if [[ "$line" =~ ^[[:space:]]{4}${field}:[[:space:]]+(.*) ]]; then
                local value="${BASH_REMATCH[1]}"
                # Strip quotes
                value=$(echo "$value" | sed 's/^"//' | sed 's/"$//' | sed "s/^'//" | sed "s/'$//")
                echo "$value"
                return 0
            fi
        fi
    done < "$cache_file"

    return 1
}

# ── Download agent files ─────────────────────────────────────

# Download a single file from the remote registry
registry_download_file() {
    local agent="$1"
    local filename="$2"
    local dest="$3"

    local url
    url="$(registry_raw_url)/skills/${agent}/${filename}"
    verbose "Downloading: $url -> $dest"

    local http_code
    http_code=$(curl -sL -w "%{http_code}" -o "$dest.tmp" \
        --connect-timeout 10 \
        --max-time 30 \
        "$url" 2>/dev/null)

    if [[ "$http_code" == "200" ]] && [[ -s "$dest.tmp" ]]; then
        mv "$dest.tmp" "$dest"
        return 0
    else
        rm -f "$dest.tmp"
        error "Failed to download $filename for $agent (HTTP $http_code)"
        return 1
    fi
}

# Download the manifest (mugiwara.yaml) for an agent
registry_download_manifest() {
    local agent="$1"
    local dest="${2:-$CACHE_DIR/${agent}.mugiwara.yaml}"

    registry_download_file "$agent" "mugiwara.yaml" "$dest"
}
