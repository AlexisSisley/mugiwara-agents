import { Router } from 'express';
import { getSetupInfo, togglePlugin } from '../parsers/setup-parser.js';

const router = Router();

router.get('/setup', (_req, res) => {
  const data = getSetupInfo();
  res.json(data);
});

router.post('/setup/plugins/toggle', (req, res) => {
  const { name, enabled } = req.body ?? {};

  if (typeof name !== 'string' || !name.trim() || typeof enabled !== 'boolean') {
    res.status(400).json({ error: 'bad_request', message: 'name (string) and enabled (boolean) are required' });
    return;
  }

  togglePlugin(name.trim(), enabled);
  const data = getSetupInfo();
  res.json(data);
});

export default router;
