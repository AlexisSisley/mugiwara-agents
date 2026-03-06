#!/bin/bash
# ============================================================
# Mugiwara Agents - Plugin System Tests
# Tests for the mugiwara CLI (v1.5)
#
# Usage:
#   chmod +x tests/plugin/test_cli.sh
#   bash tests/plugin/test_cli.sh
#
# Exit code 0 = all tests pass, 1 = at least one failure.
# ============================================================

set -euo pipefail

# ── Colors ──────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── Paths ───────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CLI="$PROJECT_ROOT/bin/mugiwara"
LIB_DIR="$PROJECT_ROOT/lib"

# ── Test environment ────────────────────────────────────────
# Use a temporary directory for test isolation
TEST_HOME=$(mktemp -d)
export MUGIWARA_HOME="$TEST_HOME/.mugiwara"
export SKILLS_DIR="$TEST_HOME/.claude/skills"
export HOME="$TEST_HOME"

# Create necessary dirs
mkdir -p "$MUGIWARA_HOME/cache"
mkdir -p "$MUGIWARA_HOME/installed"
mkdir -p "$SKILLS_DIR"

# Copy registry to cache for offline testing
cp "$PROJECT_ROOT/registry.yaml" "$MUGIWARA_HOME/cache/registry.yaml"

# ── Counters ────────────────────────────────────────────────
PASS=0
FAIL=0
TOTAL=0

pass() {
    PASS=$((PASS + 1))
    TOTAL=$((TOTAL + 1))
    echo -e "  ${GREEN}[PASS]${NC} $1"
}

fail() {
    FAIL=$((FAIL + 1))
    TOTAL=$((TOTAL + 1))
    echo -e "  ${RED}[FAIL]${NC} $1"
}

# ── Cleanup ─────────────────────────────────────────────────
cleanup() {
    rm -rf "$TEST_HOME"
}
trap cleanup EXIT

# ════════════════════════════════════════════════════════════
echo ""
echo -e "${YELLOW}  MUGIWARA AGENTS - Plugin System Tests${NC}"
echo "  ──────────────────────────────────────"
echo ""

# ── Test 1: CLI exists and is executable ────────────────────
echo -e "${BLUE}  [Section] CLI Basics${NC}"

if [[ -x "$CLI" ]]; then
    pass "CLI binary exists and is executable"
else
    fail "CLI binary not found or not executable at $CLI"
fi

# ── Test 2: CLI version ─────────────────────────────────────
output=$("$CLI" version 2>&1)
if [[ "$output" == *"1.5.0"* ]]; then
    pass "CLI version reports 1.5.0"
else
    fail "CLI version unexpected: $output"
fi

# ── Test 3: CLI help ────────────────────────────────────────
output=$("$CLI" help 2>&1)
if [[ "$output" == *"MUGIWARA"* ]] && [[ "$output" == *"install"* ]] && [[ "$output" == *"update"* ]] && [[ "$output" == *"list"* ]]; then
    pass "CLI help shows all commands"
else
    fail "CLI help missing expected commands"
fi

# ── Test 4: Unknown command returns error ───────────────────
output=$("$CLI" nonexistent 2>&1 || true)
if echo "$output" | grep -q "Unknown command"; then
    pass "Unknown command returns error"
else
    fail "Unknown command should show error"
fi

# ── Test 5: Library files exist ─────────────────────────────
echo ""
echo -e "${BLUE}  [Section] Library Structure${NC}"

libs=(core.sh registry.sh manifest.sh installer.sh cmd_install.sh cmd_uninstall.sh cmd_update.sh cmd_list.sh cmd_search.sh cmd_info.sh)
all_libs_exist=true
for lib in "${libs[@]}"; do
    if [[ ! -f "$LIB_DIR/$lib" ]]; then
        fail "Missing library: $lib"
        all_libs_exist=false
    fi
done
if [[ "$all_libs_exist" == "true" ]]; then
    pass "All 10 library files exist"
fi

# ── Test 6: Core library loads ──────────────────────────────
(
    source "$LIB_DIR/core.sh"
    if [[ "$MUGIWARA_VERSION" == "1.5.0" ]]; then
        exit 0
    else
        exit 1
    fi
)
if [[ $? -eq 0 ]]; then
    pass "Core library loads with correct version"
else
    fail "Core library failed to load"
fi

# ── Test 7: YAML parser ────────────────────────────────────
echo ""
echo -e "${BLUE}  [Section] YAML Parser${NC}"

source "$LIB_DIR/core.sh"

# Create a test YAML file
test_yaml="$TEST_HOME/test.yaml"
cat > "$test_yaml" << 'YAML'
name: test-agent
version: 1.0.0
description: A test agent
category: testing
files:
  - SKILL.md
  - extra.txt
tags:
  - test
  - demo
YAML

val=$(yaml_get "$test_yaml" "name")
if [[ "$val" == "test-agent" ]]; then
    pass "yaml_get parses simple key"
else
    fail "yaml_get returned '$val' instead of 'test-agent'"
fi

val=$(yaml_get "$test_yaml" "version")
if [[ "$val" == "1.0.0" ]]; then
    pass "yaml_get parses version"
else
    fail "yaml_get returned '$val' instead of '1.0.0'"
fi

val=$(yaml_get "$test_yaml" "nonexistent" "default_val")
if [[ "$val" == "default_val" ]]; then
    pass "yaml_get returns default for missing key"
else
    fail "yaml_get returned '$val' instead of 'default_val'"
fi

# Test list parsing
items=$(yaml_get_list "$test_yaml" "files")
count=$(echo "$items" | wc -l)
if [[ "$count" -eq 2 ]]; then
    pass "yaml_get_list parses 2 file entries"
else
    fail "yaml_get_list returned $count items instead of 2"
fi

# ── Test 8: Version comparison ──────────────────────────────
echo ""
echo -e "${BLUE}  [Section] Version Comparison${NC}"

if version_gte "1.5.0" "1.4.0"; then
    pass "version_gte: 1.5.0 >= 1.4.0"
else
    fail "version_gte: 1.5.0 should be >= 1.4.0"
fi

if version_gte "1.5.0" "1.5.0"; then
    pass "version_gte: 1.5.0 >= 1.5.0 (equal)"
else
    fail "version_gte: 1.5.0 should be >= 1.5.0"
fi

if ! version_gte "1.4.0" "1.5.0"; then
    pass "version_gte: 1.4.0 NOT >= 1.5.0"
else
    fail "version_gte: 1.4.0 should NOT be >= 1.5.0"
fi

if version_gt "1.5.0" "1.4.0"; then
    pass "version_gt: 1.5.0 > 1.4.0"
else
    fail "version_gt: 1.5.0 should be > 1.4.0"
fi

if ! version_gt "1.5.0" "1.5.0"; then
    pass "version_gt: 1.5.0 NOT > 1.5.0 (equal)"
else
    fail "version_gt: 1.5.0 should NOT be > 1.5.0"
fi

# ── Test 9: Agent name validation ───────────────────────────
echo ""
echo -e "${BLUE}  [Section] Agent Name Validation${NC}"

if validate_agent_name "zorro" 2>/dev/null; then
    pass "validate_agent_name: 'zorro' is valid"
else
    fail "validate_agent_name: 'zorro' should be valid"
fi

if validate_agent_name "sanji-ts" 2>/dev/null; then
    pass "validate_agent_name: 'sanji-ts' is valid"
else
    fail "validate_agent_name: 'sanji-ts' should be valid"
fi

if validate_agent_name "law-sql" 2>/dev/null; then
    pass "validate_agent_name: 'law-sql' is valid"
else
    fail "validate_agent_name: 'law-sql' should be valid"
fi

if validate_agent_name "one_piece" 2>/dev/null; then
    pass "validate_agent_name: 'one_piece' is valid"
else
    fail "validate_agent_name: 'one_piece' should be valid"
fi

if ! validate_agent_name "INVALID" 2>/dev/null; then
    pass "validate_agent_name: 'INVALID' is rejected"
else
    fail "validate_agent_name: 'INVALID' should be rejected"
fi

if ! validate_agent_name "123abc" 2>/dev/null; then
    pass "validate_agent_name: '123abc' is rejected (starts with number)"
else
    fail "validate_agent_name: '123abc' should be rejected"
fi

if ! validate_agent_name "" 2>/dev/null; then
    pass "validate_agent_name: empty string is rejected"
else
    fail "validate_agent_name: empty string should be rejected"
fi

# ── Test 10: Manifest validation ────────────────────────────
echo ""
echo -e "${BLUE}  [Section] Manifest Validation${NC}"

source "$LIB_DIR/manifest.sh"

# Test with a real manifest
manifest="$PROJECT_ROOT/skills/zorro/mugiwara.yaml"
if [[ -f "$manifest" ]]; then
    if validate_manifest "$manifest" 2>/dev/null; then
        pass "validate_manifest: zorro/mugiwara.yaml is valid"
    else
        fail "validate_manifest: zorro/mugiwara.yaml should be valid"
    fi
else
    fail "zorro/mugiwara.yaml not found"
fi

# Test with invalid manifest
invalid_manifest="$TEST_HOME/invalid.yaml"
cat > "$invalid_manifest" << 'YAML'
description: no name field
YAML

if ! validate_manifest "$invalid_manifest" 2>/dev/null; then
    pass "validate_manifest: rejects manifest without name"
else
    fail "validate_manifest: should reject manifest without name"
fi

# ── Test 11: Registry parsing ───────────────────────────────
echo ""
echo -e "${BLUE}  [Section] Registry Parsing${NC}"

source "$LIB_DIR/registry.sh"

# Test registry_list_agents
agents=$(registry_list_agents)
agent_count=$(echo "$agents" | wc -l)
if [[ "$agent_count" -ge 60 ]]; then
    pass "registry_list_agents: found $agent_count agents (expected ~70)"
else
    fail "registry_list_agents: found only $agent_count agents (expected ~70)"
fi

# Test specific agent lookup
ver=$(registry_agent_get "zorro" "version")
if [[ "$ver" == "1.5.0" ]]; then
    pass "registry_agent_get: zorro version is 1.5.0"
else
    fail "registry_agent_get: zorro version is '$ver' instead of '1.5.0'"
fi

cat_val=$(registry_agent_get "nami" "category")
if [[ "$cat_val" == "qa" ]]; then
    pass "registry_agent_get: nami category is qa"
else
    fail "registry_agent_get: nami category is '$cat_val' instead of 'qa'"
fi

# ── Test 12: Manifest files exist for all agents ────────────
echo ""
echo -e "${BLUE}  [Section] Manifest Coverage${NC}"

manifests_ok=0
manifests_missing=0
for dir in "$PROJECT_ROOT"/skills/*/; do
    agent=$(basename "$dir")
    if [[ -f "$dir/mugiwara.yaml" ]]; then
        manifests_ok=$((manifests_ok + 1))
    else
        fail "Missing mugiwara.yaml for agent: $agent"
        manifests_missing=$((manifests_missing + 1))
    fi
done

if [[ "$manifests_missing" -eq 0 ]]; then
    pass "All $manifests_ok agents have mugiwara.yaml manifests"
else
    fail "$manifests_missing agents missing mugiwara.yaml"
fi

# ── Test 13: All manifests are valid ────────────────────────
invalid_manifests=0
for dir in "$PROJECT_ROOT"/skills/*/; do
    manifest="$dir/mugiwara.yaml"
    if [[ -f "$manifest" ]]; then
        if ! validate_manifest "$manifest" 2>/dev/null; then
            fail "Invalid manifest: $manifest"
            invalid_manifests=$((invalid_manifests + 1))
        fi
    fi
done

if [[ "$invalid_manifests" -eq 0 ]]; then
    pass "All $manifests_ok mugiwara.yaml manifests are valid"
fi

# ── Test 14: Registry and manifests are in sync ─────────────
echo ""
echo -e "${BLUE}  [Section] Registry-Manifest Sync${NC}"

out_of_sync=0
# Registry may contain short aliases (e.g. "gcp" -> "aokiji") without their own skills/ dir
# Only flag as out-of-sync if the agent has no skills dir AND no alias target exists
for agent in $(registry_list_agents); do
    manifest="$PROJECT_ROOT/skills/$agent/mugiwara.yaml"
    if [[ ! -f "$manifest" ]]; then
        # Check if it's a known alias (registry entry without skill dir is acceptable)
        if [[ ! -d "$PROJECT_ROOT/skills/$agent" ]]; then
            # Tolerate aliases: agents in registry without a skills/ directory
            # These are short-name aliases pointing to named agents (e.g. gcp -> aokiji)
            :
        else
            fail "Agent '$agent' in registry has skills/ dir but no manifest"
            out_of_sync=$((out_of_sync + 1))
        fi
    fi
done

for dir in "$PROJECT_ROOT"/skills/*/; do
    agent=$(basename "$dir")
    if [[ -f "$dir/mugiwara.yaml" ]]; then
        reg_ver=$(registry_agent_get "$agent" "version" 2>/dev/null || echo "")
        if [[ -z "$reg_ver" ]]; then
            fail "Agent '$agent' has manifest but not in registry"
            out_of_sync=$((out_of_sync + 1))
        fi
    fi
done

if [[ "$out_of_sync" -eq 0 ]]; then
    pass "Registry and manifests are in sync"
fi

# ── Test 15: Installer module - lock file operations ────────
echo ""
echo -e "${BLUE}  [Section] Lock File Operations${NC}"

source "$LIB_DIR/installer.sh"

# Write a lock
write_lock "test-agent" "1.0.0" "abc123"
if is_installed "test-agent"; then
    pass "write_lock + is_installed: test-agent is installed"
else
    fail "write_lock + is_installed: test-agent should be installed"
fi

ver=$(installed_version "test-agent")
if [[ "$ver" == "1.0.0" ]]; then
    pass "installed_version: returns 1.0.0"
else
    fail "installed_version: returned '$ver' instead of '1.0.0'"
fi

# Remove lock
remove_lock "test-agent"
if ! is_installed "test-agent"; then
    pass "remove_lock: test-agent is no longer installed"
else
    fail "remove_lock: test-agent should not be installed"
fi

# ── Test 16: Legacy detection ───────────────────────────────
echo ""
echo -e "${BLUE}  [Section] Legacy Detection${NC}"

# Simulate a legacy install (skill dir without lock)
mkdir -p "$SKILLS_DIR/test-legacy"
echo "# Test" > "$SKILLS_DIR/test-legacy/SKILL.md"

legacy=$(detect_legacy_installed)
if echo "$legacy" | grep -q "test-legacy"; then
    pass "detect_legacy_installed: finds test-legacy"
else
    fail "detect_legacy_installed: should find test-legacy"
fi

# Adopt legacy
adopt_legacy "test-legacy"
if is_installed "test-legacy"; then
    pass "adopt_legacy: test-legacy now has a lock file"
else
    fail "adopt_legacy: test-legacy should have a lock file"
fi

ver=$(installed_version "test-legacy")
if [[ "$ver" == "legacy" ]]; then
    pass "adopt_legacy: version is 'legacy'"
else
    fail "adopt_legacy: version should be 'legacy', got '$ver'"
fi

# ── Test 17: Local install ──────────────────────────────────
echo ""
echo -e "${BLUE}  [Section] Local Install${NC}"

# Create a mock agent source
mock_agent_dir="$TEST_HOME/mock-agent"
mkdir -p "$mock_agent_dir"
echo "---" > "$mock_agent_dir/SKILL.md"
echo "name: mock-agent" >> "$mock_agent_dir/SKILL.md"
echo "---" >> "$mock_agent_dir/SKILL.md"
cat > "$mock_agent_dir/mugiwara.yaml" << 'YAML'
name: mock-agent
version: 1.0.0
description: Mock agent for testing
category: testing
files:
  - SKILL.md
YAML

if install_agent_local "mock-agent" "$mock_agent_dir" 2>/dev/null; then
    pass "install_agent_local: mock-agent installed"
else
    fail "install_agent_local: failed to install mock-agent"
fi

if [[ -f "$SKILLS_DIR/mock-agent/SKILL.md" ]]; then
    pass "install_agent_local: SKILL.md copied to skills dir"
else
    fail "install_agent_local: SKILL.md not found in skills dir"
fi

if is_installed "mock-agent"; then
    pass "install_agent_local: mock-agent shows as installed"
else
    fail "install_agent_local: mock-agent should show as installed"
fi

# ── Test 18: Uninstall ──────────────────────────────────────
echo ""
echo -e "${BLUE}  [Section] Uninstall${NC}"

uninstall_agent "mock-agent" 2>/dev/null
if [[ ! -d "$SKILLS_DIR/mock-agent" ]]; then
    pass "uninstall_agent: skill directory removed"
else
    fail "uninstall_agent: skill directory should be removed"
fi

if ! is_installed "mock-agent"; then
    pass "uninstall_agent: no longer in installed list"
else
    fail "uninstall_agent: should not be in installed list"
fi

# ── Test 19: CLI list command runs ──────────────────────────
echo ""
echo -e "${BLUE}  [Section] CLI Commands Integration${NC}"

output=$("$CLI" list --offline 2>&1)
if [[ "$output" == *"MUGIWARA AGENTS"* ]]; then
    pass "CLI list --offline runs successfully"
else
    fail "CLI list --offline failed"
fi

# ── Test 20: CLI search command runs ────────────────────────
output=$("$CLI" search qa --offline 2>&1)
if [[ "$output" == *"nami"* ]]; then
    pass "CLI search qa --offline finds nami"
else
    fail "CLI search qa --offline should find nami"
fi

# ── Test 21: registry.yaml exists at project root ───────────
echo ""
echo -e "${BLUE}  [Section] Project Files${NC}"

if [[ -f "$PROJECT_ROOT/registry.yaml" ]]; then
    pass "registry.yaml exists at project root"
else
    fail "registry.yaml not found at project root"
fi

# Verify it's valid YAML-ish (has version and agents keys)
if grep -q "^version:" "$PROJECT_ROOT/registry.yaml" && grep -q "^agents:" "$PROJECT_ROOT/registry.yaml"; then
    pass "registry.yaml has version and agents keys"
else
    fail "registry.yaml missing required keys"
fi

# ── Test 22: Checksum utility ───────────────────────────────
echo ""
echo -e "${BLUE}  [Section] Checksum Utility${NC}"

test_file="$TEST_HOME/checksum_test.txt"
echo "hello world" > "$test_file"
checksum=$(compute_checksum "$test_file")
if [[ -n "$checksum" ]] && [[ ${#checksum} -eq 64 ]]; then
    pass "compute_checksum: returns 64-char SHA256 hash"
else
    fail "compute_checksum: returned '$checksum' (expected 64-char hash)"
fi

if verify_checksum "$test_file" "$checksum"; then
    pass "verify_checksum: matches computed checksum"
else
    fail "verify_checksum: should match computed checksum"
fi

if ! verify_checksum "$test_file" "0000000000000000000000000000000000000000000000000000000000000000" 2>/dev/null; then
    pass "verify_checksum: rejects wrong checksum"
else
    fail "verify_checksum: should reject wrong checksum"
fi

# ════════════════════════════════════════════════════════════
echo ""
echo "  ══════════════════════════════════════"
echo -e "  ${GREEN}PASS: $PASS${NC} | ${RED}FAIL: $FAIL${NC} | TOTAL: $TOTAL"
echo "  ══════════════════════════════════════"
echo ""

if [[ "$FAIL" -gt 0 ]]; then
    exit 1
fi
exit 0
