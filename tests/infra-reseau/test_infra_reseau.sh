#!/bin/bash
# ============================================================
# Infrastructure Reseau Agent - Test Suite
# Tests for the infra-reseau agent (v1.8)
# Validates: agent structure, SKILL.md content quality,
# firewall syntax, DNS zone patterns, manifest, registry
# ============================================================

set -euo pipefail

# -- Colors --------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# -- Paths ---------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SKILLS_DIR="$PROJECT_ROOT/skills"
INFRA_DIR="$SKILLS_DIR/infra-reseau"

# -- Counters ------------------------------------------------
PASS=0
FAIL=0
WARN=0
TOTAL=0

# -- Test helpers --------------------------------------------
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

warn() {
    WARN=$((WARN + 1))
    echo -e "  ${YELLOW}[WARN]${NC} $1"
}

section() {
    echo ""
    echo -e "${BLUE}  === $1 ===${NC}"
    echo ""
}

# ============================================================
# TEST SUITE 1: Agent Structure
# ============================================================
section "Test Suite 1: Infra Reseau Agent Structure"

if [ -d "$INFRA_DIR" ]; then
    pass "skills/infra-reseau/ directory exists"
else
    fail "skills/infra-reseau/ directory NOT found"
fi

if [ -f "$INFRA_DIR/SKILL.md" ]; then
    pass "SKILL.md exists"
else
    fail "SKILL.md NOT found in skills/infra-reseau/"
fi

if [ -f "$INFRA_DIR/mugiwara.yaml" ]; then
    pass "mugiwara.yaml manifest exists"
else
    fail "mugiwara.yaml NOT found in skills/infra-reseau/"
fi

if [ -f "$INFRA_DIR/SKILL.md" ]; then
    first_line=$(head -1 "$INFRA_DIR/SKILL.md")
    if [ "$first_line" = "---" ]; then
        pass "SKILL.md starts with YAML front matter (---)"
    else
        fail "SKILL.md does not start with --- (got: $first_line)"
    fi
fi

if [ -f "$INFRA_DIR/SKILL.md" ]; then
    closing=$(awk 'NR>1 && /^---$/{print NR; exit}' "$INFRA_DIR/SKILL.md")
    if [ -n "$closing" ]; then
        pass "SKILL.md has closing front matter delimiter"
    else
        fail "SKILL.md missing closing front matter delimiter"
    fi
fi

# ============================================================
# TEST SUITE 2: SKILL.md Content Quality
# ============================================================
section "Test Suite 2: SKILL.md Content Quality"

if [ -f "$INFRA_DIR/SKILL.md" ]; then
    CONTENT=$(cat "$INFRA_DIR/SKILL.md")

    # T2.1 - Firewall
    if echo "$CONTENT" | grep -qi "firewall\|iptables\|nftables"; then
        pass "SKILL.md covers firewall configuration"
    else
        fail "SKILL.md does not mention firewall"
    fi

    # T2.2 - DNS
    if echo "$CONTENT" | grep -qi "DNS\|BIND\|named.conf"; then
        pass "SKILL.md covers DNS"
    else
        fail "SKILL.md does not mention DNS"
    fi

    # T2.3 - Load Balancing
    if echo "$CONTENT" | grep -qi "load balanc\|HAProxy\|haproxy"; then
        pass "SKILL.md covers load balancing"
    else
        fail "SKILL.md does not mention load balancing"
    fi

    # T2.4 - VPN
    if echo "$CONTENT" | grep -qi "VPN\|WireGuard\|wireguard\|IPSec"; then
        pass "SKILL.md covers VPN"
    else
        fail "SKILL.md does not mention VPN"
    fi

    # T2.5 - VLAN
    if echo "$CONTENT" | grep -qi "VLAN\|802.1Q"; then
        pass "SKILL.md covers VLAN"
    else
        fail "SKILL.md does not mention VLAN"
    fi

    # T2.6 - Nginx load balancer
    if echo "$CONTENT" | grep -qi "nginx"; then
        pass "SKILL.md covers Nginx"
    else
        fail "SKILL.md does not mention Nginx"
    fi

    # T2.7 - Windows Firewall
    if echo "$CONTENT" | grep -qi "windows firewall\|NetFirewallRule"; then
        pass "SKILL.md covers Windows Firewall"
    else
        fail "SKILL.md does not mention Windows Firewall"
    fi

    # T2.8 - Dry-run mode
    if echo "$CONTENT" | grep -qi "dry-run\|dry_run\|DRY_RUN"; then
        pass "SKILL.md includes dry-run mode for safety"
    else
        fail "SKILL.md missing dry-run mode"
    fi

    # T2.9 - Security warnings
    if echo "$CONTENT" | grep -qi "AVERTISSEMENT\|WARNING"; then
        pass "SKILL.md includes security warnings"
    else
        fail "SKILL.md missing security warnings"
    fi

    # T2.10 - Diagnostic commands
    if echo "$CONTENT" | grep -qi "diagnostic\|troubleshoot\|ping\|traceroute\|tcpdump"; then
        pass "SKILL.md covers network diagnostics"
    else
        fail "SKILL.md does not mention network diagnostics"
    fi

    # T2.11 - Credential warnings (Franky fix)
    if echo "$CONTENT" | grep -qi "WARNING.*credential\|WARNING.*cle\|Ne jamais committer\|CHANGE_ME"; then
        pass "SKILL.md includes credential security warnings"
    else
        fail "SKILL.md missing credential security warnings"
    fi

    # T2.12 - Minimum content length
    WORD_COUNT=$(echo "$CONTENT" | wc -w)
    if [ "$WORD_COUNT" -gt 1000 ]; then
        pass "SKILL.md has substantial content ($WORD_COUNT words)"
    else
        fail "SKILL.md is too short ($WORD_COUNT words, expected > 1000)"
    fi
fi

# ============================================================
# TEST SUITE 3: Firewall Rules Syntax Validation
# ============================================================
section "Test Suite 3: Firewall Rules Patterns"

if [ -f "$INFRA_DIR/SKILL.md" ]; then
    # T3.1 - iptables rules have policy DROP
    if echo "$CONTENT" | grep -q "iptables -P INPUT DROP"; then
        pass "iptables rules have deny-all default policy"
    else
        fail "iptables rules missing deny-all default"
    fi

    # T3.2 - nftables rules have policy drop
    if echo "$CONTENT" | grep -q "policy drop"; then
        pass "nftables rules have deny-all default policy"
    else
        fail "nftables rules missing deny-all default"
    fi

    # T3.3 - UFW default deny
    if echo "$CONTENT" | grep -q "ufw default deny incoming"; then
        pass "UFW rules have deny-all default"
    else
        fail "UFW rules missing deny-all default"
    fi

    # T3.4 - Windows Firewall default block
    if echo "$CONTENT" | grep -q "DefaultInboundAction Block"; then
        pass "Windows Firewall has default inbound block"
    else
        fail "Windows Firewall missing default inbound block"
    fi

    # T3.5 - Connection tracking for established connections
    if echo "$CONTENT" | grep -q "ESTABLISHED,RELATED\|established,related"; then
        pass "Firewall rules allow established/related connections"
    else
        fail "Firewall rules missing established/related rule"
    fi
fi

# ============================================================
# TEST SUITE 4: DNS Zone Syntax Validation
# ============================================================
section "Test Suite 4: DNS Zone Patterns"

if [ -f "$INFRA_DIR/SKILL.md" ]; then
    # T4.1 - SOA record present
    if echo "$CONTENT" | grep -q "SOA"; then
        pass "DNS zone contains SOA record"
    else
        fail "DNS zone missing SOA record"
    fi

    # T4.2 - NS records present
    if echo "$CONTENT" | grep -q "IN.*NS"; then
        pass "DNS zone contains NS records"
    else
        fail "DNS zone missing NS records"
    fi

    # T4.3 - A records present
    if echo "$CONTENT" | grep -q "IN.*A.*[0-9]"; then
        pass "DNS zone contains A records"
    else
        fail "DNS zone missing A records"
    fi

    # T4.4 - MX records present
    if echo "$CONTENT" | grep -q "IN.*MX"; then
        pass "DNS zone contains MX records"
    else
        fail "DNS zone missing MX records"
    fi

    # T4.5 - TXT records (SPF) present
    if echo "$CONTENT" | grep -q "IN.*TXT.*spf1"; then
        pass "DNS zone contains SPF TXT record"
    else
        fail "DNS zone missing SPF TXT record"
    fi
fi

# ============================================================
# TEST SUITE 5: Manifest Validation
# ============================================================
section "Test Suite 5: Manifest Validation (mugiwara.yaml)"

if [ -f "$INFRA_DIR/mugiwara.yaml" ]; then
    MANIFEST=$(cat "$INFRA_DIR/mugiwara.yaml")

    if echo "$MANIFEST" | grep -q "^name: infra-reseau"; then
        pass "Manifest has correct name: infra-reseau"
    else
        fail "Manifest name is not 'infra-reseau'"
    fi

    if echo "$MANIFEST" | grep -q "^version: 1.8.0"; then
        pass "Manifest has version 1.8.0"
    else
        fail "Manifest version is not 1.8.0"
    fi

    if echo "$MANIFEST" | grep -q "^category: infrastructure"; then
        pass "Manifest has category: infrastructure"
    else
        fail "Manifest category is not 'infrastructure'"
    fi

    if echo "$MANIFEST" | grep -q "^checksum:"; then
        pass "Manifest has checksum section"
    else
        fail "Manifest missing checksum section"
    fi

    if command -v sha256sum >/dev/null 2>&1; then
        ACTUAL_HASH=$(sha256sum "$INFRA_DIR/SKILL.md" | awk '{print $1}')
        MANIFEST_HASH=$(grep "SKILL.md:" "$INFRA_DIR/mugiwara.yaml" | sed 's/.*"\(.*\)"/\1/')
        if [ "$ACTUAL_HASH" = "$MANIFEST_HASH" ]; then
            pass "SKILL.md checksum matches manifest"
        else
            warn "SKILL.md checksum mismatch (will need update after edits)"
        fi
    else
        warn "sha256sum not available, skipping checksum verification"
    fi

    if echo "$MANIFEST" | grep -q "firewall" && echo "$MANIFEST" | grep -q "dns"; then
        pass "Manifest tags include firewall and dns"
    else
        fail "Manifest tags missing key technologies"
    fi
fi

# ============================================================
# TEST SUITE 6: Registry Integration
# ============================================================
section "Test Suite 6: Registry Integration"

REGISTRY="$PROJECT_ROOT/registry.yaml"

if [ -f "$REGISTRY" ]; then
    if grep -q "^  infra-reseau:" "$REGISTRY"; then
        pass "infra-reseau agent registered in registry.yaml"
    else
        fail "infra-reseau agent NOT found in registry.yaml"
    fi

    REG_VERSION=$(grep -A 3 "^  infra-reseau:" "$REGISTRY" | grep "version:" | awk '{print $2}')
    if [ "$REG_VERSION" = "1.8.0" ]; then
        pass "Registry version matches manifest (1.8.0)"
    else
        fail "Registry version mismatch (got: $REG_VERSION, expected: 1.8.0)"
    fi

    REG_CAT=$(grep -A 3 "^  infra-reseau:" "$REGISTRY" | grep "category:" | awk '{print $2}')
    if [ "$REG_CAT" = "infrastructure" ]; then
        pass "Registry category matches manifest (infrastructure)"
    else
        fail "Registry category mismatch (got: $REG_CAT, expected: infrastructure)"
    fi
else
    fail "registry.yaml not found"
fi

# ============================================================
# TEST SUITE 7: Cross-Agent Consistency
# ============================================================
section "Test Suite 7: Cross-Agent v1.8 Consistency"

# T7.1 - All 4 v1.8 agents exist
V18_AGENTS=("docker" "iis" "firebase" "infra-reseau")
V18_COUNT=0
for agent in "${V18_AGENTS[@]}"; do
    if [ -d "$SKILLS_DIR/$agent" ] && [ -f "$SKILLS_DIR/$agent/SKILL.md" ]; then
        V18_COUNT=$((V18_COUNT + 1))
    fi
done

if [ "$V18_COUNT" -eq 4 ]; then
    pass "All 4 v1.8 agents exist (docker, iis, firebase, infra-reseau)"
else
    fail "Only $V18_COUNT of 4 v1.8 agents found"
fi

# T7.2 - All 4 agents have version 1.8.0 in manifest
V18_VERSION_OK=0
for agent in "${V18_AGENTS[@]}"; do
    if [ -f "$SKILLS_DIR/$agent/mugiwara.yaml" ]; then
        if grep -q "^version: 1.8.0" "$SKILLS_DIR/$agent/mugiwara.yaml"; then
            V18_VERSION_OK=$((V18_VERSION_OK + 1))
        fi
    fi
done

if [ "$V18_VERSION_OK" -eq 4 ]; then
    pass "All 4 v1.8 agents have consistent version (1.8.0)"
else
    fail "Only $V18_VERSION_OK of 4 agents have version 1.8.0"
fi

# T7.3 - All 4 agents are in registry
V18_REG_OK=0
for agent in "${V18_AGENTS[@]}"; do
    if [ -f "$REGISTRY" ] && grep -q "^  $agent:" "$REGISTRY"; then
        V18_REG_OK=$((V18_REG_OK + 1))
    fi
done

if [ "$V18_REG_OK" -eq 4 ]; then
    pass "All 4 v1.8 agents are in registry.yaml"
else
    fail "Only $V18_REG_OK of 4 agents found in registry.yaml"
fi

# ============================================================
# RESULTS
# ============================================================
echo ""
echo "  ========================================"
echo "  Results:"
echo -e "  ${GREEN}PASS${NC}: $PASS"
if [ $FAIL -gt 0 ]; then
    echo -e "  ${RED}FAIL${NC}: $FAIL"
fi
if [ $WARN -gt 0 ]; then
    echo -e "  ${YELLOW}WARN${NC}: $WARN"
fi
echo "  Total: $TOTAL tests"
echo ""

if [ $FAIL -gt 0 ]; then
    echo -e "  ${RED}SOME TESTS FAILED${NC}"
    exit 1
else
    echo -e "  ${GREEN}All tests passed!${NC}"
    exit 0
fi
