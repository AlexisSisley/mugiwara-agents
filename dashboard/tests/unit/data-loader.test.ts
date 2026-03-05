import { describe, it, expect, beforeEach, vi } from 'vitest';
import { clearCache } from '../../server/data-loader';

// We need to mock the file system reads to test data-loader independently
// Instead of mocking fs, we test the transformation logic via integration tests
// and test the individual parsers + cache separately.

// For unit testing, we verify the cache clearing and basic module exports.

describe('data-loader module', () => {
  beforeEach(() => {
    clearCache();
  });

  it('should export clearCache function', () => {
    expect(typeof clearCache).toBe('function');
    // Should not throw
    expect(() => clearCache()).not.toThrow();
  });

  it('should export all data loading functions', async () => {
    const mod = await import('../../server/data-loader');
    expect(typeof mod.loadAgentEvents).toBe('function');
    expect(typeof mod.loadSessionEvents).toBe('function');
    expect(typeof mod.loadAgentDefinitions).toBe('function');
    expect(typeof mod.getAgentStats).toBe('function');
    expect(typeof mod.getSessions).toBe('function');
    expect(typeof mod.getPipelineRuns).toBe('function');
    expect(typeof mod.getStats).toBe('function');
    expect(typeof mod.getDataFileStatus).toBe('function');
  });

  it('should export file path constants', async () => {
    const mod = await import('../../server/data-loader');
    expect(typeof mod.AGENTS_JSONL).toBe('string');
    expect(typeof mod.SESSIONS_JSONL).toBe('string');
    expect(typeof mod.REGISTRY_YAML).toBe('string');
    expect(mod.AGENTS_JSONL).toContain('agents.jsonl');
    expect(mod.SESSIONS_JSONL).toContain('sessions.jsonl');
    expect(mod.REGISTRY_YAML).toContain('registry.yaml');
  });
});
