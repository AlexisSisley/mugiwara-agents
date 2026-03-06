#!/bin/bash
# ============================================================
# Feature Flags Agent - Test Suite
# Tests for the feature-flags agent (US-707)
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
FF_DIR="$SKILLS_DIR/feature-flags"

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
section "Test Suite 1: Feature Flags Agent Structure"

# T1.1 - Feature-flags directory exists
if [ -d "$FF_DIR" ]; then
    pass "skills/feature-flags/ directory exists"
else
    fail "skills/feature-flags/ directory NOT found"
fi

# T1.2 - SKILL.md exists
if [ -f "$FF_DIR/SKILL.md" ]; then
    pass "SKILL.md exists"
else
    fail "SKILL.md NOT found in skills/feature-flags/"
fi

# T1.3 - mugiwara.yaml manifest exists
if [ -f "$FF_DIR/mugiwara.yaml" ]; then
    pass "mugiwara.yaml manifest exists"
else
    fail "mugiwara.yaml NOT found in skills/feature-flags/"
fi

# T1.4 - SKILL.md starts with YAML front matter
if [ -f "$FF_DIR/SKILL.md" ]; then
    first_line=$(head -1 "$FF_DIR/SKILL.md")
    if [ "$first_line" = "---" ]; then
        pass "SKILL.md starts with YAML front matter (---)"
    else
        fail "SKILL.md does not start with --- (got: $first_line)"
    fi
fi

# T1.5 - SKILL.md has closing front matter
if [ -f "$FF_DIR/SKILL.md" ]; then
    closing=$(awk 'NR>1 && /^---$/{print NR; exit}' "$FF_DIR/SKILL.md")
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

if [ -f "$FF_DIR/SKILL.md" ]; then
    CONTENT=$(cat "$FF_DIR/SKILL.md")

    # T2.1 - Contains env-based flags section
    if echo "$CONTENT" | grep -qi "environment\|env-based\|process.env"; then
        pass "SKILL.md covers env-based feature flags"
    else
        fail "SKILL.md does not mention env-based flags"
    fi

    # T2.2 - Contains Unleash section
    if echo "$CONTENT" | grep -qi "unleash"; then
        pass "SKILL.md covers Unleash"
    else
        fail "SKILL.md does not mention Unleash"
    fi

    # T2.3 - Contains LaunchDarkly section
    if echo "$CONTENT" | grep -qi "launchdarkly"; then
        pass "SKILL.md covers LaunchDarkly"
    else
        fail "SKILL.md does not mention LaunchDarkly"
    fi

    # T2.4 - Contains code examples (JavaScript/TypeScript)
    if echo "$CONTENT" | grep -q "export function\|export async function\|import "; then
        pass "SKILL.md contains code examples"
    else
        fail "SKILL.md does not contain code examples"
    fi

    # T2.5 - Contains Docker Compose for Unleash
    if echo "$CONTENT" | grep -qi "docker-compose\|docker compose"; then
        pass "SKILL.md includes Docker Compose config"
    else
        warn "SKILL.md does not include Docker Compose config"
    fi

    # T2.6 - Contains rollout/progressive delivery concepts
    if echo "$CONTENT" | grep -qi "rollout\|progressive\|percentage\|canary"; then
        pass "SKILL.md covers progressive delivery strategies"
    else
        fail "SKILL.md does not mention rollout strategies"
    fi

    # T2.7 - Contains flag lifecycle management
    if echo "$CONTENT" | grep -qi "lifecycle\|cleanup\|hygiene\|stale\|obsolete"; then
        pass "SKILL.md covers flag lifecycle management"
    else
        warn "SKILL.md does not mention flag lifecycle"
    fi

    # T2.8 - Contains comparison table
    if echo "$CONTENT" | grep -qi "comparison\|criteria.*env.*unleash\|env-based.*unleash.*launchdarkly"; then
        pass "SKILL.md includes provider comparison"
    else
        warn "SKILL.md does not include provider comparison"
    fi

    # T2.9 - Contains checklist
    if echo "$CONTENT" | grep -q "\- \[ \]"; then
        pass "SKILL.md includes deployment checklist"
    else
        warn "SKILL.md does not include checklist"
    fi

    # T2.10 - Minimum content length (should be substantial)
    WORD_COUNT=$(echo "$CONTENT" | wc -w)
    if [ "$WORD_COUNT" -gt 500 ]; then
        pass "SKILL.md has substantial content ($WORD_COUNT words)"
    else
        fail "SKILL.md is too short ($WORD_COUNT words, expected > 500)"
    fi

    # T2.11 - Has invocation section
    if echo "$CONTENT" | grep -q "/feature-flags"; then
        pass "SKILL.md has invocation command (/feature-flags)"
    else
        fail "SKILL.md missing invocation command"
    fi

    # T2.12 - Contains middleware/SDK pattern
    if echo "$CONTENT" | grep -qi "middleware\|sdk"; then
        pass "SKILL.md covers middleware/SDK patterns"
    else
        fail "SKILL.md does not mention middleware or SDK"
    fi
fi

# ============================================================
# TEST SUITE 3: Manifest Validation
# ============================================================
section "Test Suite 3: Manifest Validation (mugiwara.yaml)"

if [ -f "$FF_DIR/mugiwara.yaml" ]; then
    MANIFEST=$(cat "$FF_DIR/mugiwara.yaml")

    # T3.1 - Name field
    if echo "$MANIFEST" | grep -q "^name: feature-flags"; then
        pass "Manifest has correct name: feature-flags"
    else
        fail "Manifest name is not 'feature-flags'"
    fi

    # T3.2 - Version field
    if echo "$MANIFEST" | grep -q "^version: 1.9.0"; then
        pass "Manifest has version 1.9.0"
    else
        fail "Manifest version is not 1.9.0"
    fi

    # T3.3 - Category field
    if echo "$MANIFEST" | grep -q "^category: infrastructure"; then
        pass "Manifest has category: infrastructure"
    else
        fail "Manifest category is not 'infrastructure'"
    fi

    # T3.4 - Checksum field
    if echo "$MANIFEST" | grep -q "^checksum:"; then
        pass "Manifest has checksum section"
    else
        fail "Manifest missing checksum section"
    fi

    # T3.5 - Checksum matches actual file (LF-normalized for cross-platform)
    if command -v sha256sum >/dev/null 2>&1; then
        ACTUAL_HASH=$(tr -d '\r' < "$FF_DIR/SKILL.md" | sha256sum | awk '{print $1}')
        MANIFEST_HASH=$(grep "SKILL.md:" "$FF_DIR/mugiwara.yaml" | sed 's/.*"\(.*\)"/\1/')
        if [ -z "$MANIFEST_HASH" ]; then
            warn "SKILL.md checksum is empty in manifest, skipping"
        elif [ "$ACTUAL_HASH" = "$MANIFEST_HASH" ]; then
            pass "SKILL.md checksum matches manifest"
        else
            fail "SKILL.md checksum mismatch (actual: $ACTUAL_HASH, manifest: $MANIFEST_HASH)"
        fi
    else
        warn "sha256sum not available, skipping checksum verification"
    fi

    # T3.6 - Files field lists SKILL.md
    if echo "$MANIFEST" | grep -q "SKILL.md"; then
        pass "Manifest files list includes SKILL.md"
    else
        fail "Manifest files list does not include SKILL.md"
    fi

    # T3.7 - Tags include key providers
    if echo "$MANIFEST" | grep -q "unleash" && echo "$MANIFEST" | grep -q "launchdarkly"; then
        pass "Manifest tags include unleash and launchdarkly"
    else
        fail "Manifest tags missing key providers"
    fi
fi

# ============================================================
# TEST SUITE 4: Registry Integration
# ============================================================
section "Test Suite 4: Registry Integration"

REGISTRY="$PROJECT_ROOT/registry.yaml"

if [ -f "$REGISTRY" ]; then
    # T4.1 - feature-flags entry exists in registry
    if grep -q "^  feature-flags:" "$REGISTRY"; then
        pass "feature-flags agent registered in registry.yaml"
    else
        fail "feature-flags agent NOT found in registry.yaml"
    fi

    # T4.2 - registry version matches manifest
    REG_VERSION=$(grep -A 3 "^  feature-flags:" "$REGISTRY" | grep "version:" | awk '{print $2}')
    if [ "$REG_VERSION" = "1.9.0" ]; then
        pass "Registry version matches manifest (1.9.0)"
    else
        fail "Registry version mismatch (got: $REG_VERSION, expected: 1.9.0)"
    fi

    # T4.3 - registry category matches
    REG_CAT=$(grep -A 3 "^  feature-flags:" "$REGISTRY" | grep "category:" | awk '{print $2}')
    if [ "$REG_CAT" = "infrastructure" ]; then
        pass "Registry category matches manifest (infrastructure)"
    else
        fail "Registry category mismatch (got: $REG_CAT, expected: infrastructure)"
    fi
else
    fail "registry.yaml not found"
fi

# ============================================================
# TEST SUITE 5: Cross-Agent Consistency
# ============================================================
section "Test Suite 5: Cross-Agent Consistency"

# T5.1 - feature-flags scope in commitlint config
if [ -f "$PROJECT_ROOT/commitlint.config.js" ]; then
    if grep -q "'feature-flags'" "$PROJECT_ROOT/commitlint.config.js"; then
        pass "feature-flags scope registered in commitlint config"
    else
        fail "feature-flags scope NOT found in commitlint config"
    fi
fi

# T5.2 - Monitoring agent references incident management providers
if [ -f "$SKILLS_DIR/monitoring/SKILL.md" ]; then
    MON_CONTENT=$(cat "$SKILLS_DIR/monitoring/SKILL.md")
    if echo "$MON_CONTENT" | grep -qi "pagerduty" && echo "$MON_CONTENT" | grep -qi "opsgenie"; then
        pass "Monitoring agent covers PagerDuty and OpsGenie (enriched)"
    else
        fail "Monitoring agent missing PagerDuty or OpsGenie coverage"
    fi
fi

# T5.3 - Both new agents have same version
if [ -f "$FF_DIR/mugiwara.yaml" ] && [ -f "$SKILLS_DIR/monitoring/mugiwara.yaml" ]; then
    FF_VER=$(grep "^version:" "$FF_DIR/mugiwara.yaml" | awk '{print $2}')
    MON_VER=$(grep "^version:" "$SKILLS_DIR/monitoring/mugiwara.yaml" | awk '{print $2}')
    if [ "$FF_VER" = "$MON_VER" ] && [ "$FF_VER" = "1.9.0" ]; then
        pass "Both v1.9 agents have consistent version (1.9.0)"
    else
        fail "Version mismatch: feature-flags=$FF_VER, monitoring=$MON_VER"
    fi
fi

# ============================================================
# TEST SUITE 6: Schema Integration
# ============================================================
section "Test Suite 6: Schema Integration"

SCHEMA_FILE="$PROJECT_ROOT/schemas/agent-event.schema.json"

# T6.1 - Schema includes flag_evaluation event type
if [ -f "$SCHEMA_FILE" ]; then
    if grep -q '"flag_evaluation"' "$SCHEMA_FILE"; then
        pass "Schema includes flag_evaluation event type"
    else
        fail "Schema missing flag_evaluation event type for feature-flags agent"
    fi
fi

# T6.2 - Schema includes release_created event type (for release pipeline)
if [ -f "$SCHEMA_FILE" ]; then
    if grep -q '"release_created"' "$SCHEMA_FILE"; then
        pass "Schema includes release_created event type"
    else
        fail "Schema missing release_created event type for release pipeline"
    fi
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
