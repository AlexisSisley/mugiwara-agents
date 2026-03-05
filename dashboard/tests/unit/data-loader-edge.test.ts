import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Test edge cases of data-loader using module mocking.
// parseJsonlFile is called: once for agents.jsonl, once for sessions.jsonl
// parseRegistryFile is called once for registry.yaml

describe('data-loader edge cases via mocked parsers', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle smoke_tests without trigger_file (global smoke test branch)', async () => {
    const agentEvents = [
      {
        timestamp: '2026-03-01T10:00:00Z',
        event: 'smoke_tests',
        exit_code: 0,
        summary: 'All passed',
        // NO trigger_file -> global else branch
      },
    ];
    const sessionEvents: unknown[] = [];

    vi.doMock('../../server/parsers/jsonl-parser', () => ({
      parseJsonlFile: vi.fn().mockImplementation((path: string) => {
        if (path.includes('agents.jsonl')) return agentEvents;
        if (path.includes('sessions.jsonl')) return sessionEvents;
        return [];
      }),
    }));

    vi.doMock('../../server/parsers/yaml-parser', () => ({
      parseRegistryFile: vi.fn().mockReturnValue([
        { name: 'zorro', version: '1.0.0', description: 'Test', category: 'analysis' },
      ]),
    }));

    const { getAgentStats, clearCache } = await import('../../server/data-loader');
    clearCache();
    const stats = getAgentStats();
    expect(stats.length).toBe(1);
    expect(stats[0]?.smokeTestStatus).toBe('pass');
  });

  it('should handle extractAgentFromTrigger with no skills in path', async () => {
    vi.doMock('../../server/parsers/jsonl-parser', () => ({
      parseJsonlFile: vi.fn().mockImplementation((path: string) => {
        if (path.includes('agents.jsonl')) return [
          {
            timestamp: '2026-03-01T10:00:00Z',
            event: 'smoke_tests',
            exit_code: 1,
            trigger_file: '/some/path/without/keyword/file.md',
            summary: 'Failed',
          },
        ];
        return [];
      }),
    }));

    vi.doMock('../../server/parsers/yaml-parser', () => ({
      parseRegistryFile: vi.fn().mockReturnValue([
        { name: 'luffy', version: '1.0.0', description: 'Captain', category: 'management' },
      ]),
    }));

    const { getAgentStats, clearCache } = await import('../../server/data-loader');
    clearCache();
    const stats = getAgentStats();
    // trigger_file has no 'skills' segment -> extractAgentFromTrigger returns null
    // -> global branch: all agents get the smoke test result
    expect(stats[0]?.smokeTestStatus).toBe('fail');
  });

  it('should handle running pipeline (session with no session_stop)', async () => {
    vi.doMock('../../server/parsers/jsonl-parser', () => ({
      parseJsonlFile: vi.fn().mockImplementation((path: string) => {
        if (path.includes('agents.jsonl')) return [
          {
            timestamp: '2026-03-01T10:01:00Z',
            event: 'agent_invocation',
            agent: 'zorro',
            session_id: 'sess-run',
            is_pipeline: true,
            pipeline_detected: 'mugiwara',
          },
          {
            timestamp: '2026-03-01T10:05:00Z',
            event: 'agent_invocation',
            agent: 'sanji',
            session_id: 'sess-run',
            is_pipeline: true,
          },
          // NO session_stop event -> pipeline should be "running"
        ];
        if (path.includes('sessions.jsonl')) return [
          { timestamp: '2026-03-01T10:00:00Z', event: 'session_start', session_id: 'sess-run' },
        ];
        return [];
      }),
    }));

    vi.doMock('../../server/parsers/yaml-parser', () => ({
      parseRegistryFile: vi.fn().mockReturnValue([
        { name: 'zorro', version: '1.0.0', description: 'BA', category: 'analysis' },
        { name: 'sanji', version: '1.0.0', description: 'Arch', category: 'architecture' },
      ]),
    }));

    const { getPipelineRuns, clearCache } = await import('../../server/data-loader');
    clearCache();
    const pipelines = getPipelineRuns();
    expect(pipelines.length).toBe(1);
    expect(pipelines[0]?.status).toBe('running');
  });

  it('should handle pipeline with error reason', async () => {
    vi.doMock('../../server/parsers/jsonl-parser', () => ({
      parseJsonlFile: vi.fn().mockImplementation((path: string) => {
        if (path.includes('agents.jsonl')) return [
          {
            timestamp: '2026-03-01T10:01:00Z',
            event: 'agent_invocation',
            agent: 'zorro',
            session_id: 'sess-err',
            is_pipeline: true,
            pipeline_detected: 'mugiwara',
          },
          {
            timestamp: '2026-03-01T10:10:00Z',
            event: 'session_stop',
            session_id: 'sess-err',
            reason: 'error',
            pipeline_detected: 'mugiwara',
          },
        ];
        if (path.includes('sessions.jsonl')) return [
          { timestamp: '2026-03-01T10:00:00Z', event: 'session_start', session_id: 'sess-err' },
        ];
        return [];
      }),
    }));

    vi.doMock('../../server/parsers/yaml-parser', () => ({
      parseRegistryFile: vi.fn().mockReturnValue([
        { name: 'zorro', version: '1.0.0', description: 'BA', category: 'analysis' },
      ]),
    }));

    const { getPipelineRuns, clearCache } = await import('../../server/data-loader');
    clearCache();
    const pipelines = getPipelineRuns();
    expect(pipelines.length).toBe(1);
    expect(pipelines[0]?.status).toBe('failure');
  });

  it('should handle agent_invocation for agent not in registry', async () => {
    vi.doMock('../../server/parsers/jsonl-parser', () => ({
      parseJsonlFile: vi.fn().mockImplementation((path: string) => {
        if (path.includes('agents.jsonl')) return [
          {
            timestamp: '2026-03-01T10:01:00Z',
            event: 'agent_invocation',
            agent: 'unknown-agent',
            session_id: 'sess-unk',
          },
        ];
        if (path.includes('sessions.jsonl')) return [
          { timestamp: '2026-03-01T10:00:00Z', event: 'session_start', session_id: 'sess-unk' },
        ];
        return [];
      }),
    }));

    vi.doMock('../../server/parsers/yaml-parser', () => ({
      parseRegistryFile: vi.fn().mockReturnValue([
        { name: 'zorro', version: '1.0.0', description: 'BA', category: 'analysis' },
      ]),
    }));

    const { getAgentStats, clearCache } = await import('../../server/data-loader');
    clearCache();
    const stats = getAgentStats();
    expect(stats.length).toBe(1);
    expect(stats[0]?.invocationCount).toBe(0);
  });

  it('should handle smoke test with matching agent from trigger file', async () => {
    vi.doMock('../../server/parsers/jsonl-parser', () => ({
      parseJsonlFile: vi.fn().mockImplementation((path: string) => {
        if (path.includes('agents.jsonl')) return [
          {
            timestamp: '2026-03-01T10:00:00Z',
            event: 'smoke_tests',
            exit_code: 1,
            trigger_file: '/path/to/skills/zorro/SKILL.md',
            summary: 'Fail',
          },
        ];
        return [];
      }),
    }));

    vi.doMock('../../server/parsers/yaml-parser', () => ({
      parseRegistryFile: vi.fn().mockReturnValue([
        { name: 'zorro', version: '1.0.0', description: 'BA', category: 'analysis' },
        { name: 'luffy', version: '1.0.0', description: 'PM', category: 'management' },
      ]),
    }));

    const { getAgentStats, clearCache } = await import('../../server/data-loader');
    clearCache();
    const stats = getAgentStats();
    const zorro = stats.find(s => s.name === 'zorro');
    const luffy = stats.find(s => s.name === 'luffy');
    expect(zorro?.smokeTestStatus).toBe('fail');
    expect(luffy?.smokeTestStatus).toBe('unknown');
  });

  it('should handle smoke test for agent not in registry (targeted but no match)', async () => {
    vi.doMock('../../server/parsers/jsonl-parser', () => ({
      parseJsonlFile: vi.fn().mockImplementation((path: string) => {
        if (path.includes('agents.jsonl')) return [
          {
            timestamp: '2026-03-01T10:00:00Z',
            event: 'smoke_tests',
            exit_code: 0,
            trigger_file: '/path/to/skills/unknown-agent/SKILL.md',
            summary: 'Pass',
          },
        ];
        return [];
      }),
    }));

    vi.doMock('../../server/parsers/yaml-parser', () => ({
      parseRegistryFile: vi.fn().mockReturnValue([
        { name: 'zorro', version: '1.0.0', description: 'BA', category: 'analysis' },
      ]),
    }));

    const { getAgentStats, clearCache } = await import('../../server/data-loader');
    clearCache();
    const stats = getAgentStats();
    expect(stats[0]?.smokeTestStatus).toBe('unknown');
  });

  it('should handle session with pipelineDetected from is_pipeline flag', async () => {
    vi.doMock('../../server/parsers/jsonl-parser', () => ({
      parseJsonlFile: vi.fn().mockImplementation((path: string) => {
        if (path.includes('agents.jsonl')) return [
          {
            timestamp: '2026-03-01T10:01:00Z',
            event: 'agent_invocation',
            agent: 'mugiwara',
            session_id: 'sess-pipe',
            is_pipeline: true,
            // No pipeline_detected field
          },
          {
            timestamp: '2026-03-01T10:10:00Z',
            event: 'session_stop',
            session_id: 'sess-pipe',
            reason: 'unknown',
          },
        ];
        if (path.includes('sessions.jsonl')) return [
          { timestamp: '2026-03-01T10:00:00Z', event: 'session_start', session_id: 'sess-pipe' },
        ];
        return [];
      }),
    }));

    vi.doMock('../../server/parsers/yaml-parser', () => ({
      parseRegistryFile: vi.fn().mockReturnValue([
        { name: 'mugiwara', version: '1.0.0', description: 'Pipeline', category: 'pipeline' },
      ]),
    }));

    const { getSessions, clearCache } = await import('../../server/data-loader');
    clearCache();
    const sessions = getSessions();
    expect(sessions.length).toBe(1);
    expect(sessions[0]?.pipelineDetected).toBe('mugiwara');
  });

  it('should handle getStats with no invocations (lastActivity null)', async () => {
    vi.doMock('../../server/parsers/jsonl-parser', () => ({
      parseJsonlFile: vi.fn().mockReturnValue([]),
    }));

    vi.doMock('../../server/parsers/yaml-parser', () => ({
      parseRegistryFile: vi.fn().mockReturnValue([
        { name: 'zorro', version: '1.0.0', description: 'BA', category: 'analysis' },
      ]),
    }));

    const { getStats, clearCache } = await import('../../server/data-loader');
    clearCache();
    const stats = getStats();
    expect(stats.lastActivity).toBeNull();
    expect(stats.totalInvocations).toBe(0);
  });

  it('should handle empty registry (no agents)', async () => {
    vi.doMock('../../server/parsers/jsonl-parser', () => ({
      parseJsonlFile: vi.fn().mockReturnValue([]),
    }));

    vi.doMock('../../server/parsers/yaml-parser', () => ({
      parseRegistryFile: vi.fn().mockReturnValue([]),
    }));

    const { getStats, clearCache } = await import('../../server/data-loader');
    clearCache();
    const stats = getStats();
    expect(stats.totalAgents).toBe(0);
    expect(Object.keys(stats.categories).length).toBe(0);
  });

  it('should handle session with no events at all', async () => {
    vi.doMock('../../server/parsers/jsonl-parser', () => ({
      parseJsonlFile: vi.fn().mockImplementation((path: string) => {
        if (path.includes('sessions.jsonl')) return [
          { timestamp: '2026-03-01T10:00:00Z', event: 'session_start', session_id: 'sess-empty' },
        ];
        return [];
      }),
    }));

    vi.doMock('../../server/parsers/yaml-parser', () => ({
      parseRegistryFile: vi.fn().mockReturnValue([]),
    }));

    const { getSessions, clearCache } = await import('../../server/data-loader');
    clearCache();
    const sessions = getSessions();
    expect(sessions.length).toBe(1);
    expect(sessions[0]?.agentCount).toBe(0);
    expect(sessions[0]?.events).toHaveLength(0);
    expect(sessions[0]?.pipelineDetected).toBeNull();
  });
});
