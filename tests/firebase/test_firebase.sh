#!/bin/bash
# ============================================================
# Firebase Agent - Test Suite
# Tests for the Firebase agent (v1.8)
# Validates: agent structure, SKILL.md content quality,
# JSON syntax, Security Rules patterns, manifest, registry
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
FIREBASE_DIR="$SKILLS_DIR/firebase"

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
section "Test Suite 1: Firebase Agent Structure"

if [ -d "$FIREBASE_DIR" ]; then
    pass "skills/firebase/ directory exists"
else
    fail "skills/firebase/ directory NOT found"
fi

if [ -f "$FIREBASE_DIR/SKILL.md" ]; then
    pass "SKILL.md exists"
else
    fail "SKILL.md NOT found in skills/firebase/"
fi

if [ -f "$FIREBASE_DIR/mugiwara.yaml" ]; then
    pass "mugiwara.yaml manifest exists"
else
    fail "mugiwara.yaml NOT found in skills/firebase/"
fi

if [ -f "$FIREBASE_DIR/SKILL.md" ]; then
    first_line=$(head -1 "$FIREBASE_DIR/SKILL.md")
    if [ "$first_line" = "---" ]; then
        pass "SKILL.md starts with YAML front matter (---)"
    else
        fail "SKILL.md does not start with --- (got: $first_line)"
    fi
fi

if [ -f "$FIREBASE_DIR/SKILL.md" ]; then
    closing=$(awk 'NR>1 && /^---$/{print NR; exit}' "$FIREBASE_DIR/SKILL.md")
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

if [ -f "$FIREBASE_DIR/SKILL.md" ]; then
    CONTENT=$(cat "$FIREBASE_DIR/SKILL.md")

    # T2.1 - Authentication
    if echo "$CONTENT" | grep -qi "authentication\|auth"; then
        pass "SKILL.md covers Firebase Authentication"
    else
        fail "SKILL.md does not mention Authentication"
    fi

    # T2.2 - Firestore
    if echo "$CONTENT" | grep -qi "firestore"; then
        pass "SKILL.md covers Firestore"
    else
        fail "SKILL.md does not mention Firestore"
    fi

    # T2.3 - Security Rules
    if echo "$CONTENT" | grep -qi "security rules\|firestore.rules"; then
        pass "SKILL.md covers Security Rules"
    else
        fail "SKILL.md does not mention Security Rules"
    fi

    # T2.4 - Firebase Hosting
    if echo "$CONTENT" | grep -qi "hosting"; then
        pass "SKILL.md covers Firebase Hosting"
    else
        fail "SKILL.md does not mention Hosting"
    fi

    # T2.5 - Cloud Functions
    if echo "$CONTENT" | grep -qi "cloud functions\|firebase-functions"; then
        pass "SKILL.md covers Cloud Functions"
    else
        fail "SKILL.md does not mention Cloud Functions"
    fi

    # T2.6 - Storage
    if echo "$CONTENT" | grep -qi "firebase.*storage\|storage.*rules"; then
        pass "SKILL.md covers Firebase Storage"
    else
        fail "SKILL.md does not mention Storage"
    fi

    # T2.7 - FCM
    if echo "$CONTENT" | grep -qi "FCM\|Cloud Messaging\|push notification"; then
        pass "SKILL.md covers FCM"
    else
        fail "SKILL.md does not mention FCM"
    fi

    # T2.8 - Emulator Suite
    if echo "$CONTENT" | grep -qi "emulator"; then
        pass "SKILL.md covers Emulator Suite"
    else
        fail "SKILL.md does not mention Emulator Suite"
    fi

    # T2.9 - v9 modular SDK syntax
    if echo "$CONTENT" | grep -q "firebase/auth\|firebase/firestore"; then
        pass "SKILL.md uses v9 modular SDK syntax"
    else
        fail "SKILL.md does not use v9 modular SDK"
    fi

    # T2.10 - Minimum content length
    WORD_COUNT=$(echo "$CONTENT" | wc -w)
    if [ "$WORD_COUNT" -gt 1000 ]; then
        pass "SKILL.md has substantial content ($WORD_COUNT words)"
    else
        fail "SKILL.md is too short ($WORD_COUNT words, expected > 1000)"
    fi
fi

# ============================================================
# TEST SUITE 3: Security Rules Validation
# ============================================================
section "Test Suite 3: Security Rules Patterns"

if [ -f "$FIREBASE_DIR/SKILL.md" ]; then
    # T3.1 - Deny-all by default pattern
    if echo "$CONTENT" | grep -q "allow read, write: if false"; then
        pass "Security Rules use deny-all by default"
    else
        fail "Security Rules missing deny-all by default pattern"
    fi

    # T3.2 - No 'if true' pattern as actual rule (security risk)
    # Exclude warning lines that say "Ne JAMAIS utiliser" or contain backtick-quoted examples
    ALLOW_TRUE=$(echo "$CONTENT" | grep "allow read, write: if true" | grep -cv "JAMAIS\|Ne.*utiliser\|\`allow" || true)
    if [ "$ALLOW_TRUE" -eq 0 ]; then
        pass "No dangerous 'allow read, write: if true' patterns (warnings excluded)"
    else
        fail "Found $ALLOW_TRUE dangerous 'allow read, write: if true' patterns"
    fi

    # T3.3 - Contains isAuthenticated helper
    if echo "$CONTENT" | grep -q "function isAuthenticated"; then
        pass "Security Rules contain isAuthenticated helper function"
    else
        fail "Security Rules missing isAuthenticated helper"
    fi

    # T3.4 - Contains RBAC pattern (hasRole)
    if echo "$CONTENT" | grep -q "function hasRole"; then
        pass "Security Rules contain RBAC pattern (hasRole)"
    else
        fail "Security Rules missing RBAC pattern"
    fi

    # T3.5 - Contains data validation
    if echo "$CONTENT" | grep -q "hasRequiredFields\|request.resource.data"; then
        pass "Security Rules contain data validation patterns"
    else
        fail "Security Rules missing data validation"
    fi

    # T3.6 - Storage rules present
    if echo "$CONTENT" | grep -q "service firebase.storage"; then
        pass "Storage Security Rules present"
    else
        fail "Storage Security Rules missing"
    fi

    # T3.7 - Storage rules limit file size
    if echo "$CONTENT" | grep -q "request.resource.size"; then
        pass "Storage rules include file size limits"
    else
        fail "Storage rules missing file size limits"
    fi

    # T3.8 - Security warning present
    if echo "$CONTENT" | grep -qi "AVERTISSEMENT\|WARNING.*securite\|Ne JAMAIS utiliser"; then
        pass "SKILL.md includes security warnings"
    else
        fail "SKILL.md missing security warnings"
    fi
fi

# ============================================================
# TEST SUITE 4: JSON Structure Validation
# ============================================================
section "Test Suite 4: JSON Structure Validation"

if [ -f "$FIREBASE_DIR/SKILL.md" ]; then
    # T4.1 - firebase.json example present
    if echo "$CONTENT" | grep -q '"hosting"'; then
        pass "firebase.json hosting config present"
    else
        fail "firebase.json hosting config missing"
    fi

    # T4.2 - firestore.indexes.json example present
    if echo "$CONTENT" | grep -q '"indexes"'; then
        pass "firestore.indexes.json example present"
    else
        fail "firestore.indexes.json example missing"
    fi

    # T4.3 - Emulator config in firebase.json
    if echo "$CONTENT" | grep -q '"emulators"'; then
        pass "Emulator configuration present in firebase.json"
    else
        fail "Emulator configuration missing from firebase.json"
    fi

    # T4.4 - Contains test examples with emulators
    if echo "$CONTENT" | grep -q "initializeTestEnvironment\|rules-unit-testing"; then
        pass "Contains Security Rules unit testing examples"
    else
        fail "Missing Security Rules unit testing examples"
    fi
fi

# ============================================================
# TEST SUITE 5: Manifest Validation
# ============================================================
section "Test Suite 5: Manifest Validation (mugiwara.yaml)"

if [ -f "$FIREBASE_DIR/mugiwara.yaml" ]; then
    MANIFEST=$(cat "$FIREBASE_DIR/mugiwara.yaml")

    if echo "$MANIFEST" | grep -q "^name: firebase"; then
        pass "Manifest has correct name: firebase"
    else
        fail "Manifest name is not 'firebase'"
    fi

    if echo "$MANIFEST" | grep -q "^version: 1.8.0"; then
        pass "Manifest has version 1.8.0"
    else
        fail "Manifest version is not 1.8.0"
    fi

    if echo "$MANIFEST" | grep -q "^category: cloud"; then
        pass "Manifest has category: cloud"
    else
        fail "Manifest category is not 'cloud'"
    fi

    if echo "$MANIFEST" | grep -q "^checksum:"; then
        pass "Manifest has checksum section"
    else
        fail "Manifest missing checksum section"
    fi

    if command -v sha256sum >/dev/null 2>&1; then
        ACTUAL_HASH=$(sha256sum "$FIREBASE_DIR/SKILL.md" | awk '{print $1}')
        MANIFEST_HASH=$(grep "SKILL.md:" "$FIREBASE_DIR/mugiwara.yaml" | sed 's/.*"\(.*\)"/\1/')
        if [ "$ACTUAL_HASH" = "$MANIFEST_HASH" ]; then
            pass "SKILL.md checksum matches manifest"
        else
            warn "SKILL.md checksum mismatch (will need update after edits)"
        fi
    else
        warn "sha256sum not available, skipping checksum verification"
    fi

    if echo "$MANIFEST" | grep -q "firebase" && echo "$MANIFEST" | grep -q "firestore"; then
        pass "Manifest tags include firebase and firestore"
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
    if grep -q "^  firebase:" "$REGISTRY"; then
        pass "firebase agent registered in registry.yaml"
    else
        fail "firebase agent NOT found in registry.yaml"
    fi

    REG_VERSION=$(grep -A 3 "^  firebase:" "$REGISTRY" | grep "version:" | awk '{print $2}')
    if [ "$REG_VERSION" = "1.8.0" ]; then
        pass "Registry version matches manifest (1.8.0)"
    else
        fail "Registry version mismatch (got: $REG_VERSION, expected: 1.8.0)"
    fi

    REG_CAT=$(grep -A 3 "^  firebase:" "$REGISTRY" | grep "category:" | awk '{print $2}')
    if [ "$REG_CAT" = "cloud" ]; then
        pass "Registry category matches manifest (cloud)"
    else
        fail "Registry category mismatch (got: $REG_CAT, expected: cloud)"
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
