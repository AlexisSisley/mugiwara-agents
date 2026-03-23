import { Router } from 'express';
import { getSetupInfo } from '../parsers/setup-parser.js';

const router = Router();

router.get('/setup', (_req, res) => {
  const data = getSetupInfo();
  res.json(data);
});

export default router;
