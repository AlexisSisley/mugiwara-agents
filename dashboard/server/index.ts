// ============================================================
// Mugiwara Dashboard - Express Server
// Serves Svelte SPA static files + REST API on port 3000
// ============================================================

import express from 'express';
import path from 'path';
import healthRouter from './routes/health.js';
import pipelinesRouter from './routes/pipelines.js';
import reportsRouter from './routes/reports.js';
import projectsRouter from './routes/projects.js';
import overviewRouter from './routes/overview.js';
import crewRouter from './routes/crew.js';
import orchestratorRouter from './routes/orchestrator.js';
import { eggHeadersMiddleware } from './__eggs__/headers.js';
import { openDb, closeDb } from './db/index.js';
import { aggregateAllDailyStats } from './db/queries.js';
import { autoImportMemory } from './startup.js';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

// ── JSON parsing ──────────────────────────────────────────────
app.use(express.json());

// ── Easter Egg: Pirate HTTP Headers ──────────────────────────
app.use(eggHeadersMiddleware);

// ── API Routes ────────────────────────────────────────────────
app.use('/api', healthRouter);
app.use('/api', pipelinesRouter);
app.use('/api', reportsRouter);
app.use('/api', projectsRouter);
app.use('/api', overviewRouter);
app.use('/api', crewRouter);
app.use('/api', orchestratorRouter);

// ── API 404 handler ───────────────────────────────────────────
// "People's dreams... don't ever end!" — Blackbeard
// (Neither do 404s, apparently.)
app.use('/api', (_req, res) => {
  res.status(404).json({
    error: 'not_found',
    message: 'API endpoint not found',
    // If you found this, you sailed too far. Turn back, nakama.
    hint: process.env['ENABLE_EGGS'] !== 'false' ? 'The One Piece is not at this endpoint.' : undefined,
  });
});

// ── Static Files (Svelte build) ──────────────────────────────
const clientDir = path.resolve(import.meta.dirname, '..', 'dist', 'client');
app.use(express.static(clientDir));

// ── SPA Fallback ──────────────────────────────────────────────
app.get('*', (_req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'));
});

// ── Start Server ──────────────────────────────────────────────
// ── Initialize SQLite Database ────────────────────────────────
openDb()
  .then(async () => {
    console.log('[mugiwara-dashboard] SQLite database initialized');
    // Auto-import memory from one_piece_memory.md if table is empty
    await autoImportMemory();
    // Backfill daily_stats for any missing days
    aggregateAllDailyStats();
    console.log('[mugiwara-dashboard] Startup hooks completed');
  })
  .catch((err) => console.warn('[mugiwara-dashboard] SQLite init failed (non-blocking):', (err as Error).message));

// Graceful shutdown
process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); process.exit(0); });

if (process.env['NODE_ENV'] !== 'test') {
  app.listen(PORT, () => {
    console.log(`[mugiwara-dashboard] Server running on http://localhost:${PORT}`);
    console.log(`[mugiwara-dashboard] API available at http://localhost:${PORT}/api/health`);
  });
}

export { app };
export default app;
