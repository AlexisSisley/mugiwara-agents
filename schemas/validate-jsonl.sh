#!/bin/bash
# ============================================================
# Schema Validator for JSONL log files
# Validates each line of a JSONL file against agent-event.schema.json
# Uses jq for basic structural validation (no external deps)
#
# Usage: bash schemas/validate-jsonl.sh [logfile]
# Default: logs/agents.jsonl
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SCHEMA_FILE="$SCRIPT_DIR/agent-event.schema.json"
LOG_FILE="${1:-$PROJECT_DIR/logs/agents.jsonl}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [[ ! -f "$LOG_FILE" ]]; then
    echo -e "${RED}ERROR: Log file not found: $LOG_FILE${NC}"
    exit 1
fi

if [[ ! -f "$SCHEMA_FILE" ]]; then
    echo -e "${RED}ERROR: Schema file not found: $SCHEMA_FILE${NC}"
    exit 1
fi

# Load allowed event types from schema into a jq-friendly array
ALLOWED_EVENTS_JSON=$(jq -c '.properties.event.enum' "$SCHEMA_FILE" 2>/dev/null)

TOTAL=0
VALID=0
INVALID=0
WARNINGS=0
ERRORS=""

while IFS= read -r line; do
    TOTAL=$((TOTAL + 1))

    # Strip Windows CR if present
    line="${line%$'\r'}"

    # Skip empty lines
    if [[ -z "$line" || "$line" =~ ^[[:space:]]*$ ]]; then
        continue
    fi

    # Check valid JSON
    if ! echo "$line" | jq empty 2>/dev/null; then
        INVALID=$((INVALID + 1))
        ERRORS="${ERRORS}  Line $TOTAL: Invalid JSON\n"
        continue
    fi

    # Check required field: timestamp
    TS=$(echo "$line" | jq -r '.timestamp // empty' 2>/dev/null)
    if [[ -z "$TS" ]]; then
        INVALID=$((INVALID + 1))
        ERRORS="${ERRORS}  Line $TOTAL: Missing required field 'timestamp'\n"
        continue
    fi

    # Check required field: event
    EVENT=$(echo "$line" | jq -r '.event // empty' 2>/dev/null)
    if [[ -z "$EVENT" ]]; then
        INVALID=$((INVALID + 1))
        ERRORS="${ERRORS}  Line $TOTAL: Missing required field 'event'\n"
        continue
    fi

    # Check event is in allowed enum using jq
    IN_ENUM=$(echo "$ALLOWED_EVENTS_JSON" | jq --arg ev "$EVENT" 'index($ev) != null' 2>/dev/null)
    if [[ "$IN_ENUM" != "true" ]]; then
        WARNINGS=$((WARNINGS + 1))
        ERRORS="${ERRORS}  Line $TOTAL: Unknown event type '$EVENT' (not in schema enum)\n"
    fi

    VALID=$((VALID + 1))

done < "$LOG_FILE"

# Report
echo ""
echo "  Schema Validation Report"
echo "  ========================"
echo "  Schema : $(basename "$SCHEMA_FILE")"
echo "  File   : $(basename "$LOG_FILE")"
echo ""
echo -e "  Total lines : $TOTAL"
echo -e "  ${GREEN}VALID${NC}       : $VALID"
if [[ $INVALID -gt 0 ]]; then
    echo -e "  ${RED}INVALID${NC}     : $INVALID"
fi
if [[ $WARNINGS -gt 0 ]]; then
    echo -e "  ${YELLOW}WARNINGS${NC}    : $WARNINGS"
fi
echo ""

if [[ -n "$ERRORS" ]]; then
    echo "  Details:"
    echo -e "$ERRORS"
fi

if [[ $INVALID -gt 0 ]]; then
    echo -e "  ${RED}FAIL${NC}: $INVALID invalid entries found"
    exit 1
else
    echo -e "  ${GREEN}PASS${NC}: All entries conform to schema"
    exit 0
fi
