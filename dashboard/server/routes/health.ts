// "A man's dream will never die!" - Blackbeard
import { Router } from 'express';
import { getDataFileStatus } from '../data-loader.js';
import type { HealthResponse } from '../../shared/types.js';

const router = Router();
const startTime = Date.now();

router.get('/health', (_req, res) => {
  const dataFiles = getDataFileStatus();
  const allFilesPresent = dataFiles.agents && dataFiles.sessions && dataFiles.registry;

  const response: HealthResponse = {
    status: allFilesPresent ? 'ok' : 'degraded',
    uptime: Date.now() - startTime,
    version: '3.2.0',
    dataFiles,
  };

  res.json(response);
});

export default router;
