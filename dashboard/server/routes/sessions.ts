import { Router } from 'express';
import { getSessions } from '../data-loader.js';
import { paginate, parseIntParam } from '../utils.js';
import type { Session, PaginatedResponse } from '../../shared/types.js';

const router = Router();

router.get('/sessions', (req, res) => {
  const page = parseIntParam(req.query['page'], 1);
  const limit = parseIntParam(req.query['limit'], 10);
  const search = req.query['search'] as string | undefined;
  const pipeline = req.query['pipeline'] as string | undefined;
  const dateFrom = req.query['dateFrom'] as string | undefined;
  const dateTo = req.query['dateTo'] as string | undefined;

  let sessions = getSessions();

  // Filter by search (session ID)
  if (search) {
    const q = search.toLowerCase();
    sessions = sessions.filter((s) => s.id.toLowerCase().includes(q));
  }

  // Filter by pipeline
  if (pipeline) {
    sessions = sessions.filter((s) => s.pipelineDetected === pipeline);
  }

  // Filter by date range
  if (dateFrom) {
    const from = new Date(dateFrom).getTime();
    sessions = sessions.filter((s) => new Date(s.startTime).getTime() >= from);
  }
  if (dateTo) {
    const to = new Date(dateTo).getTime();
    sessions = sessions.filter((s) => new Date(s.startTime).getTime() <= to);
  }

  const result: PaginatedResponse<Session> = paginate(sessions, page, limit);
  res.json(result);
});

export default router;
