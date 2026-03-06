#!/bin/bash
# ============================================================
# Big Mom Agent - Test Suite
# Tests for the Big Mom agent (v1.9)
# Validates: agent structure, SKILL.md content quality,
# agile/scrum coverage, manifest, registry
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
AGENT_DIR="$SKILLS_DIR/big-mom"

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
section "Test Suite 1: Big Mom Agent Structure"

if [ -d "$AGENT_DIR" ]; then
    pass "skills/big-mom/ directory exists"
else
    fail "skills/big-mom/ directory NOT found"
fi

if [ -f "$AGENT_DIR/SKILL.md" ]; then
    pass "SKILL.md exists"
else
    fail "SKILL.md NOT found in skills/big-mom/"
fi

if [ -f "$AGENT_DIR/mugiwara.yaml" ]; then
    pass "mugiwara.yaml manifest exists"
else
    fail "mugiwara.yaml NOT found in skills/big-mom/"
fi

if [ -f "$AGENT_DIR/SKILL.md" ]; then
    first_line=$(head -1 "$AGENT_DIR/SKILL.md")
    if [ "$first_line" = "---" ]; then
        pass "SKILL.md starts with YAML front matter (---)"
    else
        fail "SKILL.md does not start with --- (got: $first_line)"
    fi

    closing=$(awk 'NR>1 && /^---$/{print NR; exit}' "$AGENT_DIR/SKILL.md")
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

if [ -f "$AGENT_DIR/SKILL.md" ]; then
    CONTENT=$(cat "$AGENT_DIR/SKILL.md")

    if echo "$CONTENT" | grep -qi "sprint planning"; then
        pass "SKILL.md covers Sprint Planning"
    else
        fail "SKILL.md does not mention Sprint Planning"
    fi

    if echo "$CONTENT" | grep -qi "retrospective"; then
        pass "SKILL.md covers Retrospectives"
    else
        fail "SKILL.md does not mention Retrospectives"
    fi

    if echo "$CONTENT" | grep -qi "velocity"; then
        pass "SKILL.md covers Velocity"
    else
        fail "SKILL.md does not mention Velocity"
    fi

    if echo "$CONTENT" | grep -qi "kanban"; then
        pass "SKILL.md covers Kanban"
    else
        fail "SKILL.md does not mention Kanban"
    fi

    if echo "$CONTENT" | grep -qi "SAFe\|safe"; then
        pass "SKILL.md covers SAFe"
    else
        fail "SKILL.md does not mention SAFe"
    fi

    if echo "$CONTENT" | grep -qi "jira"; then
        pass "SKILL.md covers Jira"
    else
        fail "SKILL.md does not mention Jira"
    fi

    if echo "$CONTENT" | grep -qi "linear"; then
        pass "SKILL.md covers Linear"
    else
        fail "SKILL.md does not mention Linear"
    fi

    if echo "$CONTENT" | grep -qi "health check\|team health"; then
        pass "SKILL.md covers Team Health"
    else
        fail "SKILL.md does not mention Team Health"
    fi

    if echo "$CONTENT" | grep -qi "Routage Inter-Agents"; then
        pass "SKILL.md has Routage Inter-Agents section"
    else
        fail "SKILL.md missing Routage Inter-Agents section"
    fi

    WORD_COUNT=$(echo "$CONTENT" | wc -w)
    if [ "$WORD_COUNT" -gt 1000 ]; then
        pass "SKILL.md has substantial content ($WORD_COUNT words)"
    else
        fail "SKILL.md is too short ($WORD_COUNT words, expected > 1000)"
    fi
fi

# ============================================================
# TEST SUITE 3: Manifest Validation
# ============================================================
section "Test Suite 3: Manifest Validation (mugiwara.yaml)"

if [ -f "$AGENT_DIR/mugiwara.yaml" ]; then
    MANIFEST=$(cat "$AGENT_DIR/mugiwara.yaml")

    if echo "$MANIFEST" | grep -q "^name: big-mom"; then
        pass "Manifest has correct name: big-mom"
    else
        fail "Manifest name is not 'big-mom'"
    fi

    if echo "$MANIFEST" | grep -q "^version: 1.9.0"; then
        pass "Manifest has version 1.9.0"
    else
        fail "Manifest version is not 1.9.0"
    fi

    if echo "$MANIFEST" | grep -q "^category: management"; then
        pass "Manifest has category: management"
    else
        fail "Manifest category is not 'management'"
    fi

    if echo "$MANIFEST" | grep -q "^checksum:"; then
        pass "Manifest has checksum section"
    else
        fail "Manifest missing checksum section"
    fi
fi

# ============================================================
# TEST SUITE 4: Registry Integration
# ============================================================
section "Test Suite 4: Registry Integration"

REGISTRY="$PROJECT_ROOT/registry.yaml"

if [ -f "$REGISTRY" ]; then
    if grep -q "^  big-mom:" "$REGISTRY"; then
        pass "big-mom agent registered in registry.yaml"
    else
        fail "big-mom agent NOT found in registry.yaml"
    fi

    if grep -q "^  agile:" "$REGISTRY"; then
        pass "agile alias registered in registry.yaml"
    else
        fail "agile alias NOT found in registry.yaml"
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
