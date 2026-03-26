#!/bin/bash
# ============================================================
# Hook: log-agent-output.sh
# Event: PostToolUse (matcher: Skill|Agent) — async
# Logs each agent/subagent invocation to logs/agents.jsonl + SQLite
# Uses Node.js for JSON parsing (no jq dependency)
# ============================================================

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
LOG_FILE="$PROJECT_DIR/logs/agents.jsonl"

mkdir -p "$PROJECT_DIR/logs"

# Read hook payload from stdin
INPUT=$(cat)

# Use Node.js to parse JSON and write JSONL + trigger SQLite
node -e "
const input = JSON.parse(process.argv[1]);
const fs = require('fs');
const path = require('path');

// Extract agent name: Skill uses .skill, Agent uses .subagent_type
const toolInput = input.tool_input || {};
const agent = toolInput.skill || toolInput.subagent_type || 'unknown';
const args = (toolInput.args || toolInput.prompt || '').slice(0, 200);
const toolName = input.tool_name || 'unknown';
const toolType = toolInput.subagent_type ? 'subagent' : toolInput.skill ? 'skill' : 'unknown';
const description = toolInput.description || '';
const sessionId = input.session_id || 'unknown';
const response = (input.tool_response || '').slice(0, 500);

// Detect pipeline
const pipelines = ['mugiwara','incident','pre-launch','onboard','modernize','discovery',
  'doc-hunt','api-postman','thousand-sunny','polar-tang','oro-jackson','baratie',
  'pluton','ohara','merry','maxim'];
const isPipeline = pipelines.includes(agent);

// Detect project from cwd
const cwd = input.cwd || process.cwd();
const project = path.basename(cwd);

const timestamp = new Date().toISOString();

// Write JSONL entry
const entry = JSON.stringify({
  timestamp, event: 'agent_invocation', agent, tool: toolName,
  tool_type: toolType, args_preview: args, output_summary: response,
  session_id: sessionId, is_pipeline: isPipeline, project, description
});

fs.appendFileSync('$LOG_FILE', entry + '\n');
" -- "$INPUT" 2>/dev/null || true

# Dual-write to SQLite (non-blocking, silent failures)
# Try compiled JS first, fall back to tsx for dev mode
HOOK_WRITER_JS="$PROJECT_DIR/dashboard/dist/server/db/hook-writer.js"
HOOK_WRITER_TS="$PROJECT_DIR/dashboard/server/db/hook-writer.ts"

if [ -f "$HOOK_WRITER_JS" ]; then
  echo "$INPUT" | node "$HOOK_WRITER_JS" invocation 2>/dev/null &
elif command -v tsx >/dev/null 2>&1 && [ -f "$HOOK_WRITER_TS" ]; then
  echo "$INPUT" | tsx "$HOOK_WRITER_TS" invocation 2>/dev/null &
fi
