#!/bin/bash
# ============================================================
# Mugiwara Agents - Structural Smoke Tests
# ============================================================
# Validates that all SKILL.md files are well-formed, that
# install.sh and uninstall.sh are in sync, and that the
# project conventions are respected across all 40 agents.
#
# Usage:
#   chmod +x tests/test_structural.sh
#   ./tests/test_structural.sh
#
# Exit code 0 = all tests pass, 1 = at least one failure.
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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILLS_DIR="$PROJECT_ROOT/skills"
INSTALL_SH="$PROJECT_ROOT/install.sh"
UNINSTALL_SH="$PROJECT_ROOT/uninstall.sh"

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

# ── Expected agents (source of truth) ──────────────────────
EXPECTED_AGENTS=(
    ace api-postman bartholomew bon-clay brook chopper
    discovery doc-hunt franky incident jinbe law law-sql
    luffy modernize morgans mugiwara nami onboard one_piece
    perona pre-launch robin sanji sanji-design sanji-dotnet
    sanji-flutter sanji-go sanji-i18n sanji-java sanji-python
    sanji-rust sanji-ts senor-pink shanks usopp vegapunk
    vivi yamato zorro
)

# Required YAML front matter fields for ALL agents
REQUIRED_FIELDS=(name description disable-model-invocation context agent model allowed-tools)

# ── Required fields per category ────────────────────────────
# Pipelines must have Skill in allowed-tools
PIPELINES=(mugiwara discovery incident pre-launch onboard modernize doc-hunt api-postman one_piece)

# ════════════════════════════════════════════════════════════
# TEST SUITE 1: Project structure
# ════════════════════════════════════════════════════════════
section "Test Suite 1: Project Structure"

# T1.1 - skills/ directory exists
if [ -d "$SKILLS_DIR" ]; then
    pass "skills/ directory exists"
else
    fail "skills/ directory NOT found at $SKILLS_DIR"
fi

# T1.2 - install.sh exists and is executable-ready
if [ -f "$INSTALL_SH" ]; then
    pass "install.sh exists"
else
    fail "install.sh NOT found"
fi

# T1.3 - uninstall.sh exists
if [ -f "$UNINSTALL_SH" ]; then
    pass "uninstall.sh exists"
else
    fail "uninstall.sh NOT found"
fi

# T1.4 - All expected agent directories exist
missing_dirs=()
for agent in "${EXPECTED_AGENTS[@]}"; do
    if [ ! -d "$SKILLS_DIR/$agent" ]; then
        missing_dirs+=("$agent")
    fi
done

if [ ${#missing_dirs[@]} -eq 0 ]; then
    pass "All ${#EXPECTED_AGENTS[@]} agent directories exist"
else
    fail "Missing agent directories: ${missing_dirs[*]}"
fi

# T1.5 - No unexpected directories in skills/
unexpected_dirs=()
for dir in "$SKILLS_DIR"/*/; do
    dirname=$(basename "$dir")
    found=0
    for expected in "${EXPECTED_AGENTS[@]}"; do
        if [ "$dirname" = "$expected" ]; then
            found=1
            break
        fi
    done
    if [ $found -eq 0 ]; then
        unexpected_dirs+=("$dirname")
    fi
done

if [ ${#unexpected_dirs[@]} -eq 0 ]; then
    pass "No unexpected directories in skills/"
else
    warn "Unexpected directories in skills/: ${unexpected_dirs[*]}"
fi

# T1.6 - Each agent directory contains exactly one SKILL.md
missing_skill=()
for agent in "${EXPECTED_AGENTS[@]}"; do
    if [ ! -f "$SKILLS_DIR/$agent/SKILL.md" ]; then
        missing_skill+=("$agent")
    fi
done

if [ ${#missing_skill[@]} -eq 0 ]; then
    pass "All ${#EXPECTED_AGENTS[@]} agents have a SKILL.md file"
else
    fail "Missing SKILL.md in: ${missing_skill[*]}"
fi

# ════════════════════════════════════════════════════════════
# TEST SUITE 2: YAML Front Matter Validation
# ════════════════════════════════════════════════════════════
section "Test Suite 2: YAML Front Matter Validation"

for agent in "${EXPECTED_AGENTS[@]}"; do
    skill_file="$SKILLS_DIR/$agent/SKILL.md"
    [ ! -f "$skill_file" ] && continue

    # T2.1 - File starts with ---
    first_line=$(head -1 "$skill_file")
    if [ "$first_line" != "---" ]; then
        fail "$agent: SKILL.md does not start with YAML front matter (---)"
        continue
    fi

    # T2.2 - File has closing ---
    # Find the second occurrence of --- (closing delimiter)
    closing_line=$(awk 'NR>1 && /^---$/{print NR; exit}' "$skill_file")
    if [ -z "$closing_line" ]; then
        fail "$agent: SKILL.md has no closing YAML front matter delimiter (---)"
        continue
    fi

    # Extract front matter (between first and second ---)
    front_matter=$(sed -n "2,$((closing_line - 1))p" "$skill_file")

    # T2.3 - All required fields present
    missing_fields=()
    for field in "${REQUIRED_FIELDS[@]}"; do
        if ! echo "$front_matter" | grep -q "^${field}:"; then
            missing_fields+=("$field")
        fi
    done

    if [ ${#missing_fields[@]} -eq 0 ]; then
        pass "$agent: All required YAML fields present"
    else
        fail "$agent: Missing YAML fields: ${missing_fields[*]}"
    fi

    # T2.4 - name field matches directory name
    yaml_name=$(echo "$front_matter" | grep "^name:" | sed 's/^name: *//')
    if [ "$yaml_name" = "$agent" ]; then
        pass "$agent: name field matches directory name"
    else
        fail "$agent: name field '$yaml_name' does not match directory '$agent'"
    fi

    # T2.5 - disable-model-invocation should be false
    dmi_value=$(echo "$front_matter" | grep "^disable-model-invocation:" | sed 's/^disable-model-invocation: *//')
    if [ "$dmi_value" = "false" ]; then
        pass "$agent: disable-model-invocation is false"
    elif [ "$dmi_value" = "true" ]; then
        fail "$agent: disable-model-invocation is TRUE (should be false for pipeline compatibility)"
    else
        warn "$agent: disable-model-invocation has unexpected value: '$dmi_value'"
    fi

    # T2.6 - context should be fork
    ctx_value=$(echo "$front_matter" | grep "^context:" | sed 's/^context: *//')
    if [ "$ctx_value" = "fork" ]; then
        pass "$agent: context is fork"
    else
        fail "$agent: context is '$ctx_value' (expected: fork)"
    fi

    # T2.7 - model should be opus
    model_value=$(echo "$front_matter" | grep "^model:" | sed 's/^model: *//')
    if [ "$model_value" = "opus" ]; then
        pass "$agent: model is opus"
    else
        fail "$agent: model is '$model_value' (expected: opus)"
    fi
done

# ════════════════════════════════════════════════════════════
# TEST SUITE 3: Content Validation
# ════════════════════════════════════════════════════════════
section "Test Suite 3: Content Validation"

for agent in "${EXPECTED_AGENTS[@]}"; do
    skill_file="$SKILLS_DIR/$agent/SKILL.md"
    [ ! -f "$skill_file" ] && continue

    # T3.1 - Has $ARGUMENTS reference (agents must accept input)
    if grep -q '\$ARGUMENTS' "$skill_file"; then
        pass "$agent: references \$ARGUMENTS"
    else
        fail "$agent: does NOT reference \$ARGUMENTS (agent cannot receive input)"
    fi

    # T3.2 - Has at least one H1 heading after front matter
    if grep -q '^# ' "$skill_file"; then
        pass "$agent: has H1 heading"
    else
        fail "$agent: missing H1 heading"
    fi

    # T3.3 - File is not empty (more than just front matter, at least 20 lines)
    line_count=$(wc -l < "$skill_file")
    if [ "$line_count" -ge 20 ]; then
        pass "$agent: has substantial content ($line_count lines)"
    else
        fail "$agent: file too short ($line_count lines, expected >= 20)"
    fi
done

# ════════════════════════════════════════════════════════════
# TEST SUITE 4: Pipeline Agents - Skill Tool Validation
# ════════════════════════════════════════════════════════════
section "Test Suite 4: Pipeline & Router Tool Validation"

for pipeline in "${PIPELINES[@]}"; do
    skill_file="$SKILLS_DIR/$pipeline/SKILL.md"
    [ ! -f "$skill_file" ] && continue

    # T4.1 - Pipeline agents must have Skill in allowed-tools
    closing_line=$(awk 'NR>1 && /^---$/{print NR; exit}' "$skill_file")
    front_matter=$(sed -n "2,$((closing_line - 1))p" "$skill_file")
    allowed_tools=$(echo "$front_matter" | grep "^allowed-tools:" | sed 's/^allowed-tools: *//')

    if echo "$allowed_tools" | grep -q "Skill"; then
        pass "$pipeline: has Skill in allowed-tools"
    else
        fail "$pipeline: MISSING Skill in allowed-tools (cannot invoke sub-agents)"
    fi
done

# ════════════════════════════════════════════════════════════
# TEST SUITE 5: install.sh / uninstall.sh Parity
# ════════════════════════════════════════════════════════════
section "Test Suite 5: Script Parity"

# T5.1 - Extract CREW from install.sh
install_crew_line=$(grep '^CREW=' "$INSTALL_SH" | head -1)
install_crew=$(echo "$install_crew_line" | sed 's/CREW=(//' | sed 's/)//' | tr ' ' '\n' | sort)
install_count=$(echo "$install_crew" | wc -l)

# T5.2 - Extract CREW from uninstall.sh
uninstall_crew_line=$(grep '^CREW=' "$UNINSTALL_SH" | head -1)
uninstall_crew=$(echo "$uninstall_crew_line" | sed 's/CREW=(//' | sed 's/)//' | tr ' ' '\n' | sort)
uninstall_count=$(echo "$uninstall_crew" | wc -l)

# T5.3 - install.sh has all expected agents
if [ "$install_count" -eq "${#EXPECTED_AGENTS[@]}" ]; then
    pass "install.sh CREW has ${#EXPECTED_AGENTS[@]} agents"
else
    fail "install.sh CREW has $install_count agents (expected ${#EXPECTED_AGENTS[@]})"
fi

# T5.4 - uninstall.sh has all expected agents
if [ "$uninstall_count" -eq "${#EXPECTED_AGENTS[@]}" ]; then
    pass "uninstall.sh CREW has ${#EXPECTED_AGENTS[@]} agents"
else
    fail "uninstall.sh CREW has $uninstall_count agents (expected ${#EXPECTED_AGENTS[@]})"
fi

# T5.5 - install.sh and uninstall.sh have same agents
diff_result=$(diff <(echo "$install_crew") <(echo "$uninstall_crew") || true)
if [ -z "$diff_result" ]; then
    pass "install.sh and uninstall.sh CREW lists are identical"
else
    fail "install.sh and uninstall.sh CREW lists differ:"
    echo "$diff_result"
fi

# T5.6 - install.sh CREW matches skills/ directories
skills_dirs=$(ls -1 "$SKILLS_DIR" | sort)
install_sorted=$(echo "$install_crew" | sort)
diff_dirs=$(diff <(echo "$install_sorted") <(echo "$skills_dirs") || true)
if [ -z "$diff_dirs" ]; then
    pass "install.sh CREW matches skills/ directories exactly"
else
    fail "install.sh CREW does not match skills/ directories:"
    echo "$diff_dirs"
fi

# ════════════════════════════════════════════════════════════
# TEST SUITE 6: Cross-Agent Consistency
# ════════════════════════════════════════════════════════════
section "Test Suite 6: Cross-Agent Consistency"

# T6.1 - No agent uses disable-model-invocation: true in front matter
dmi_true_agents=()
for agent in "${EXPECTED_AGENTS[@]}"; do
    skill_file="$SKILLS_DIR/$agent/SKILL.md"
    [ ! -f "$skill_file" ] && continue

    closing_line=$(awk 'NR>1 && /^---$/{print NR; exit}' "$skill_file")
    front_matter=$(sed -n "2,$((closing_line - 1))p" "$skill_file")
    dmi=$(echo "$front_matter" | grep "^disable-model-invocation:" | sed 's/^disable-model-invocation: *//')

    if [ "$dmi" = "true" ]; then
        dmi_true_agents+=("$agent")
    fi
done

if [ ${#dmi_true_agents[@]} -eq 0 ]; then
    pass "No agent has disable-model-invocation: true"
else
    fail "Agents with disable-model-invocation: true: ${dmi_true_agents[*]}"
fi

# T6.2 - All agents use model: opus
non_opus_agents=()
for agent in "${EXPECTED_AGENTS[@]}"; do
    skill_file="$SKILLS_DIR/$agent/SKILL.md"
    [ ! -f "$skill_file" ] && continue

    closing_line=$(awk 'NR>1 && /^---$/{print NR; exit}' "$skill_file")
    front_matter=$(sed -n "2,$((closing_line - 1))p" "$skill_file")
    model=$(echo "$front_matter" | grep "^model:" | sed 's/^model: *//')

    if [ "$model" != "opus" ]; then
        non_opus_agents+=("$agent($model)")
    fi
done

if [ ${#non_opus_agents[@]} -eq 0 ]; then
    pass "All agents use model: opus"
else
    fail "Non-opus agents: ${non_opus_agents[*]}"
fi

# T6.3 - All agents use context: fork
non_fork_agents=()
for agent in "${EXPECTED_AGENTS[@]}"; do
    skill_file="$SKILLS_DIR/$agent/SKILL.md"
    [ ! -f "$skill_file" ] && continue

    closing_line=$(awk 'NR>1 && /^---$/{print NR; exit}' "$skill_file")
    front_matter=$(sed -n "2,$((closing_line - 1))p" "$skill_file")
    ctx=$(echo "$front_matter" | grep "^context:" | sed 's/^context: *//')

    if [ "$ctx" != "fork" ]; then
        non_fork_agents+=("$agent($ctx)")
    fi
done

if [ ${#non_fork_agents[@]} -eq 0 ]; then
    pass "All agents use context: fork"
else
    fail "Non-fork agents: ${non_fork_agents[*]}"
fi

# ════════════════════════════════════════════════════════════
# SUMMARY
# ════════════════════════════════════════════════════════════
echo ""
echo "  ══════════════════════════════════════"
echo -e "  ${BLUE}RESULTS${NC}"
echo "  ══════════════════════════════════════"
echo ""
echo -e "  ${GREEN}PASS${NC}: $PASS"
echo -e "  ${RED}FAIL${NC}: $FAIL"
echo -e "  ${YELLOW}WARN${NC}: $WARN"
echo -e "  Total: $TOTAL tests"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "  ${GREEN}All tests passed!${NC}"
    echo ""
    exit 0
else
    echo -e "  ${RED}$FAIL test(s) failed.${NC}"
    echo ""
    exit 1
fi
