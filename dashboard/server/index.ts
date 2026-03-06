// ============================================================
// Mugiwara Dashboard - Express Server
// Serves Svelte SPA static files + REST API on port 3000
// ============================================================

import express from 'express';
import path from 'path';
import healthRouter from './routes/health.js';
import agentsRouter from './routes/agents.js';
import sessionsRouter from './routes/sessions.js';
import pipelinesRouter from './routes/pipelines.js';
import statsRouter from './routes/stats.js';
import { eggHeadersMiddleware } from './__eggs__/headers.js';

const app = express();
const PORT = parseInt(process.env['PORT'] ?? '3000', 10);

// ── JSON parsing ──────────────────────────────────────────────
app.use(express.json());

// ── Easter Egg: Pirate HTTP Headers ──────────────────────────
app.use(eggHeadersMiddleware);

// ── API Routes ────────────────────────────────────────────────
app.use('/api', healthRouter);
app.use('/api', agentsRouter);
app.use('/api', sessionsRouter);
app.use('/api', pipelinesRouter);
app.use('/api', statsRouter);

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
if (process.env['NODE_ENV'] !== 'test') {
  app.listen(PORT, () => {
    console.log(`[mugiwara-dashboard] Server running on http://localhost:${PORT}`);
    console.log(`[mugiwara-dashboard] API available at http://localhost:${PORT}/api/health`);
  });
}

export { app };
export default app;
