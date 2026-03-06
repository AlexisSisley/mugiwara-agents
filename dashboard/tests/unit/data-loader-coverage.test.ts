import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearCache,
  loadAgentEvents,
  loadSessionEvents,
  loadAgentDefinitions,
  getAgentStats,
  getSessions,
  getPipelineRuns,
  getStats,
  getDataFileStatus,
} from '../../server/data-loader';

describe('data-loader - full coverage', () => {
  beforeEach(() => {
    clearCache();
  });

  describe('loadAgentEvents', () => {
    it('should return an array', () => {
      const events = loadAgentEvents();
      expect(Array.isArray(events)).toBe(true);
    });

    it('should cache results (second call returns same data)', () => {
      const first = loadAgentEvents();
      const second = loadAgentEvents();
      expect(first).toBe(second); // Same reference from cache
    });
  });

  describe('loadSessionEvents', () => {
    it('should return an array', () => {
      const events = loadSessionEvents();
      expect(Array.isArray(events)).toBe(true);
    });

    it('should cache results', () => {
      const first = loadSessionEvents();
      const second = loadSessionEvents();
      expect(first).toBe(second);
    });
  });

  describe('loadAgentDefinitions', () => {
    it('should return agent definitions from registry.yaml', () => {
      const defs = loadAgentDefinitions();
      expect(Array.isArray(defs)).toBe(true);
      // Real registry has 40 agents
      expect(defs.length).toBeGreaterThan(0);
    });

    it('should cache results', () => {
      const first = loadAgentDefinitions();
      const second = loadAgentDefinitions();
      expect(first).toBe(second);
    });

    it('each definition should have required fields', () => {
      const defs = loadAgentDefinitions();
      for (const def of defs) {
        expect(def).toHaveProperty('name');
        expect(def).toHaveProperty('version');
        expect(def).toHaveProperty('description');
        expect(def).toHaveProperty('category');
        expect(typeof def.name).toBe('string');
        expect(typeof def.version).toBe('string');
      }
    });
  });

  describe('getAgentStats', () => {
    it('should return stats for all agents', () => {
      const stats = getAgentStats();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats.length).toBeGreaterThan(0);
    });

    it('should cache results', () => {
      const first = getAgentStats();
      const second = getAgentStats();
      expect(first).toBe(second);
    });

    it('each stat should have required fields', () => {
      const stats = getAgentStats();
      for (const stat of stats) {
        expect(stat).toHaveProperty('name');
        expect(stat).toHaveProperty('description');
        expect(stat).toHaveProperty('category');
        expect(stat).toHaveProperty('version');
        expect(stat).toHaveProperty('invocationCount');
        expect(stat).toHaveProperty('smokeTestStatus');
        expect(typeof stat.invocationCount).toBe('number');
        expect(['pass', 'fail', 'unknown']).toContain(stat.smokeTestStatus);
      }
    });

    it('should have matching count to definitions', () => {
      const defs = loadAgentDefinitions();
      const stats = getAgentStats();
      expect(stats.length).toBe(defs.length);
    });
  });

  describe('getSessions', () => {
    it('should return sessions array', () => {
      const sessions = getSessions();
      expect(Array.isArray(sessions)).toBe(true);
    });

    it('should cache results', () => {
      const first = getSessions();
      const second = getSessions();
      expect(first).toBe(second);
    });

    it('each session should have required fields', () => {
      const sessions = getSessions();
      for (const session of sessions) {
        expect(session).toHaveProperty('id');
        expect(session).toHaveProperty('startTime');
        expect(session).toHaveProperty('durationMs');
        expect(session).toHaveProperty('events');
        expect(session).toHaveProperty('agentCount');
        expect(typeof session.id).toBe('string');
        expect(typeof session.durationMs).toBe('number');
        expect(Array.isArray(session.events)).toBe(true);
      }
    });

    it('sessions should be sorted newest first', () => {
      const sessions = getSessions();
      for (let i = 1; i < sessions.length; i++) {
        const prev = new Date(sessions[i - 1]!.startTime).getTime();
        const curr = new Date(sessions[i]!.startTime).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });
  });

  describe('getPipelineRuns', () => {
    it('should return pipeline runs array', () => {
      const pipelines = getPipelineRuns();
      expect(Array.isArray(pipelines)).toBe(true);
    });

    it('should cache results', () => {
      const first = getPipelineRuns();
      const second = getPipelineRuns();
      expect(first).toBe(second);
    });

    it('each pipeline should have required fields', () => {
      const pipelines = getPipelineRuns();
      for (const p of pipelines) {
        expect(p).toHaveProperty('name');
        expect(p).toHaveProperty('sessionId');
        expect(p).toHaveProperty('startTime');
        expect(p).toHaveProperty('durationMs');
        expect(p).toHaveProperty('steps');
        expect(p).toHaveProperty('status');
        expect(Array.isArray(p.steps)).toBe(true);
        expect(['success', 'failure', 'running', 'unknown']).toContain(p.status);
      }
    });
  });

  describe('getStats', () => {
    it('should return global stats', () => {
      const stats = getStats();
      expect(stats).toHaveProperty('totalAgents');
      expect(stats).toHaveProperty('totalInvocations');
      expect(stats).toHaveProperty('totalSessions');
      expect(stats).toHaveProperty('totalPipelines');
      expect(stats).toHaveProperty('smokeTests');
      expect(stats).toHaveProperty('categories');
    });

    it('should cache results', () => {
      const first = getStats();
      const second = getStats();
      expect(first).toBe(second);
    });

    it('totalAgents should match definitions count', () => {
      const stats = getStats();
      const defs = loadAgentDefinitions();
      expect(stats.totalAgents).toBe(defs.length);
    });

    it('categories should be populated', () => {
      const stats = getStats();
      expect(Object.keys(stats.categories).length).toBeGreaterThan(0);
    });

    it('smokeTests counts should be non-negative', () => {
      const stats = getStats();
      expect(stats.smokeTests.pass).toBeGreaterThanOrEqual(0);
      expect(stats.smokeTests.fail).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getDataFileStatus', () => {
    it('should return boolean status for each file', () => {
      const status = getDataFileStatus();
      expect(typeof status.agents).toBe('boolean');
      expect(typeof status.sessions).toBe('boolean');
      expect(typeof status.registry).toBe('boolean');
    });

    it('should detect existing data files', () => {
      const status = getDataFileStatus();
      // registry.yaml is tracked in git and always exists
      expect(status.registry).toBe(true);
      // agents.jsonl and sessions.jsonl are in logs/ (gitignored)
      // so they may not exist in CI — just check they return booleans
      expect(typeof status.agents).toBe('boolean');
      expect(typeof status.sessions).toBe('boolean');
    });
  });

  describe('clearCache', () => {
    it('should clear cache so next calls reload data', () => {
      const first = getAgentStats();
      clearCache();
      const second = getAgentStats();
      // After clearing cache, should get a new array (different reference)
      // But same content since files haven't changed
      expect(first).not.toBe(second);
      expect(first.length).toBe(second.length);
    });
  });
});
