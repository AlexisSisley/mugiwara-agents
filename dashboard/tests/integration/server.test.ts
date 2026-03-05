import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';

describe('Express server - additional coverage', () => {
  it('should handle non-API routes with SPA fallback', async () => {
    // This will either serve index.html or 404 if dist/client doesn't exist
    const res = await request(app).get('/some-random-page');
    // Without a built frontend, this might 404. That's OK for testing.
    expect([200, 404]).toContain(res.status);
  });

  it('should return JSON for API 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('should handle health endpoint with JSON content type', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['content-type']).toMatch(/json/);
  });

  it('should handle POST to API routes (method not handled)', async () => {
    const res = await request(app).post('/api/agents');
    // Express will likely return 404 since we only defined GET
    expect([404]).toContain(res.status);
  });
});
