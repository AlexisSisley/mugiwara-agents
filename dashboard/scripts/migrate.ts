#!/usr/bin/env tsx
// ============================================================
// Migration Script - Import JSONL + Markdown into SQLite
// Usage: npx tsx scripts/migrate.ts
// Idempotent: uses INSERT OR IGNORE (dedup indexes)
// ============================================================

import path from 'path';
import { openDb, closeDb, getDbPath } from '../server/db/index.js';
import {
  insertInvocationBatch,
  insertSessionBatch,
  insertMemoryBatch,
} from '../server/db/queries.js';
import { ensureRulesFile } from '../server/db/category-detector.js';
import { parseJsonlFile } from '../server/parsers/jsonl-parser.js';
import { parseMemoryFile } from '../server/parsers/memory-parser.js';
import type { AgentEvent, SessionEvent } from '../shared/types.js';

const ROOT_DIR = path.resolve(import.meta.dirname, '..');
const AGENTS_JSONL = path.join(ROOT_DIR, 'logs', 'agents.jsonl');
const SESSIONS_JSONL = path.join(ROOT_DIR, 'logs', 'sessions.jsonl');

async function main(): Promise<void> {
  console.log('[mugiwara-migrate] Starting migration to SQLite...');

  // Ensure category rules exist
  ensureRulesFile();

  // Initialize database (creates schema)
  await openDb();
  console.log(`[mugiwara-migrate] Database opened at: ${getDbPath()}`);

  // ── Migrate agents.jsonl ───────────────────────────────────
  console.log('[mugiwara-migrate] Reading agents.jsonl...');
  const agentEvents = parseJsonlFile<AgentEvent>(AGENTS_JSONL);
  console.log(`[mugiwara-migrate] Found ${agentEvents.length} agent events`);

  const invCount = insertInvocationBatch(agentEvents.map((ev) => ({
    timestamp: ev.timestamp,
    event: ev.event,
    agent: ev.agent,
    tool: ev.tool,
    args_preview: ev.args_preview,
    output_summary: ev.output_summary,
    session_id: ev.session_id,
    is_pipeline: ev.is_pipeline,
    trigger_file: ev.trigger_file,
    exit_code: ev.exit_code,
    summary: ev.summary,
    reason: ev.reason,
    pipeline_detected: ev.pipeline_detected,
  })));
  console.log(`[mugiwara-migrate] Inserted ${invCount} invocations`);

  // ── Migrate sessions.jsonl ─────────────────────────────────
  console.log('[mugiwara-migrate] Reading sessions.jsonl...');
  const sessionEvents = parseJsonlFile<SessionEvent>(SESSIONS_JSONL);
  console.log(`[mugiwara-migrate] Found ${sessionEvents.length} session events`);

  const sessCount = insertSessionBatch(sessionEvents.map((ev) => ({
    timestamp: ev.timestamp,
    event: ev.event,
    session_id: ev.session_id,
  })));
  console.log(`[mugiwara-migrate] Inserted ${sessCount} sessions`);

  // ── Migrate one_piece_memory.md ────────────────────────────
  console.log('[mugiwara-migrate] Reading one_piece_memory.md...');
  const memoryResponse = parseMemoryFile();
  console.log(`[mugiwara-migrate] Found ${memoryResponse.total} memory entries (file exists: ${memoryResponse.fileExists})`);

  const memCount = insertMemoryBatch(memoryResponse.entries.map((entry) => ({
    date: entry.date,
    demande: entry.demande,
    route: entry.route,
    route_agent: entry.routeAgent,
    confiance: entry.confiance,
    sujet: entry.sujet,
    projet: entry.projet,
    resultat: entry.resultat,
    resultat_detail: entry.resultatDetail,
    contexte: entry.contexte,
  })));
  console.log(`[mugiwara-migrate] Inserted ${memCount} memory entries`);

  // ── Summary ────────────────────────────────────────────────
  console.log('');
  console.log('='.repeat(50));
  console.log(`[mugiwara-migrate] Migration complete!`);
  console.log(`  Invocations: ${invCount}`);
  console.log(`  Sessions:    ${sessCount}`);
  console.log(`  Memory:      ${memCount}`);
  console.log(`  Total:       ${invCount + sessCount + memCount}`);
  console.log('='.repeat(50));

  closeDb();
}

main().catch((err) => {
  console.error('[mugiwara-migrate] Migration failed:', err);
  closeDb();
  process.exit(1);
});
