import { Router } from 'express';
import { getAgentStats } from '../data-loader.js';
import { paginate, parseIntParam } from '../utils.js';
import type { AgentCategory, AgentStats, PaginatedResponse } from '../../shared/types.js';

const router = Router();

router.get('/agents', (req, res) => {
  const page = parseIntParam(req.query['page'], 1);
  const limit = parseIntParam(req.query['limit'], 20);
  const category = req.query['category'] as AgentCategory | undefined;
  const search = req.query['search'] as string | undefined;
  const sort = (req.query['sort'] as string) ?? 'name';
  const order = (req.query['order'] as string) ?? 'asc';

  let agents = getAgentStats();

  // Filter by category
  if (category) {
    agents = agents.filter((a) => a.category === category);
  }

  // Filter by search
  if (search) {
    const q = search.toLowerCase();
    agents = agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q)
    );
  }

  // Sort
  agents = [...agents].sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case 'invocations':
        cmp = a.invocationCount - b.invocationCount;
        break;
      case 'lastInvocation':
        cmp = (a.lastInvocation ?? '').localeCompare(b.lastInvocation ?? '');
        break;
      case 'category':
        cmp = a.category.localeCompare(b.category);
        break;
      default:
        cmp = a.name.localeCompare(b.name);
    }
    return order === 'desc' ? -cmp : cmp;
  });

  const result: PaginatedResponse<AgentStats> = paginate(agents, page, limit);
  res.json(result);
});

export default router;
