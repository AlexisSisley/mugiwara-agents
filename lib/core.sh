#!/bin/bash
# ============================================================
# Mugiwara Agents - Core Library
# Shared functions for the mugiwara CLI
# ============================================================

# ── Constants ────────────────────────────────────────────────
MUGIWARA_VERSION="1.5.0"
MUGIWARA_HOME="${MUGIWARA_HOME:-$HOME/.mugiwara}"
SKILLS_DIR="${SKILLS_DIR:-$HOME/.claude/skills}"
CACHE_DIR="$MUGIWARA_HOME/cache"
INSTALLED_DIR="$MUGIWARA_HOME/installed"
CONFIG_FILE="$MUGIWARA_HOME/config.yaml"

# Default registry settings
DEFAULT_REGISTRY_REPO="AlexisSisley/mugiwara-agents"
DEFAULT_REGISTRY_BRANCH="main"
CACHE_TTL=3600  # 1 hour in seconds

# ── Colors (sourced from shared constants) ───────────────────
LIB_DIR_CORE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$LIB_DIR_CORE/colors.sh"

# ── Output helpers ───────────────────────────────────────────
info() {
    echo -e "  ${BLUE}[i]${NC} $1"
}

success() {
    echo -e "  ${GREEN}[+]${NC} $1"
}

warn() {
    echo -e "  ${YELLOW}[!]${NC} $1"
}

error() {
    echo -e "  ${RED}[x]${NC} $1" >&2
}

verbose() {
    if [[ "${VERBOSE:-0}" == "1" ]]; then
        echo -e "  ${DIM}[~] $1${NC}"
    fi
}

# ── Init ─────────────────────────────────────────────────────
mugiwara_init() {
    mkdir -p "$MUGIWARA_HOME"
    mkdir -p "$CACHE_DIR"
    mkdir -p "$INSTALLED_DIR"
    mkdir -p "$SKILLS_DIR"

    # Create default config if it doesn't exist
    if [[ ! -f "$CONFIG_FILE" ]]; then
        cat > "$CONFIG_FILE" << 'YAML'
# Mugiwara CLI Configuration
registry:
  repo: AlexisSisley/mugiwara-agents
  branch: main
cache:
  ttl: 3600
YAML
    fi
}

# ── YAML mini-parser ─────────────────────────────────────────
# Parses simple flat YAML (key: value) from a file.
# Handles quoted and unquoted values, strips comments.
# Does NOT handle nested YAML or arrays -- use yaml_get_list for arrays.

yaml_get() {
    local file="$1"
    local key="$2"
    local default="${3:-}"

    if [[ ! -f "$file" ]]; then
        echo "$default"
        return
    fi

    local value
    value=$(grep -m1 "^${key}:" "$file" 2>/dev/null | sed "s/^${key}:[[:space:]]*//" | sed 's/^"//' | sed 's/"$//' | sed "s/^'//" | sed "s/'$//" | sed 's/[[:space:]]*#.*//' | sed 's/[[:space:]]*$//')

    if [[ -z "$value" ]]; then
        echo "$default"
    else
        echo "$value"
    fi
}

# Parse a YAML list (items starting with "  - ")
yaml_get_list() {
    local file="$1"
    local key="$2"

    if [[ ! -f "$file" ]]; then
        return
    fi

    local in_section=0
    while IFS= read -r line; do
        # Check if we've reached the key's section
        if [[ "$line" =~ ^${key}: ]]; then
            in_section=1
            continue
        fi

        # If in section, collect list items
        if [[ "$in_section" == "1" ]]; then
            # Stop at next top-level key or empty line
            if [[ "$line" =~ ^[a-z] ]] || [[ -z "$line" ]]; then
                break
            fi
            # Extract list item
            if [[ "$line" =~ ^[[:space:]]*-[[:space:]]+(.*) ]]; then
                echo "${BASH_REMATCH[1]}"
            fi
        fi
    done < "$file"
}

# ── Config helpers ───────────────────────────────────────────
config_get() {
    local key="$1"
    local default="${2:-}"
    yaml_get "$CONFIG_FILE" "$key" "$default"
}

get_registry_repo() {
    config_get "repo" "$DEFAULT_REGISTRY_REPO"
}

get_registry_branch() {
    config_get "branch" "$DEFAULT_REGISTRY_BRANCH"
}

# ── Agent name validation ────────────────────────────────────
validate_agent_name() {
    local name="$1"
    if [[ ! "$name" =~ ^[a-z][a-z0-9_-]*$ ]]; then
        error "Invalid agent name: '$name' (must match ^[a-z][a-z0-9_-]*$)"
        return 1
    fi
    return 0
}

# ── Timestamp helpers ────────────────────────────────────────
now_iso() {
    date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u "+%Y-%m-%dT%H:%M:%SZ"
}

now_epoch() {
    date +%s 2>/dev/null
}

file_age_seconds() {
    local file="$1"
    if [[ ! -f "$file" ]]; then
        echo "999999"
        return
    fi

    local file_mtime
    # Try GNU stat first, then BSD stat
    file_mtime=$(stat -c %Y "$file" 2>/dev/null || stat -f %m "$file" 2>/dev/null || echo "0")
    local now
    now=$(now_epoch)
    echo $(( now - file_mtime ))
}

# ── Checksum helpers ─────────────────────────────────────────
compute_checksum() {
    local file="$1"
    if command -v sha256sum &>/dev/null; then
        sha256sum "$file" | cut -d' ' -f1
    elif command -v shasum &>/dev/null; then
        shasum -a 256 "$file" | cut -d' ' -f1
    else
        warn "No sha256sum or shasum available, skipping checksum"
        echo ""
    fi
}

verify_checksum() {
    local file="$1"
    local expected="$2"

    if [[ -z "$expected" ]]; then
        verbose "No checksum to verify, skipping"
        return 0
    fi

    local actual
    actual=$(compute_checksum "$file")

    if [[ -z "$actual" ]]; then
        warn "Cannot compute checksum, skipping verification"
        return 0
    fi

    if [[ "$actual" != "$expected" ]]; then
        error "Checksum mismatch for $file"
        error "  Expected: $expected"
        error "  Actual:   $actual"
        return 1
    fi

    verbose "Checksum OK: $file"
    return 0
}

# ── Version comparison ───────────────────────────────────────
# Returns 0 if v1 >= v2, 1 otherwise
version_gte() {
    local v1="$1"
    local v2="$2"

    if [[ "$v1" == "$v2" ]]; then
        return 0
    fi

    local IFS=.
    local i v1_parts=($v1) v2_parts=($v2)

    for ((i=0; i<${#v1_parts[@]}; i++)); do
        local n1="${v1_parts[i]:-0}"
        local n2="${v2_parts[i]:-0}"
        if (( n1 > n2 )); then
            return 0
        elif (( n1 < n2 )); then
            return 1
        fi
    done

    return 0
}

# Returns 0 if v1 > v2
version_gt() {
    local v1="$1"
    local v2="$2"

    if [[ "$v1" == "$v2" ]]; then
        return 1
    fi

    version_gte "$v1" "$v2"
}
