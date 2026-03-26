// ============================================================
// Dashboard v3 - Orchestrator API Route
// ============================================================

import { Router } from 'express';
import { parseIntParam } from '../utils.js';
import {
  getOrchestratorStats,
  getOrchestratorHistory,
  getOrchestratorDailyDecisions7d,
} from '../db/queries.js';
import type {
  OrchestratorResponse,
  OrchestratorDecision,
  ConfidenceLevel,
  ResultStatus,
} from '../../shared/types.js';

const router = Router();

router.get('/orchestrator/stats', (_req, res) => {
  try {
    const raw = getOrchestratorStats();
    const dailyDecisions7d = getOrchestratorDailyDecisions7d();

    res.json({
      stats: {
        totalDecisions: raw.totalDecisions,
        confidenceDistribution: {
          haute: raw.haute,
          moyenne: raw.moyenne,
          basse: raw.basse,
        },
        topAgents: raw.topAgents,
        topProjects: raw.topProjects,
        dailyDecisions7d,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'orchestrator_stats_failed', message: (err as Error).message });
  }
});

router.get('/orchestrator/history', (req, res) => {
  try {
    const limit = parseIntParam(req.query['limit'], 50);
    const offset = parseIntParam(req.query['offset'], 0);
    const search = req.query['search'] as string | undefined;
    const agent = req.query['agent'] as string | undefined;
    const project = req.query['project'] as string | undefined;
    const confidence = req.query['confidence'] as string | undefined;

    const { rows, total } = getOrchestratorHistory({
      search,
      agent,
      project,
      confidence,
      limit,
      offset,
    });

    const decisions: OrchestratorDecision[] = rows.map((r) => ({
      timestamp: r.date,
      demande: r.demande,
      routeAgent: r.route_agent,
      confidence: (r.confiance || 'moyenne') as ConfidenceLevel,
      project: r.projet,
      result: (r.resultat || 'en-cours') as ResultStatus,
      resultDetail: r.resultat_detail,
      sujet: r.sujet,
      contexte: r.contexte,
    }));

    const response: OrchestratorResponse = {
      stats: {
        totalDecisions: total,
        confidenceDistribution: { haute: 0, moyenne: 0, basse: 0 },
        topAgents: [],
        topProjects: [],
        dailyDecisions7d: [],
      },
      decisions,
      total,
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'orchestrator_history_failed', message: (err as Error).message });
  }
});

export default router;
