#!/bin/bash
# ============================================================
# Hawkins Agent - Test Suite
# Tests for the Hawkins agent (v1.9)
# Validates: agent structure, SKILL.md content quality,
# BI/Data Viz coverage, manifest, registry
# ============================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AGENT_DIR="$PROJECT_ROOT/skills/hawkins"

PASS=0; FAIL=0; WARN=0; TOTAL=0

pass() { PASS=$((PASS + 1)); TOTAL=$((TOTAL + 1)); echo -e "  ${GREEN}[PASS]${NC} $1"; }
fail() { FAIL=$((FAIL + 1)); TOTAL=$((TOTAL + 1)); echo -e "  ${RED}[FAIL]${NC} $1"; }
warn() { WARN=$((WARN + 1)); echo -e "  ${YELLOW}[WARN]${NC} $1"; }
section() { echo ""; echo -e "${BLUE}  === $1 ===${NC}"; echo ""; }

# ============================================================
section "Test Suite 1: Hawkins Agent Structure"

[ -d "$AGENT_DIR" ] && pass "skills/hawkins/ directory exists" || fail "skills/hawkins/ directory NOT found"
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

    echo "$CONTENT" | grep -qi "power bi" && pass "Covers Power BI" || fail "Missing Power BI"
    echo "$CONTENT" | grep -qi "tableau" && pass "Covers Tableau" || fail "Missing Tableau"
    echo "$CONTENT" | grep -qi "metabase" && pass "Covers Metabase" || fail "Missing Metabase"
    echo "$CONTENT" | grep -qi "superset" && pass "Covers Superset" || fail "Missing Superset"
    echo "$CONTENT" | grep -qi "looker\|LookML" && pass "Covers Looker" || fail "Missing Looker"
    echo "$CONTENT" | grep -qi "DAX" && pass "Covers DAX" || fail "Missing DAX"
    echo "$CONTENT" | grep -qi "MDX" && pass "Covers MDX" || fail "Missing MDX"
    echo "$CONTENT" | grep -qi "storytelling" && pass "Covers Data Storytelling" || fail "Missing Storytelling"
    echo "$CONTENT" | grep -qi "KPI" && pass "Covers KPI" || fail "Missing KPI"
    echo "$CONTENT" | grep -qi "Routage Inter-Agents" && pass "Has Routage Inter-Agents" || fail "Missing Routage"

    WORD_COUNT=$(echo "$CONTENT" | wc -w)
    [ "$WORD_COUNT" -gt 1000 ] && pass "Substantial content ($WORD_COUNT words)" || fail "Too short ($WORD_COUNT words)"
fi

# ============================================================
section "Test Suite 3: Manifest Validation"

if [ -f "$AGENT_DIR/mugiwara.yaml" ]; then
    MANIFEST=$(cat "$AGENT_DIR/mugiwara.yaml")
    echo "$MANIFEST" | grep -q "^name: hawkins" && pass "Correct name" || fail "Wrong name"
    echo "$MANIFEST" | grep -q "^version: 1.9.0" && pass "Version 1.9.0" || fail "Wrong version"
    echo "$MANIFEST" | grep -q "^category: data" && pass "Category: data" || fail "Wrong category"
    echo "$MANIFEST" | grep -q "^checksum:" && pass "Has checksum" || fail "Missing checksum"
fi

# ============================================================
section "Test Suite 4: Registry Integration"

REGISTRY="$PROJECT_ROOT/registry.yaml"
if [ -f "$REGISTRY" ]; then
    grep -q "^  hawkins:" "$REGISTRY" && pass "hawkins in registry" || fail "hawkins NOT in registry"
    grep -q "^  bi:" "$REGISTRY" && pass "bi alias in registry" || fail "bi alias NOT in registry"
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
