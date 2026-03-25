#!/usr/bin/env node
// ============================================================
// Hook Writer - CLI bridge for bash hooks → SQLite
// Usage: echo "$JSON" | node hook-writer.js invocation
//        echo "$JSON" | node hook-writer.js session
// All errors are silenced to never break the hook chain.
// ============================================================

import { openDb, closeDb } from './index.js';
import { insertInvocation, insertSession } from './queries.js';
import { ensureRulesFile } from './category-detector.js';

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk) => { data += chunk; });
    process.stdin.on('end', () => resolve(data));
    // Timeout after 5s to avoid hanging
    setTimeout(() => resolve(data), 5000);
  });
}

async function main(): Promise<void> {
  const mode = process.argv[2]; // 'invocation' or 'session'
  if (!mode || !['invocation', 'session'].includes(mode)) {
    process.exit(0);
  }

  const raw = await readStdin();
  if (!raw.trim()) {
    process.exit(0);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  // Ensure category rules file exists
  ensureRulesFile();

  // Initialize database (creates if needed) — async for sql.js
  await openDb();

  if (mode === 'invocation') {
    const toolInput = payload['tool_input'] as Record<string, string> | undefined;
    const timestamp = (payload['timestamp'] as string)
      ?? new Date().toISOString();

    insertInvocation({
      timestamp,
      event: (payload['event'] as string) ?? 'agent_invocation',
      agent: toolInput?.['skill'] ?? (payload['agent'] as string) ?? undefined,
      tool: (payload['tool_name'] as string) ?? (payload['tool'] as string) ?? undefined,
      args_preview: toolInput?.['args']?.slice(0, 200)
        ?? (payload['args_preview'] as string) ?? undefined,
      output_summary: (payload['tool_response'] as string)?.slice(0, 500)
        ?? (payload['output_summary'] as string) ?? undefined,
      session_id: (payload['session_id'] as string) ?? undefined,
      is_pipeline: (payload['is_pipeline'] as boolean) ?? false,
      trigger_file: (payload['trigger_file'] as string) ?? undefined,
      exit_code: (payload['exit_code'] as number) ?? undefined,
      summary: (payload['summary'] as string) ?? undefined,
      reason: (payload['reason'] as string) ?? undefined,
      pipeline_detected: (payload['pipeline_detected'] as string) ?? undefined,
      cwd: (payload['cwd'] as string) ?? process.cwd(),
    });
  } else if (mode === 'session') {
    const timestamp = (payload['timestamp'] as string)
      ?? new Date().toISOString();

    const hookEvent = payload['hook_event'] as string | undefined;

    insertSession({
      timestamp,
      event: (payload['event'] as string)
        ?? (hookEvent === 'SessionStart' ? 'session_start' : 'session_end'),
      session_id: (payload['session_id'] as string) ?? 'unknown',
      reason: (payload['reason'] as string) ?? undefined,
      cwd: (payload['cwd'] as string) ?? process.cwd(),
    });
  }

  closeDb();
}

main().catch(() => {
  // Silent failure — never break the hook chain
  process.exit(0);
});
