import { Router } from 'express';
import { getPipelineRunsFromDb } from '../db/queries.js';
import { paginate, parseIntParam } from '../utils.js';
import type { PipelineRun, PipelineStatus, PaginatedResponse } from '../../shared/types.js';

const router = Router();

router.get('/pipelines', (req, res) => {
  const page = parseIntParam(req.query['page'], 1);
  const limit = parseIntParam(req.query['limit'], 10);
  const name = req.query['name'] as string | undefined;
  const status = req.query['status'] as PipelineStatus | undefined;

  const pipelines = getPipelineRunsFromDb({ name, status });
  const result: PaginatedResponse<PipelineRun> = paginate(pipelines, page, limit);
  res.json(result);
});

export default router;
