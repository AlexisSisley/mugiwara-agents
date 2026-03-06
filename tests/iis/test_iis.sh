#!/bin/bash
# ============================================================
# IIS Agent - Test Suite
# Tests for the IIS agent (v1.8)
# Validates: agent structure, SKILL.md content quality,
# XML syntax patterns, PowerShell patterns, manifest, registry
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
IIS_DIR="$SKILLS_DIR/iis"

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
section "Test Suite 1: IIS Agent Structure"

# T1.1
if [ -d "$IIS_DIR" ]; then
    pass "skills/iis/ directory exists"
else
    fail "skills/iis/ directory NOT found"
fi

# T1.2
if [ -f "$IIS_DIR/SKILL.md" ]; then
    pass "SKILL.md exists"
else
    fail "SKILL.md NOT found in skills/iis/"
fi

# T1.3
if [ -f "$IIS_DIR/mugiwara.yaml" ]; then
    pass "mugiwara.yaml manifest exists"
else
    fail "mugiwara.yaml NOT found in skills/iis/"
fi

# T1.4
if [ -f "$IIS_DIR/SKILL.md" ]; then
    first_line=$(head -1 "$IIS_DIR/SKILL.md")
    if [ "$first_line" = "---" ]; then
        pass "SKILL.md starts with YAML front matter (---)"
    else
        fail "SKILL.md does not start with --- (got: $first_line)"
    fi
fi

# T1.5
if [ -f "$IIS_DIR/SKILL.md" ]; then
    closing=$(awk 'NR>1 && /^---$/{print NR; exit}' "$IIS_DIR/SKILL.md")
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

if [ -f "$IIS_DIR/SKILL.md" ]; then
    CONTENT=$(cat "$IIS_DIR/SKILL.md")

    # T2.1 - web.config
    if echo "$CONTENT" | grep -qi "web.config"; then
        pass "SKILL.md covers web.config"
    else
        fail "SKILL.md does not mention web.config"
    fi

    # T2.2 - Application Pools
    if echo "$CONTENT" | grep -qi "application pool\|apppool\|AppPool"; then
        pass "SKILL.md covers Application Pools"
    else
        fail "SKILL.md does not mention Application Pools"
    fi

    # T2.3 - SSL/TLS
    if echo "$CONTENT" | grep -qi "SSL\|TLS\|HTTPS"; then
        pass "SKILL.md covers SSL/TLS"
    else
        fail "SKILL.md does not mention SSL/TLS"
    fi

    # T2.4 - URL Rewrite
    if echo "$CONTENT" | grep -qi "URL Rewrite\|rewrite"; then
        pass "SKILL.md covers URL Rewrite"
    else
        fail "SKILL.md does not mention URL Rewrite"
    fi

    # T2.5 - PowerShell
    if echo "$CONTENT" | grep -qi "powershell\|PowerShell\|WebAdministration"; then
        pass "SKILL.md covers PowerShell management"
    else
        fail "SKILL.md does not mention PowerShell"
    fi

    # T2.6 - ARR (Application Request Routing)
    if echo "$CONTENT" | grep -qi "ARR\|Application Request Routing"; then
        pass "SKILL.md covers ARR"
    else
        fail "SKILL.md does not mention ARR"
    fi

    # T2.7 - Deployment
    if echo "$CONTENT" | grep -qi "deploy\|deployment\|Web Deploy\|msdeploy"; then
        pass "SKILL.md covers deployment"
    else
        fail "SKILL.md does not mention deployment"
    fi

    # T2.8 - Security headers
    if echo "$CONTENT" | grep -qi "X-Content-Type-Options\|X-Frame-Options"; then
        pass "SKILL.md covers security headers"
    else
        fail "SKILL.md does not mention security headers"
    fi

    # T2.9 - Credential warnings (Franky fix)
    if echo "$CONTENT" | grep -qi "WARNING.*credential\|WARNING.*password\|WARNING.*secret\|Ne jamais coder"; then
        pass "SKILL.md includes credential security warnings"
    else
        fail "SKILL.md missing credential security warnings"
    fi

    # T2.10 - Minimum content length
    WORD_COUNT=$(echo "$CONTENT" | wc -w)
    if [ "$WORD_COUNT" -gt 500 ]; then
        pass "SKILL.md has substantial content ($WORD_COUNT words)"
    else
        fail "SKILL.md is too short ($WORD_COUNT words, expected > 500)"
    fi
fi

# ============================================================
# TEST SUITE 3: XML Syntax Validation
# ============================================================
section "Test Suite 3: XML Syntax Patterns"

if [ -f "$IIS_DIR/SKILL.md" ]; then
    # T3.1 - XML declarations present
    XML_DECL_COUNT=$(grep -c '<?xml version' "$IIS_DIR/SKILL.md" || true)
    if [ "$XML_DECL_COUNT" -ge 2 ]; then
        pass "Found $XML_DECL_COUNT XML declarations"
    else
        fail "Only $XML_DECL_COUNT XML declarations found (expected >= 2)"
    fi

    # T3.2 - <configuration> root element
    CONFIG_OPEN=$(grep -c '<configuration>' "$IIS_DIR/SKILL.md" || true)
    CONFIG_CLOSE=$(grep -c '</configuration>' "$IIS_DIR/SKILL.md" || true)
    if [ "$CONFIG_OPEN" -eq "$CONFIG_CLOSE" ] && [ "$CONFIG_OPEN" -ge 2 ]; then
        pass "Balanced <configuration> tags ($CONFIG_OPEN open, $CONFIG_CLOSE close)"
    else
        fail "Unbalanced <configuration> tags ($CONFIG_OPEN open, $CONFIG_CLOSE close)"
    fi

    # T3.3 - system.webServer sections
    WEBSERVER_OPEN=$(grep -c '<system.webServer>' "$IIS_DIR/SKILL.md" || true)
    WEBSERVER_CLOSE=$(grep -c '</system.webServer>' "$IIS_DIR/SKILL.md" || true)
    if [ "$WEBSERVER_OPEN" -eq "$WEBSERVER_CLOSE" ] && [ "$WEBSERVER_OPEN" -ge 1 ]; then
        pass "Balanced <system.webServer> tags ($WEBSERVER_OPEN)"
    else
        fail "Unbalanced <system.webServer> tags ($WEBSERVER_OPEN open, $WEBSERVER_CLOSE close)"
    fi

    # T3.4 - rewrite rules
    REWRITE_OPEN=$(grep -c '<rewrite>' "$IIS_DIR/SKILL.md" || true)
    REWRITE_CLOSE=$(grep -c '</rewrite>' "$IIS_DIR/SKILL.md" || true)
    if [ "$REWRITE_OPEN" -eq "$REWRITE_CLOSE" ] && [ "$REWRITE_OPEN" -ge 1 ]; then
        pass "Balanced <rewrite> tags ($REWRITE_OPEN)"
    else
        fail "Unbalanced <rewrite> tags ($REWRITE_OPEN open, $REWRITE_CLOSE close)"
    fi
fi

# ============================================================
# TEST SUITE 4: Manifest Validation
# ============================================================
section "Test Suite 4: Manifest Validation (mugiwara.yaml)"

if [ -f "$IIS_DIR/mugiwara.yaml" ]; then
    MANIFEST=$(cat "$IIS_DIR/mugiwara.yaml")

    if echo "$MANIFEST" | grep -q "^name: iis"; then
        pass "Manifest has correct name: iis"
    else
        fail "Manifest name is not 'iis'"
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
        ACTUAL_HASH=$(sha256sum "$IIS_DIR/SKILL.md" | awk '{print $1}')
        MANIFEST_HASH=$(grep "SKILL.md:" "$IIS_DIR/mugiwara.yaml" | sed 's/.*"\(.*\)"/\1/')
        if [ "$ACTUAL_HASH" = "$MANIFEST_HASH" ]; then
            pass "SKILL.md checksum matches manifest"
        else
            warn "SKILL.md checksum mismatch (will need update after edits)"
        fi
    else
        warn "sha256sum not available, skipping checksum verification"
    fi

    if echo "$MANIFEST" | grep -q "iis" && echo "$MANIFEST" | grep -q "web-config"; then
        pass "Manifest tags include iis and web-config"
    else
        fail "Manifest tags missing key technologies"
    fi
fi

# ============================================================
# TEST SUITE 5: Registry Integration
# ============================================================
section "Test Suite 5: Registry Integration"

REGISTRY="$PROJECT_ROOT/registry.yaml"

if [ -f "$REGISTRY" ]; then
    if grep -q "^  iis:" "$REGISTRY"; then
        pass "iis agent registered in registry.yaml"
    else
        fail "iis agent NOT found in registry.yaml"
    fi

    REG_VERSION=$(grep -A 3 "^  iis:" "$REGISTRY" | grep "version:" | awk '{print $2}')
    if [ "$REG_VERSION" = "1.8.0" ]; then
        pass "Registry version matches manifest (1.8.0)"
    else
        fail "Registry version mismatch (got: $REG_VERSION, expected: 1.8.0)"
    fi

    REG_CAT=$(grep -A 3 "^  iis:" "$REGISTRY" | grep "category:" | awk '{print $2}')
    if [ "$REG_CAT" = "infrastructure" ]; then
        pass "Registry category matches manifest (infrastructure)"
    else
        fail "Registry category mismatch (got: $REG_CAT, expected: infrastructure)"
    fi
else
    fail "registry.yaml not found"
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
