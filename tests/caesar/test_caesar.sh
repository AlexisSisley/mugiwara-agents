#!/bin/bash
# ============================================================
# Caesar Agent - Test Suite
# Tests for the Caesar agent (v1.9)
# Validates: agent structure, SKILL.md content quality,
# chaos engineering coverage, manifest, registry
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AGENT_DIR="$PROJECT_ROOT/skills/caesar"

PASS=0; FAIL=0; WARN=0; TOTAL=0

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo -e "  ${GREEN}[PASS]${NC} $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo -e "  ${RED}[FAIL]${NC} $1"; }
warn() { WARN=$((WARN + 1)); echo -e "  ${YELLOW}[WARN]${NC} $1"; }
section() { echo ""; echo -e "${BLUE}  === $1 ===${NC}"; echo ""; }

# ============================================================
section "Test Suite 1: Caesar Agent Structure"

[ -d "$AGENT_DIR" ] && pass "skills/caesar/ directory exists" || fail "skills/caesar/ directory NOT found"
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

    echo "$CONTENT" | grep -qi "chaos monkey\|chaos engineering" && pass "Covers Chaos Engineering" || fail "Missing Chaos Engineering"
    echo "$CONTENT" | grep -qi "litmus" && pass "Covers Litmus" || fail "Missing Litmus"
    echo "$CONTENT" | grep -qi "gremlin" && pass "Covers Gremlin" || fail "Missing Gremlin"
    echo "$CONTENT" | grep -qi "gameday\|game day" && pass "Covers GameDay" || fail "Missing GameDay"
    echo "$CONTENT" | grep -qi "steady.state" && pass "Covers Steady State" || fail "Missing Steady State"
    echo "$CONTENT" | grep -qi "blast radius" && pass "Covers Blast Radius" || fail "Missing Blast Radius"
    echo "$CONTENT" | grep -qi "resilience" && pass "Covers Resilience Scoring" || fail "Missing Resilience"
    echo "$CONTENT" | grep -qi "circuit breaker" && pass "Covers Circuit Breaker" || fail "Missing Circuit Breaker"
    echo "$CONTENT" | grep -qi "Routage Inter-Agents" && pass "Has Routage Inter-Agents" || fail "Missing Routage"

    WORD_COUNT=$(echo "$CONTENT" | wc -w)
    [ "$WORD_COUNT" -gt 1000 ] && pass "Substantial content ($WORD_COUNT words)" || fail "Too short ($WORD_COUNT words)"
fi

# ============================================================
section "Test Suite 3: Manifest Validation"

if [ -f "$AGENT_DIR/mugiwara.yaml" ]; then
    MANIFEST=$(cat "$AGENT_DIR/mugiwara.yaml")
    echo "$MANIFEST" | grep -q "^name: caesar" && pass "Correct name" || fail "Wrong name"
    echo "$MANIFEST" | grep -q "^version: 1.9.0" && pass "Version 1.9.0" || fail "Wrong version"
    echo "$MANIFEST" | grep -q "^category: performance" && pass "Category: performance" || fail "Wrong category"
    echo "$MANIFEST" | grep -q "^checksum:" && pass "Has checksum" || fail "Missing checksum"
fi

# ============================================================
section "Test Suite 4: Registry Integration"

REGISTRY="$PROJECT_ROOT/registry.yaml"
if [ -f "$REGISTRY" ]; then
    grep -q "^  caesar:" "$REGISTRY" && pass "caesar in registry" || fail "caesar NOT in registry"
    grep -q "^  chaos:" "$REGISTRY" && pass "chaos alias in registry" || fail "chaos alias NOT in registry"
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
