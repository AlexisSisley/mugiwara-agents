import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';

// Note: supertest needs to be installed
// These tests run against the actual Express app using real data files

describe('API Integration Tests', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('uptime');
      expect(res.body).toHaveProperty('version', '0.1.0');
      expect(res.body).toHaveProperty('dataFiles');
      expect(typeof res.body.dataFiles.agents).toBe('boolean');
      expect(typeof res.body.dataFiles.sessions).toBe('boolean');
      expect(typeof res.body.dataFiles.registry).toBe('boolean');
    });

    it('should return ok or degraded status', async () => {
      const res = await request(app).get('/api/health');
      expect(['ok', 'degraded']).toContain(res.body.status);
    });
  });

  describe('GET /api/stats', () => {
    it('should return global stats', async () => {
      const res = await request(app).get('/api/stats');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('totalAgents');
      expect(res.body).toHaveProperty('totalInvocations');
      expect(res.body).toHaveProperty('totalSessions');
      expect(res.body).toHaveProperty('totalPipelines');
      expect(res.body).toHaveProperty('smokeTests');
      expect(res.body.smokeTests).toHaveProperty('pass');
      expect(res.body.smokeTests).toHaveProperty('fail');
      expect(res.body).toHaveProperty('categories');
    });

    it('should return numeric values for counts', async () => {
      const res = await request(app).get('/api/stats');
      expect(typeof res.body.totalAgents).toBe('number');
      expect(typeof res.body.totalInvocations).toBe('number');
      expect(typeof res.body.totalSessions).toBe('number');
      expect(typeof res.body.totalPipelines).toBe('number');
    });
  });

  describe('GET /api/agents', () => {
    it('should return paginated agents', async () => {
      const res = await request(app).get('/api/agents');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toHaveProperty('page');
      expect(res.body.pagination).toHaveProperty('limit');
      expect(res.body.pagination).toHaveProperty('total');
      expect(res.body.pagination).toHaveProperty('totalPages');
    });

    it('should respect page and limit params', async () => {
      const res = await request(app).get('/api/agents?page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
      expect(res.body.pagination.limit).toBe(5);
      expect(res.body.pagination.page).toBe(1);
    });

    it('should filter by category', async () => {
      const res = await request(app).get('/api/agents?category=analysis');
      expect(res.status).toBe(200);
      for (const agent of res.body.data) {
        expect(agent.category).toBe('analysis');
      }
    });

    it('should filter by search', async () => {
      const res = await request(app).get('/api/agents?search=zorro');
      expect(res.status).toBe(200);
      if (res.body.data.length > 0) {
        const found = res.body.data.some(
          (a: { name: string; description: string }) =>
            a.name.includes('zorro') || a.description.toLowerCase().includes('zorro')
        );
        expect(found).toBe(true);
      }
    });

    it('should return agent stats structure', async () => {
      const res = await request(app).get('/api/agents?limit=1');
      if (res.body.data.length > 0) {
        const agent = res.body.data[0];
        expect(agent).toHaveProperty('name');
        expect(agent).toHaveProperty('description');
        expect(agent).toHaveProperty('category');
        expect(agent).toHaveProperty('version');
        expect(agent).toHaveProperty('invocationCount');
        expect(agent).toHaveProperty('smokeTestStatus');
      }
    });
  });

  describe('GET /api/sessions', () => {
    it('should return paginated sessions', async () => {
      const res = await request(app).get('/api/sessions');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should respect pagination params', async () => {
      const res = await request(app).get('/api/sessions?page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should return session structure', async () => {
      const res = await request(app).get('/api/sessions?limit=1');
      if (res.body.data.length > 0) {
        const session = res.body.data[0];
        expect(session).toHaveProperty('id');
        expect(session).toHaveProperty('startTime');
        expect(session).toHaveProperty('durationMs');
        expect(session).toHaveProperty('events');
        expect(session).toHaveProperty('agentCount');
      }
    });
  });

  describe('GET /api/pipelines', () => {
    it('should return paginated pipelines', async () => {
      const res = await request(app).get('/api/pipelines');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return pipeline structure', async () => {
      const res = await request(app).get('/api/pipelines?limit=1');
      if (res.body.data.length > 0) {
        const pipeline = res.body.data[0];
        expect(pipeline).toHaveProperty('name');
        expect(pipeline).toHaveProperty('sessionId');
        expect(pipeline).toHaveProperty('startTime');
        expect(pipeline).toHaveProperty('durationMs');
        expect(pipeline).toHaveProperty('steps');
        expect(pipeline).toHaveProperty('status');
      }
    });
  });

  describe('API 404', () => {
    it('should return 404 for unknown API routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('error', 'not_found');
      expect(res.body).toHaveProperty('message');
    });
  });
});
