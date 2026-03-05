// ============================================================
// Data Loader - Reads & transforms raw files into derived entities
// Uses MemoryCache with 30s TTL
// ============================================================

import path from 'path';
import { existsSync } from 'fs';
import { parseJsonlFile } from './parsers/jsonl-parser.js';
import { parseRegistryFile } from './parsers/yaml-parser.js';
import { MemoryCache } from './cache.js';
import type {
  AgentEvent,
  SessionEvent,
  AgentDefinition,
  AgentStats,
  PipelineRun,
  PipelineStep,
  PipelineStatus,
  Session,
  SmokeTestStatus,
  StatsResponse,
} from '../shared/types.js';

// ── File Paths ────────────────────────────────────────────────

const ROOT_DIR = path.resolve(import.meta.dirname, '..', '..');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');
const AGENTS_JSONL = path.join(LOGS_DIR, 'agents.jsonl');
const SESSIONS_JSONL = path.join(LOGS_DIR, 'sessions.jsonl');
const REGISTRY_YAML = path.join(ROOT_DIR, 'registry.yaml');

export { AGENTS_JSONL, SESSIONS_JSONL, REGISTRY_YAML };

// ── Cache ─────────────────────────────────────────────────────

const cache = new MemoryCache(30_000);

export function clearCache(): void {
  cache.clear();
}

// ── Raw Data Loaders ──────────────────────────────────────────

export function loadAgentEvents(): AgentEvent[] {
  const cached = cache.get<AgentEvent[]>('agentEvents');
  if (cached) return cached;

  const events = parseJsonlFile<AgentEvent>(AGENTS_JSONL);
  cache.set('agentEvents', events);
  return events;
}

export function loadSessionEvents(): SessionEvent[] {
  const cached = cache.get<SessionEvent[]>('sessionEvents');
  if (cached) return cached;

  const events = parseJsonlFile<SessionEvent>(SESSIONS_JSONL);
  cache.set('sessionEvents', events);
  return events;
}

export function loadAgentDefinitions(): AgentDefinition[] {
  const cached = cache.get<AgentDefinition[]>('agentDefinitions');
  if (cached) return cached;

  const defs = parseRegistryFile(REGISTRY_YAML);
  cache.set('agentDefinitions', defs);
  return defs;
}

// ── Derived: Agent Stats ──────────────────────────────────────

export function getAgentStats(): AgentStats[] {
  const cached = cache.get<AgentStats[]>('agentStats');
  if (cached) return cached;

  const definitions = loadAgentDefinitions();
  const events = loadAgentEvents();

  const statsMap = new Map<string, {
    invocationCount: number;
    lastInvocation: string | null;
    smokeTestStatus: SmokeTestStatus;
    lastSmokeTest: string | null;
  }>();

  // Initialize from definitions
  for (const def of definitions) {
    statsMap.set(def.name, {
      invocationCount: 0,
      lastInvocation: null,
      smokeTestStatus: 'unknown',
      lastSmokeTest: null,
    });
  }

  // Aggregate events
  for (const event of events) {
    if (event.event === 'agent_invocation' && event.agent) {
      const stats = statsMap.get(event.agent);
      if (stats) {
        stats.invocationCount++;
        if (!stats.lastInvocation || event.timestamp > stats.lastInvocation) {
          stats.lastInvocation = event.timestamp;
        }
      }
    }

    if (event.event === 'smoke_tests') {
      // Smoke tests are global, associate with trigger_file agent if possible
      const agentName = extractAgentFromTrigger(event.trigger_file);
      if (agentName) {
        const stats = statsMap.get(agentName);
        if (stats) {
          const passed = event.exit_code === 0;
          if (!stats.lastSmokeTest || event.timestamp > stats.lastSmokeTest) {
            stats.smokeTestStatus = passed ? 'pass' : 'fail';
            stats.lastSmokeTest = event.timestamp;
          }
        }
      } else {
        // Global smoke test: apply to all agents
        for (const stats of statsMap.values()) {
          const passed = event.exit_code === 0;
          if (!stats.lastSmokeTest || event.timestamp > stats.lastSmokeTest) {
            stats.smokeTestStatus = passed ? 'pass' : 'fail';
            stats.lastSmokeTest = event.timestamp;
          }
        }
      }
    }
  }

  const result: AgentStats[] = definitions.map((def) => {
    const stats = statsMap.get(def.name);
    return {
      name: def.name,
      description: def.description,
      category: def.category,
      version: def.version,
      invocationCount: stats?.invocationCount ?? 0,
      lastInvocation: stats?.lastInvocation ?? null,
      smokeTestStatus: stats?.smokeTestStatus ?? 'unknown',
      lastSmokeTest: stats?.lastSmokeTest ?? null,
    };
  });

  cache.set('agentStats', result);
  return result;
}

function extractAgentFromTrigger(triggerFile?: string): string | null {
  if (!triggerFile) return null;
  // e.g. ".../skills/mugiwara/SKILL.md" -> "mugiwara"
  const parts = triggerFile.replace(/\\/g, '/').split('/');
  const skillsIdx = parts.indexOf('skills');
  if (skillsIdx >= 0 && skillsIdx + 1 < parts.length) {
    return parts[skillsIdx + 1] ?? null;
  }
  return null;
}

// ── Derived: Sessions ─────────────────────────────────────────

export function getSessions(): Session[] {
  const cached = cache.get<Session[]>('sessions');
  if (cached) return cached;

  const sessionEvents = loadSessionEvents();
  const agentEvents = loadAgentEvents();

  // Group agent events by session_id
  const eventsBySession = new Map<string, AgentEvent[]>();
  for (const event of agentEvents) {
    if (event.session_id) {
      const arr = eventsBySession.get(event.session_id) ?? [];
      arr.push(event);
      eventsBySession.set(event.session_id, arr);
    }
  }

  const sessions: Session[] = sessionEvents.map((se) => {
    const events = eventsBySession.get(se.session_id) ?? [];
    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const startTime = se.timestamp;
    const stopEvent = sortedEvents.find((e) => e.event === 'session_stop');
    const endTime = stopEvent?.timestamp ?? null;

    const durationMs = endTime
      ? new Date(endTime).getTime() - new Date(startTime).getTime()
      : Date.now() - new Date(startTime).getTime();

    const pipelineDetected = sortedEvents.find(
      (e) => e.pipeline_detected
    )?.pipeline_detected ?? (
      sortedEvents.find((e) => e.is_pipeline)?.agent ?? null
    );

    const uniqueAgents = new Set(
      sortedEvents
        .filter((e) => e.event === 'agent_invocation' && e.agent)
        .map((e) => e.agent)
    );

    return {
      id: se.session_id,
      startTime,
      endTime,
      durationMs,
      events: sortedEvents,
      pipelineDetected,
      agentCount: uniqueAgents.size,
    };
  });

  // Sort newest first
  sessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  cache.set('sessions', sessions);
  return sessions;
}

// ── Derived: Pipeline Runs ────────────────────────────────────

export function getPipelineRuns(): PipelineRun[] {
  const cached = cache.get<PipelineRun[]>('pipelineRuns');
  if (cached) return cached;

  const sessions = getSessions();
  const pipelines: PipelineRun[] = [];

  for (const session of sessions) {
    if (!session.pipelineDetected) continue;

    const invocations = session.events.filter(
      (e) => e.event === 'agent_invocation' && e.agent
    );

    if (invocations.length === 0) continue;

    const steps: PipelineStep[] = invocations.map((inv, idx) => {
      const nextTimestamp = invocations[idx + 1]?.timestamp;
      const start = new Date(inv.timestamp).getTime();
      const end = nextTimestamp
        ? new Date(nextTimestamp).getTime()
        : (session.endTime ? new Date(session.endTime).getTime() : Date.now());
      const durationMs = end - start;

      return {
        agent: inv.agent ?? 'unknown',
        timestamp: inv.timestamp,
        durationMs,
        status: 'success' as const,
      };
    });

    const stopEvent = session.events.find((e) => e.event === 'session_stop');
    let status: PipelineStatus = 'unknown';
    if (stopEvent) {
      status = stopEvent.reason === 'error' ? 'failure' : 'success';
    } else if (!session.endTime) {
      status = 'running';
    }

    pipelines.push({
      name: session.pipelineDetected,
      sessionId: session.id,
      startTime: session.startTime,
      endTime: session.endTime,
      durationMs: session.durationMs,
      steps,
      status,
    });
  }

  cache.set('pipelineRuns', pipelines);
  return pipelines;
}

// ── Derived: Global Stats ─────────────────────────────────────

export function getStats(): StatsResponse {
  const cached = cache.get<StatsResponse>('stats');
  if (cached) return cached;

  const agents = getAgentStats();
  const sessions = getSessions();
  const pipelines = getPipelineRuns();

  const categories: Record<string, number> = {};
  let totalInvocations = 0;
  let smokePass = 0;
  let smokeFail = 0;
  let lastActivity: string | null = null;

  for (const agent of agents) {
    totalInvocations += agent.invocationCount;
    categories[agent.category] = (categories[agent.category] ?? 0) + 1;

    if (agent.smokeTestStatus === 'pass') smokePass++;
    if (agent.smokeTestStatus === 'fail') smokeFail++;

    if (agent.lastInvocation) {
      if (!lastActivity || agent.lastInvocation > lastActivity) {
        lastActivity = agent.lastInvocation;
      }
    }
  }

  const result: StatsResponse = {
    totalAgents: agents.length,
    totalInvocations,
    totalSessions: sessions.length,
    totalPipelines: pipelines.length,
    smokeTests: { pass: smokePass, fail: smokeFail },
    categories,
    lastActivity,
  };

  cache.set('stats', result);
  return result;
}

// ── Data File Status ──────────────────────────────────────────

export function getDataFileStatus(): { agents: boolean; sessions: boolean; registry: boolean } {
  return {
    agents: existsSync(AGENTS_JSONL),
    sessions: existsSync(SESSIONS_JSONL),
    registry: existsSync(REGISTRY_YAML),
  };
}
