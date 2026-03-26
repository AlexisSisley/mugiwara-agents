// ============================================================
// Dashboard v3 - Crew API Route
// ============================================================

import { Router } from 'express';
import { loadAgentDefinitions } from '../data-loader.js';
import { getAgentUsageStats } from '../db/queries.js';
import type { CrewMember, CrewResponse, CrewType, AgentCategory } from '../../shared/types.js';

const router = Router();

router.get('/crew', (req, res) => {
  try {
    const definitions = loadAgentDefinitions();
    const usageStats = getAgentUsageStats();

    // Build usage map: agent name -> stats
    const usageMap = new Map(
      usageStats.map((s) => [s.agent, s])
    );

    // Determine crew type from definition
    function getCrewType(def: { role: string; elevated: boolean; category: string }): CrewType {
      if (def.role === 'pipeline' || def.category === 'pipeline') return 'pipeline';
      if (def.elevated) return 'subagent';
      return 'skill';
    }

    // Build crew members
    let members: CrewMember[] = definitions.map((def) => {
      const usage = usageMap.get(def.name);
      return {
        name: def.name,
        type: getCrewType(def),
        role: def.role,
        elevated: def.elevated,
        aliasOf: def.aliasOf,
        description: def.description,
        category: def.category,
        version: def.version,
        stats: {
          totalInvocations: usage?.total ?? 0,
          last7d: usage?.last7d ?? 0,
          lastUsed: usage?.last_used ?? null,
          topProjects: usage?.top_projects?.split(',').filter(Boolean) ?? [],
        },
      };
    });

    // Filters
    const search = req.query['search'] as string | undefined;
    const typeFilter = req.query['type'] as CrewType | undefined;
    const categoryFilter = req.query['category'] as AgentCategory | undefined;
    const sort = (req.query['sort'] as string) ?? 'name';

    if (search) {
      const q = search.toLowerCase();
      members = members.filter(
        (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
      );
    }
    if (typeFilter) {
      members = members.filter((m) => m.type === typeFilter);
    }
    if (categoryFilter) {
      members = members.filter((m) => m.category === categoryFilter);
    }

    // Sort
    members.sort((a, b) => {
      switch (sort) {
        case 'invocations':
          return b.stats.totalInvocations - a.stats.totalInvocations;
        case 'lastUsed':
          return (b.stats.lastUsed ?? '').localeCompare(a.stats.lastUsed ?? '');
        default:
          return a.name.localeCompare(b.name);
      }
    });

    const byType = {
      subagents: members.filter((m) => m.type === 'subagent').length,
      skills: members.filter((m) => m.type === 'skill').length,
      pipelines: members.filter((m) => m.type === 'pipeline').length,
    };

    const response: CrewResponse = {
      members,
      total: members.length,
      byType,
    };

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'crew_failed', message: (err as Error).message });
  }
});

export default router;
