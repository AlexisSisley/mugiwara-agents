import { Router } from 'express';
import { parseMemoryFile } from '../parsers/memory-parser.js';
import type { MemoryResponse } from '../../shared/types.js';

const router = Router();

router.get('/memory', (_req, res) => {
  const search = (_req.query['search'] as string | undefined)?.toLowerCase();
  const projet = _req.query['projet'] as string | undefined;
  const route = _req.query['route'] as string | undefined;
  const confiance = _req.query['confiance'] as string | undefined;

  const raw = parseMemoryFile();

  let entries = [...raw.entries];

  if (search) {
    entries = entries.filter(
      (e) =>
        e.demande.toLowerCase().includes(search) ||
        e.sujet.toLowerCase().includes(search)
    );
  }

  if (projet) {
    const q = projet.toLowerCase();
    entries = entries.filter((e) => e.projet.toLowerCase().includes(q));
  }

  if (route) {
    const q = route.toLowerCase();
    entries = entries.filter((e) => e.routeAgent.toLowerCase() === q);
  }

  if (confiance) {
    entries = entries.filter((e) => e.confiance === confiance);
  }

  const result: MemoryResponse = {
    entries,
    total: entries.length,
    fileExists: raw.fileExists,
  };

  res.json(result);
});

export default router;
