import { Router } from 'express';
import { getPipelineRuns } from '../data-loader.js';
import { paginate, parseIntParam } from '../utils.js';
import type { PipelineRun, PipelineStatus, PaginatedResponse } from '../../shared/types.js';

const router = Router();

router.get('/pipelines', (req, res) => {
  const page = parseIntParam(req.query['page'], 1);
  const limit = parseIntParam(req.query['limit'], 10);
  const name = req.query['name'] as string | undefined;
  const status = req.query['status'] as PipelineStatus | undefined;

  let pipelines = getPipelineRuns();

  // Filter by name
  if (name) {
    pipelines = pipelines.filter((p) => p.name === name);
  }

  // Filter by status
  if (status) {
    pipelines = pipelines.filter((p) => p.status === status);
  }

  const result: PaginatedResponse<PipelineRun> = paginate(pipelines, page, limit);
  res.json(result);
});

export default router;
