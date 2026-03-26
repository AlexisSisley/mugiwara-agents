// ============================================================
// Startup Hooks - Run once after database initialization
// ============================================================

import { getDb } from './db/index.js';
import { insertMemoryBatch } from './db/queries.js';
import { parseMemoryFile } from './parsers/memory-parser.js';

/**
 * Auto-import memory entries from one_piece_memory.md if the
 * memory table is empty. Ensures OrchestratorPage always has data.
 */
export async function autoImportMemory(): Promise<void> {
  try {
    const db = getDb();
    const result = db.exec('SELECT COUNT(*) as cnt FROM memory');
    const count = result[0]?.values[0]?.[0] as number ?? 0;

    if (count > 0) {
      console.log(`[mugiwara-dashboard] Memory table already has ${count} entries — skipping import`);
      return;
    }

    const { entries, fileExists } = parseMemoryFile();
    if (!fileExists) {
      console.log('[mugiwara-dashboard] No one_piece_memory.md found — skipping memory import');
      return;
    }

    if (entries.length === 0) {
      console.log('[mugiwara-dashboard] one_piece_memory.md is empty — nothing to import');
      return;
    }

    const memoryInputs = entries.map((e) => ({
      date: e.date,
      demande: e.demande,
      route: e.route,
      route_agent: e.routeAgent,
      confiance: e.confiance,
      sujet: e.sujet,
      projet: e.projet,
      resultat: e.resultat,
      resultat_detail: e.resultatDetail,
      contexte: e.contexte,
    }));

    insertMemoryBatch(memoryInputs);
    console.log(`[mugiwara-dashboard] Auto-imported ${entries.length} memory entries from one_piece_memory.md`);
  } catch (err) {
    console.warn('[mugiwara-dashboard] Memory auto-import failed (non-blocking):', (err as Error).message);
  }
}
