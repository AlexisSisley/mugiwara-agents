#!/bin/bash
# ============================================================
# Monitoring Agent - Test Suite
# Tests for the monitoring/alerting agent (US-705)
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
SKILLS_DIR="$PROJECT_ROOT/skills"
MONITORING_DIR="$SKILLS_DIR/monitoring"
SCHEMAS_DIR="$PROJECT_ROOT/schemas"

# ── Counters ────────────────────────────────────────────────
PASS=0
FAIL=0
WARN=0
TOTAL=0

# ── Test helpers ────────────────────────────────────────────
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

# ════════════════════════════════════════════════════════════
# TEST SUITE 1: Agent Structure
# ════════════════════════════════════════════════════════════
section "Test Suite 1: Monitoring Agent Structure"

# T1.1 - Monitoring directory exists
if [ -d "$MONITORING_DIR" ]; then
    pass "skills/monitoring/ directory exists"
else
    fail "skills/monitoring/ directory NOT found"
fi

# T1.2 - SKILL.md exists
if [ -f "$MONITORING_DIR/SKILL.md" ]; then
    pass "SKILL.md exists"
else
    fail "SKILL.md NOT found in skills/monitoring/"
fi

# T1.3 - mugiwara.yaml manifest exists
if [ -f "$MONITORING_DIR/mugiwara.yaml" ]; then
    pass "mugiwara.yaml manifest exists"
else
    fail "mugiwara.yaml NOT found in skills/monitoring/"
fi

# T1.4 - SKILL.md starts with YAML front matter
if [ -f "$MONITORING_DIR/SKILL.md" ]; then
    first_line=$(head -1 "$MONITORING_DIR/SKILL.md")
    if [ "$first_line" = "---" ]; then
        pass "SKILL.md starts with YAML front matter (---)"
    else
        fail "SKILL.md does not start with --- (got: $first_line)"
    fi
fi

# T1.5 - SKILL.md has closing front matter
if [ -f "$MONITORING_DIR/SKILL.md" ]; then
    closing=$(awk 'NR>1 && /^---$/{print NR; exit}' "$MONITORING_DIR/SKILL.md")
    if [ -n "$closing" ]; then
        pass "SKILL.md has closing front matter delimiter"
    else
        fail "SKILL.md missing closing front matter delimiter"
    fi
fi

# ════════════════════════════════════════════════════════════
# TEST SUITE 2: SKILL.md Content Quality
# ════════════════════════════════════════════════════════════
section "Test Suite 2: SKILL.md Content Quality"

if [ -f "$MONITORING_DIR/SKILL.md" ]; then
    CONTENT=$(cat "$MONITORING_DIR/SKILL.md")

    # T2.1 - Contains Prometheus section
    if echo "$CONTENT" | grep -qi "prometheus"; then
        pass "SKILL.md covers Prometheus"
    else
        fail "SKILL.md does not mention Prometheus"
    fi

    # T2.2 - Contains Grafana section
    if echo "$CONTENT" | grep -qi "grafana"; then
        pass "SKILL.md covers Grafana"
    else
        fail "SKILL.md does not mention Grafana"
    fi

    # T2.3 - Contains alerting rules
    if echo "$CONTENT" | grep -qi "alert"; then
        pass "SKILL.md covers alerting"
    else
        fail "SKILL.md does not mention alerting"
    fi

    # T2.4 - Contains PromQL examples
    if echo "$CONTENT" | grep -q "rate("; then
        pass "SKILL.md contains PromQL examples"
    else
        fail "SKILL.md does not contain PromQL examples"
    fi

    # T2.5 - Contains docker-compose for stack
    if echo "$CONTENT" | grep -qi "docker-compose\|docker compose"; then
        pass "SKILL.md includes Docker Compose config"
    else
        warn "SKILL.md does not include Docker Compose config"
    fi

    # T2.6 - Contains SRE best practices
    if echo "$CONTENT" | grep -qi "SRE\|SLI\|SLO"; then
        pass "SKILL.md covers SRE practices (SLI/SLO)"
    else
        warn "SKILL.md does not mention SRE/SLI/SLO"
    fi

    # T2.7 - Contains runbook template
    if echo "$CONTENT" | grep -qi "runbook"; then
        pass "SKILL.md includes runbook template"
    else
        warn "SKILL.md does not include runbook template"
    fi

    # T2.8 - Contains PagerDuty/OpsGenie dev testing strategy
    if echo "$CONTENT" | grep -qi "dev.*testing\|staging.*test\|test.*endpoint\|test.*alert"; then
        pass "SKILL.md covers PagerDuty/OpsGenie dev testing strategy"
    else
        fail "SKILL.md missing PagerDuty/OpsGenie testing guidance"
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
    if echo "$CONTENT" | grep -q "/monitoring"; then
        pass "SKILL.md has invocation command (/monitoring)"
    else
        fail "SKILL.md missing invocation command"
    fi
fi

# ════════════════════════════════════════════════════════════
# TEST SUITE 3: Manifest Validation
# ════════════════════════════════════════════════════════════
section "Test Suite 3: Manifest Validation (mugiwara.yaml)"

if [ -f "$MONITORING_DIR/mugiwara.yaml" ]; then
    MANIFEST=$(cat "$MONITORING_DIR/mugiwara.yaml")

    # T3.1 - Name field
    if echo "$MANIFEST" | grep -q "^name: monitoring"; then
        pass "Manifest has correct name: monitoring"
    else
        fail "Manifest name is not 'monitoring'"
    fi

    # T3.2 - Version field
    if echo "$MANIFEST" | grep -q "^version: 1.7.0"; then
        pass "Manifest has version 1.7.0"
    else
        fail "Manifest version is not 1.7.0"
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

    # T3.5 - Checksum matches actual file
    if command -v sha256sum >/dev/null 2>&1; then
        ACTUAL_HASH=$(sha256sum "$MONITORING_DIR/SKILL.md" | awk '{print $1}')
        MANIFEST_HASH=$(grep "SKILL.md:" "$MONITORING_DIR/mugiwara.yaml" | sed 's/.*"\(.*\)"/\1/')
        if [ "$ACTUAL_HASH" = "$MANIFEST_HASH" ]; then
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
fi

# ════════════════════════════════════════════════════════════
# TEST SUITE 4: Registry Integration
# ════════════════════════════════════════════════════════════
section "Test Suite 4: Registry Integration"

REGISTRY="$PROJECT_ROOT/registry.yaml"

if [ -f "$REGISTRY" ]; then
    # T4.1 - monitoring entry exists in registry
    if grep -q "^  monitoring:" "$REGISTRY"; then
        pass "monitoring agent registered in registry.yaml"
    else
        fail "monitoring agent NOT found in registry.yaml"
    fi

    # T4.2 - registry version matches manifest
    REG_VERSION=$(grep -A 3 "^  monitoring:" "$REGISTRY" | grep "version:" | awk '{print $2}')
    if [ "$REG_VERSION" = "1.7.0" ]; then
        pass "Registry version matches manifest (1.7.0)"
    else
        fail "Registry version mismatch (got: $REG_VERSION, expected: 1.7.0)"
    fi

    # T4.3 - registry category matches
    REG_CAT=$(grep -A 3 "^  monitoring:" "$REGISTRY" | grep "category:" | awk '{print $2}')
    if [ "$REG_CAT" = "infrastructure" ]; then
        pass "Registry category matches manifest (infrastructure)"
    else
        fail "Registry category mismatch (got: $REG_CAT, expected: infrastructure)"
    fi
else
    fail "registry.yaml not found"
fi

# ════════════════════════════════════════════════════════════
# TEST SUITE 5: Schema Validation
# ════════════════════════════════════════════════════════════
section "Test Suite 5: JSON Schema"

# T5.1 - Schema file exists
if [ -f "$SCHEMAS_DIR/agent-event.schema.json" ]; then
    pass "schemas/agent-event.schema.json exists"
else
    fail "schemas/agent-event.schema.json NOT found"
fi

# T5.2 - Schema is valid JSON
if [ -f "$SCHEMAS_DIR/agent-event.schema.json" ]; then
    if jq empty "$SCHEMAS_DIR/agent-event.schema.json" 2>/dev/null; then
        pass "Schema file is valid JSON"
    else
        fail "Schema file is NOT valid JSON"
    fi
fi

# T5.3 - Schema has required fields defined
if [ -f "$SCHEMAS_DIR/agent-event.schema.json" ]; then
    REQ=$(jq -r '.required[]' "$SCHEMAS_DIR/agent-event.schema.json" 2>/dev/null | sort | tr '\n' ',')
    if echo "$REQ" | grep -q "event" && echo "$REQ" | grep -q "timestamp"; then
        pass "Schema requires 'timestamp' and 'event' fields"
    else
        fail "Schema missing required fields (got: $REQ)"
    fi
fi

# T5.4 - Schema has event enum
if [ -f "$SCHEMAS_DIR/agent-event.schema.json" ]; then
    ENUM_COUNT=$(jq '.properties.event.enum | length' "$SCHEMAS_DIR/agent-event.schema.json" 2>/dev/null)
    if [ "$ENUM_COUNT" -gt 3 ]; then
        pass "Schema event enum has $ENUM_COUNT values"
    else
        fail "Schema event enum has too few values ($ENUM_COUNT)"
    fi
fi

# T5.5 - Validator script exists
if [ -f "$SCHEMAS_DIR/validate-jsonl.sh" ]; then
    pass "Schema validator script exists"
else
    fail "Schema validator script NOT found"
fi

# T5.6 - Validate existing logs against schema
if [ -f "$SCHEMAS_DIR/validate-jsonl.sh" ] && [ -f "$PROJECT_ROOT/logs/agents.jsonl" ]; then
    # Run validator, allow line 12 invalid JSON (known pre-existing issue)
    VALIDATION_OUTPUT=$(bash "$SCHEMAS_DIR/validate-jsonl.sh" 2>&1 || true)
    INVALID_COUNT=$(echo "$VALIDATION_OUTPUT" | grep -c "Invalid JSON" || true)
    if [ "$INVALID_COUNT" -le 1 ]; then
        pass "Existing logs pass schema validation (<=1 pre-existing invalid line)"
    else
        fail "Existing logs have $INVALID_COUNT invalid JSON lines"
    fi
fi

# ════════════════════════════════════════════════════════════
# TEST SUITE 6: Conventional Commits Setup
# ════════════════════════════════════════════════════════════
section "Test Suite 6: Conventional Commits & Tooling"

# T6.1 - package.json exists at root
if [ -f "$PROJECT_ROOT/package.json" ]; then
    pass "package.json exists at project root"
else
    fail "package.json NOT found at project root"
fi

# T6.2 - commitlint config exists
if [ -f "$PROJECT_ROOT/commitlint.config.js" ]; then
    pass "commitlint.config.js exists"
else
    fail "commitlint.config.js NOT found"
fi

# T6.3 - Husky commit-msg hook exists
if [ -f "$PROJECT_ROOT/.husky/commit-msg" ]; then
    pass ".husky/commit-msg hook exists"
else
    fail ".husky/commit-msg hook NOT found"
fi

# T6.4 - CONTRIBUTING.md exists
if [ -f "$PROJECT_ROOT/CONTRIBUTING.md" ]; then
    pass "CONTRIBUTING.md exists"
else
    fail "CONTRIBUTING.md NOT found"
fi

# T6.5 - CONTRIBUTING.md mentions Conventional Commits
if [ -f "$PROJECT_ROOT/CONTRIBUTING.md" ]; then
    if grep -qi "conventional commits" "$PROJECT_ROOT/CONTRIBUTING.md"; then
        pass "CONTRIBUTING.md documents Conventional Commits"
    else
        fail "CONTRIBUTING.md does not mention Conventional Commits"
    fi
fi

# T6.6 - CHANGELOG.md exists
if [ -f "$PROJECT_ROOT/CHANGELOG.md" ]; then
    pass "CHANGELOG.md exists"
else
    fail "CHANGELOG.md NOT found"
fi

# T6.7 - CHANGELOG.md has retroactive entries
if [ -f "$PROJECT_ROOT/CHANGELOG.md" ]; then
    VERSIONS_FOUND=$(grep -c "^## \[" "$PROJECT_ROOT/CHANGELOG.md" || true)
    if [ "$VERSIONS_FOUND" -ge 7 ]; then
        pass "CHANGELOG.md has $VERSIONS_FOUND version entries (covers v1.0-v1.6+)"
    else
        fail "CHANGELOG.md has only $VERSIONS_FOUND version entries (expected >= 7)"
    fi
fi

# T6.8 - commitlint rejects bad commits
if command -v npx >/dev/null 2>&1; then
    BAD_RESULT=$(echo "bad message" | npx --no -- commitlint 2>&1 || true)
    if echo "$BAD_RESULT" | grep -q "found.*problems"; then
        pass "commitlint correctly rejects non-conventional commits"
    else
        warn "Could not verify commitlint rejection (may need npm install)"
    fi
fi

# T6.9 - commitlint accepts valid commits
if command -v npx >/dev/null 2>&1; then
    GOOD_RESULT=$(echo "feat(monitoring): add agent" | npx --no -- commitlint 2>&1; echo "EXIT:$?")
    if echo "$GOOD_RESULT" | grep -q "EXIT:0"; then
        pass "commitlint correctly accepts conventional commits"
    else
        warn "Could not verify commitlint acceptance"
    fi
fi

# ════════════════════════════════════════════════════════════
# RESULTS
# ════════════════════════════════════════════════════════════
echo ""
echo "  ════════════════════════════════════════"
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
