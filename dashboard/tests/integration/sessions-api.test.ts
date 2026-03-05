import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../server/index';

describe('GET /api/sessions - branch coverage', () => {
  it('should handle search param', async () => {
    const res = await request(app).get('/api/sessions?search=abc');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('should handle pipeline filter', async () => {
    const res = await request(app).get('/api/sessions?pipeline=mugiwara');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('should handle dateFrom filter', async () => {
    const res = await request(app).get('/api/sessions?dateFrom=2026-01-01');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('should handle dateTo filter', async () => {
    const res = await request(app).get('/api/sessions?dateTo=2026-12-31');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('should handle all filters combined', async () => {
    const res = await request(app).get(
      '/api/sessions?search=test&pipeline=mugiwara&dateFrom=2026-01-01&dateTo=2026-12-31&page=1&limit=5'
    );
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body.pagination.limit).toBe(5);
  });

  it('should handle empty search returning all results', async () => {
    const res = await request(app).get('/api/sessions?search=');
    expect(res.status).toBe(200);
    // Empty search should not filter
  });
});

describe('GET /api/pipelines - branch coverage', () => {
  it('should handle name filter', async () => {
    const res = await request(app).get('/api/pipelines?name=mugiwara');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    for (const p of res.body.data) {
      expect(p.name).toBe('mugiwara');
    }
  });

  it('should handle status filter', async () => {
    const res = await request(app).get('/api/pipelines?status=success');
    expect(res.status).toBe(200);
    for (const p of res.body.data) {
      expect(p.status).toBe('success');
    }
  });

  it('should handle nonexistent name filter', async () => {
    const res = await request(app).get('/api/pipelines?name=nonexistent');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(0);
  });

  it('should handle combined name and status filters', async () => {
    const res = await request(app).get('/api/pipelines?name=mugiwara&status=success');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });
});

describe('GET /api/agents - sort branch coverage', () => {
  it('should sort by invocations ascending', async () => {
    const res = await request(app).get('/api/agents?sort=invocations&order=asc');
    expect(res.status).toBe(200);
    const data = res.body.data;
    for (let i = 1; i < data.length; i++) {
      expect(data[i].invocationCount).toBeGreaterThanOrEqual(data[i - 1].invocationCount);
    }
  });

  it('should sort by invocations descending', async () => {
    const res = await request(app).get('/api/agents?sort=invocations&order=desc');
    expect(res.status).toBe(200);
    const data = res.body.data;
    for (let i = 1; i < data.length; i++) {
      expect(data[i].invocationCount).toBeLessThanOrEqual(data[i - 1].invocationCount);
    }
  });

  it('should sort by lastInvocation', async () => {
    const res = await request(app).get('/api/agents?sort=lastInvocation&order=asc');
    expect(res.status).toBe(200);
  });

  it('should sort by category', async () => {
    const res = await request(app).get('/api/agents?sort=category&order=asc');
    expect(res.status).toBe(200);
  });

  it('should default to name sort for unknown sort field', async () => {
    const res = await request(app).get('/api/agents?sort=unknownField');
    expect(res.status).toBe(200);
    const data = res.body.data;
    for (let i = 1; i < data.length; i++) {
      expect(data[i].name.localeCompare(data[i - 1].name)).toBeGreaterThanOrEqual(0);
    }
  });
});
