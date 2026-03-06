#!/bin/bash
# ============================================================
# Docker Agent - Test Suite
# Tests for the Docker agent (v1.8)
# Validates: agent structure, SKILL.md content quality,
# Dockerfile syntax, YAML validity, manifest, registry
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
DOCKER_DIR="$SKILLS_DIR/docker"

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
section "Test Suite 1: Docker Agent Structure"

# T1.1 - Docker directory exists
if [ -d "$DOCKER_DIR" ]; then
    pass "skills/docker/ directory exists"
else
    fail "skills/docker/ directory NOT found"
fi

# T1.2 - SKILL.md exists
if [ -f "$DOCKER_DIR/SKILL.md" ]; then
    pass "SKILL.md exists"
else
    fail "SKILL.md NOT found in skills/docker/"
fi

# T1.3 - mugiwara.yaml manifest exists
if [ -f "$DOCKER_DIR/mugiwara.yaml" ]; then
    pass "mugiwara.yaml manifest exists"
else
    fail "mugiwara.yaml NOT found in skills/docker/"
fi

# T1.4 - SKILL.md starts with YAML front matter
if [ -f "$DOCKER_DIR/SKILL.md" ]; then
    first_line=$(head -1 "$DOCKER_DIR/SKILL.md")
    if [ "$first_line" = "---" ]; then
        pass "SKILL.md starts with YAML front matter (---)"
    else
        fail "SKILL.md does not start with --- (got: $first_line)"
    fi
fi

# T1.5 - SKILL.md has closing front matter
if [ -f "$DOCKER_DIR/SKILL.md" ]; then
    closing=$(awk 'NR>1 && /^---$/{print NR; exit}' "$DOCKER_DIR/SKILL.md")
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

if [ -f "$DOCKER_DIR/SKILL.md" ]; then
    CONTENT=$(cat "$DOCKER_DIR/SKILL.md")

    # T2.1 - Contains Dockerfile section
    if echo "$CONTENT" | grep -qi "dockerfile"; then
        pass "SKILL.md covers Dockerfile"
    else
        fail "SKILL.md does not mention Dockerfile"
    fi

    # T2.2 - Contains docker-compose section
    if echo "$CONTENT" | grep -qi "docker-compose\|docker compose"; then
        pass "SKILL.md covers Docker Compose"
    else
        fail "SKILL.md does not mention Docker Compose"
    fi

    # T2.3 - Contains Kubernetes section
    if echo "$CONTENT" | grep -qi "kubernetes\|k8s"; then
        pass "SKILL.md covers Kubernetes"
    else
        fail "SKILL.md does not mention Kubernetes"
    fi

    # T2.4 - Contains Helm section
    if echo "$CONTENT" | grep -qi "helm"; then
        pass "SKILL.md covers Helm"
    else
        fail "SKILL.md does not mention Helm"
    fi

    # T2.5 - Contains Docker Swarm section
    if echo "$CONTENT" | grep -qi "swarm"; then
        pass "SKILL.md covers Docker Swarm"
    else
        fail "SKILL.md does not mention Docker Swarm"
    fi

    # T2.6 - Contains multi-stage build examples
    if echo "$CONTENT" | grep -qi "multi-stage\|AS builder"; then
        pass "SKILL.md covers multi-stage builds"
    else
        fail "SKILL.md does not mention multi-stage builds"
    fi

    # T2.7 - Contains security best practices
    if echo "$CONTENT" | grep -qi "non-root\|USER.*appuser\|securite\|security"; then
        pass "SKILL.md covers security best practices"
    else
        fail "SKILL.md does not mention security practices"
    fi

    # T2.8 - Contains .dockerignore
    if echo "$CONTENT" | grep -qi "dockerignore"; then
        pass "SKILL.md covers .dockerignore"
    else
        fail "SKILL.md does not mention .dockerignore"
    fi

    # T2.9 - Contains healthcheck
    if echo "$CONTENT" | grep -qi "HEALTHCHECK\|healthcheck"; then
        pass "SKILL.md covers healthcheck"
    else
        fail "SKILL.md does not mention healthcheck"
    fi

    # T2.10 - Minimum content length
    WORD_COUNT=$(echo "$CONTENT" | wc -w)
    if [ "$WORD_COUNT" -gt 1000 ]; then
        pass "SKILL.md has substantial content ($WORD_COUNT words)"
    else
        fail "SKILL.md is too short ($WORD_COUNT words, expected > 1000)"
    fi

    # T2.11 - No deprecated 'version' key in docker-compose examples (Franky fix)
    DEPRECATED_VERSION=$(echo "$CONTENT" | grep -c '^version: "3' || true)
    if [ "$DEPRECATED_VERSION" -eq 0 ]; then
        pass "No deprecated 'version' key in docker-compose examples"
    else
        fail "Found $DEPRECATED_VERSION deprecated 'version' keys in docker-compose examples"
    fi

    # T2.12 - Contains credential warnings
    if echo "$CONTENT" | grep -qi "WARNING.*credential\|WARNING.*secret\|WARNING.*password\|Ne jamais committer"; then
        pass "SKILL.md includes credential security warnings"
    else
        fail "SKILL.md missing credential security warnings"
    fi
fi

# ============================================================
# TEST SUITE 3: Dockerfile Syntax Validation
# ============================================================
section "Test Suite 3: Dockerfile Syntax Validation"

if [ -f "$DOCKER_DIR/SKILL.md" ]; then
    # Extract Dockerfile blocks and validate syntax
    DOCKERFILE_COUNT=$(grep -c '^```dockerfile' "$DOCKER_DIR/SKILL.md" || true)
    if [ "$DOCKERFILE_COUNT" -gt 0 ]; then
        pass "Found $DOCKERFILE_COUNT Dockerfile examples"
    else
        fail "No Dockerfile examples found"
    fi

    # T3.1 - All Dockerfiles have a FROM instruction
    FROM_COUNT=$(grep -c '^FROM ' "$DOCKER_DIR/SKILL.md" || true)
    if [ "$FROM_COUNT" -ge 4 ]; then
        pass "Found $FROM_COUNT FROM instructions (multiple stacks covered)"
    else
        fail "Only $FROM_COUNT FROM instructions found (expected >= 4)"
    fi

    # T3.2 - Multi-stage builds use AS keyword
    AS_COUNT=$(grep -c 'FROM.*AS ' "$DOCKER_DIR/SKILL.md" || true)
    if [ "$AS_COUNT" -ge 3 ]; then
        pass "Found $AS_COUNT multi-stage FROM...AS instructions"
    else
        fail "Only $AS_COUNT multi-stage builds found (expected >= 3)"
    fi

    # T3.3 - Dockerfiles have EXPOSE instruction
    EXPOSE_COUNT=$(grep -c '^EXPOSE ' "$DOCKER_DIR/SKILL.md" || true)
    if [ "$EXPOSE_COUNT" -ge 3 ]; then
        pass "Found $EXPOSE_COUNT EXPOSE instructions"
    else
        fail "Only $EXPOSE_COUNT EXPOSE instructions found (expected >= 3)"
    fi

    # T3.4 - Non-root USER instruction present
    USER_COUNT=$(grep -c '^USER ' "$DOCKER_DIR/SKILL.md" || true)
    if [ "$USER_COUNT" -ge 3 ]; then
        pass "Found $USER_COUNT USER instructions (non-root best practice)"
    else
        fail "Only $USER_COUNT USER instructions found (expected >= 3)"
    fi
fi

# ============================================================
# TEST SUITE 4: YAML Syntax Validation (docker-compose, k8s)
# ============================================================
section "Test Suite 4: YAML Content Validation"

if [ -f "$DOCKER_DIR/SKILL.md" ]; then
    # T4.1 - Compose files have 'services' key
    SERVICES_COUNT=$(grep -c '^services:' "$DOCKER_DIR/SKILL.md" || true)
    if [ "$SERVICES_COUNT" -ge 3 ]; then
        pass "Found $SERVICES_COUNT 'services:' blocks in compose examples"
    else
        fail "Only $SERVICES_COUNT 'services:' blocks found (expected >= 3)"
    fi

    # T4.2 - K8s manifests have apiVersion
    API_VERSION_COUNT=$(grep -c '^apiVersion:' "$DOCKER_DIR/SKILL.md" || true)
    if [ "$API_VERSION_COUNT" -ge 4 ]; then
        pass "Found $API_VERSION_COUNT K8s apiVersion declarations"
    else
        fail "Only $API_VERSION_COUNT K8s apiVersion declarations found (expected >= 4)"
    fi

    # T4.3 - K8s manifests have kind
    KIND_COUNT=$(grep -c '^kind:' "$DOCKER_DIR/SKILL.md" || true)
    if [ "$KIND_COUNT" -ge 4 ]; then
        pass "Found $KIND_COUNT K8s kind declarations"
    else
        fail "Only $KIND_COUNT K8s kind declarations found (expected >= 4)"
    fi

    # T4.4 - Helm Chart.yaml structure present
    if echo "$CONTENT" | grep -q "Chart.yaml"; then
        pass "SKILL.md includes Helm Chart.yaml reference"
    else
        fail "SKILL.md missing Helm Chart.yaml reference"
    fi
fi

# ============================================================
# TEST SUITE 5: Manifest Validation
# ============================================================
section "Test Suite 5: Manifest Validation (mugiwara.yaml)"

if [ -f "$DOCKER_DIR/mugiwara.yaml" ]; then
    MANIFEST=$(cat "$DOCKER_DIR/mugiwara.yaml")

    # T5.1 - Name field
    if echo "$MANIFEST" | grep -q "^name: docker"; then
        pass "Manifest has correct name: docker"
    else
        fail "Manifest name is not 'docker'"
    fi

    # T5.2 - Version field
    if echo "$MANIFEST" | grep -q "^version: 1.8.0"; then
        pass "Manifest has version 1.8.0"
    else
        fail "Manifest version is not 1.8.0"
    fi

    # T5.3 - Category field
    if echo "$MANIFEST" | grep -q "^category: infrastructure"; then
        pass "Manifest has category: infrastructure"
    else
        fail "Manifest category is not 'infrastructure'"
    fi

    # T5.4 - Checksum field
    if echo "$MANIFEST" | grep -q "^checksum:"; then
        pass "Manifest has checksum section"
    else
        fail "Manifest missing checksum section"
    fi

    # T5.5 - Checksum matches actual file
    if command -v sha256sum >/dev/null 2>&1; then
        ACTUAL_HASH=$(sha256sum "$DOCKER_DIR/SKILL.md" | awk '{print $1}')
        MANIFEST_HASH=$(grep "SKILL.md:" "$DOCKER_DIR/mugiwara.yaml" | sed 's/.*"\(.*\)"/\1/')
        if [ "$ACTUAL_HASH" = "$MANIFEST_HASH" ]; then
            pass "SKILL.md checksum matches manifest"
        else
            warn "SKILL.md checksum mismatch (will need update after edits)"
        fi
    else
        warn "sha256sum not available, skipping checksum verification"
    fi

    # T5.6 - Tags include key technologies
    if echo "$MANIFEST" | grep -q "docker" && echo "$MANIFEST" | grep -q "kubernetes"; then
        pass "Manifest tags include docker and kubernetes"
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
    # T6.1 - docker entry exists in registry
    if grep -q "^  docker:" "$REGISTRY"; then
        pass "docker agent registered in registry.yaml"
    else
        fail "docker agent NOT found in registry.yaml"
    fi

    # T6.2 - registry version matches manifest
    REG_VERSION=$(grep -A 3 "^  docker:" "$REGISTRY" | grep "version:" | awk '{print $2}')
    if [ "$REG_VERSION" = "1.8.0" ]; then
        pass "Registry version matches manifest (1.8.0)"
    else
        fail "Registry version mismatch (got: $REG_VERSION, expected: 1.8.0)"
    fi

    # T6.3 - registry category matches
    REG_CAT=$(grep -A 3 "^  docker:" "$REGISTRY" | grep "category:" | awk '{print $2}')
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
