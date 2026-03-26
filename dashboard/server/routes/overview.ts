// ============================================================
// Dashboard v3 - Overview API Route
// ============================================================

import { Router } from 'express';
import { parseIntParam } from '../utils.js';
import {
  getOverviewKpis,
  getSparklineData,
  getHeatmapData,
  getActivityFeed,
} from '../db/queries.js';
import type { OverviewResponse, ActivityFeedItem } from '../../shared/types.js';

const router = Router();

router.get('/overview', (_req, res) => {
  try {
    const kpis = getOverviewKpis();
    const invocations7d = getSparklineData(7, 'invocations');
    const sessions7d = getSparklineData(7, 'sessions');
    const heatmap = getHeatmapData(7);
    const feedRows = getActivityFeed(20, 0);

    const activityFeed: ActivityFeedItem[] = feedRows.map((row) => ({
      type: row.type as ActivityFeedItem['type'],
      timestamp: row.timestamp,
      agent: row.agent ?? undefined,
      project: row.project ?? undefined,
      sessionId: row.session_id ?? undefined,
    }));

    const response: OverviewResponse = {
      kpis,
      sparklines: { invocations7d, sessions7d },
      heatmap,
      activityFeed,
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'overview_failed', message: (err as Error).message });
  }
});

router.get('/overview/feed', (req, res) => {
  try {
    const limit = parseIntParam(req.query['limit'], 20);
    const offset = parseIntParam(req.query['offset'], 0);
    const feedRows = getActivityFeed(limit, offset);

    const items: ActivityFeedItem[] = feedRows.map((row) => ({
      type: row.type as ActivityFeedItem['type'],
      timestamp: row.timestamp,
      agent: row.agent ?? undefined,
      project: row.project ?? undefined,
      sessionId: row.session_id ?? undefined,
    }));

    res.json({ data: items, limit, offset });
  } catch (err) {
    res.status(500).json({ error: 'feed_failed', message: (err as Error).message });
  }
});

export default router;
