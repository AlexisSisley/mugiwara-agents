#!/bin/bash
# ============================================================
# Magellan Agent - Test Suite
# Tests for the Magellan agent (v1.9)
# Validates: agent structure, SKILL.md content quality,
# DBA coverage, manifest, registry
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AGENT_DIR="$PROJECT_ROOT/skills/magellan"

PASS=0; FAIL=0; WARN=0; TOTAL=0

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo -e "  ${GREEN}[PASS]${NC} $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo -e "  ${RED}[FAIL]${NC} $1"; }
warn() { WARN=$((WARN + 1)); echo -e "  ${YELLOW}[WARN]${NC} $1"; }
section() { echo ""; echo -e "${BLUE}  === $1 ===${NC}"; echo ""; }

# ============================================================
section "Test Suite 1: Magellan Agent Structure"

[ -d "$AGENT_DIR" ] && pass "skills/magellan/ directory exists" || fail "skills/magellan/ directory NOT found"
[ -f "$AGENT_DIR/SKILL.md" ] && pass "SKILL.md exists" || fail "SKILL.md NOT found"
[ -f "$AGENT_DIR/mugiwara.yaml" ] && pass "mugiwara.yaml exists" || fail "mugiwara.yaml NOT found"

if [ -f "$AGENT_DIR/SKILL.md" ]; then
    first_line=$(head -1 "$AGENT_DIR/SKILL.md")
    [ "$first_line" = "---" ] && pass "SKILL.md starts with YAML front matter" || fail "SKILL.md missing front matter"
    closing=$(awk 'NR>1 && /^---$/{print NR; exit}' "$AGENT_DIR/SKILL.md")
    [ -n "$closing" ] && pass "SKILL.md has closing front matter" || fail "SKILL.md missing closing delimiter"
fi

# ============================================================
section "Test Suite 2: SKILL.md Content Quality"

if [ -f "$AGENT_DIR/SKILL.md" ]; then
    CONTENT=$(cat "$AGENT_DIR/SKILL.md")

    echo "$CONTENT" | grep -qi "postgresql\|postgres" && pass "Covers PostgreSQL" || fail "Missing PostgreSQL"
    echo "$CONTENT" | grep -qi "mysql" && pass "Covers MySQL" || fail "Missing MySQL"
    echo "$CONTENT" | grep -qi "mongodb\|mongo" && pass "Covers MongoDB" || fail "Missing MongoDB"
    echo "$CONTENT" | grep -qi "redis" && pass "Covers Redis" || fail "Missing Redis"
    echo "$CONTENT" | grep -qi "backup" && pass "Covers Backup" || fail "Missing Backup"
    echo "$CONTENT" | grep -qi "replication" && pass "Covers Replication" || fail "Missing Replication"
    echo "$CONTENT" | grep -qi "sharding" && pass "Covers Sharding" || fail "Missing Sharding"
    echo "$CONTENT" | grep -qi "migration" && pass "Covers Migration" || fail "Missing Migration"
    echo "$CONTENT" | grep -qi "index" && pass "Covers Indexation" || fail "Missing Indexation"
    echo "$CONTENT" | grep -qi "Routage Inter-Agents" && pass "Has Routage Inter-Agents" || fail "Missing Routage"

    WORD_COUNT=$(echo "$CONTENT" | wc -w)
    [ "$WORD_COUNT" -gt 1000 ] && pass "Substantial content ($WORD_COUNT words)" || fail "Too short ($WORD_COUNT words)"
fi

# ============================================================
section "Test Suite 3: Manifest Validation"

if [ -f "$AGENT_DIR/mugiwara.yaml" ]; then
    MANIFEST=$(cat "$AGENT_DIR/mugiwara.yaml")
    echo "$MANIFEST" | grep -q "^name: magellan" && pass "Correct name" || fail "Wrong name"
    echo "$MANIFEST" | grep -q "^version: 1.9.0" && pass "Version 1.9.0" || fail "Wrong version"
    echo "$MANIFEST" | grep -q "^category: data" && pass "Category: data" || fail "Wrong category"
    echo "$MANIFEST" | grep -q "^checksum:" && pass "Has checksum" || fail "Missing checksum"
fi

# ============================================================
section "Test Suite 4: Registry Integration"

REGISTRY="$PROJECT_ROOT/registry.yaml"
if [ -f "$REGISTRY" ]; then
    grep -q "^  magellan:" "$REGISTRY" && pass "magellan in registry" || fail "magellan NOT in registry"
    grep -q "^  dba:" "$REGISTRY" && pass "dba alias in registry" || fail "dba alias NOT in registry"
else
    fail "registry.yaml not found"
fi

# ============================================================
echo ""
echo "  ========================================"
echo "  Results:"
echo -e "  ${GREEN}PASS${NC}: $PASS"
[ $FAIL -gt 0 ] && echo -e "  ${RED}FAIL${NC}: $FAIL"
[ $WARN -gt 0 ] && echo -e "  ${YELLOW}WARN${NC}: $WARN"
echo "  Total: $TOTAL tests"
echo ""
[ $FAIL -gt 0 ] && { echo -e "  ${RED}SOME TESTS FAILED${NC}"; exit 1; } || { echo -e "  ${GREEN}All tests passed!${NC}"; exit 0; }
