// ============================================================
// Seed Script - Generate 30 days of realistic data
// Usage: npm run seed (or tsx scripts/seed.ts)
// ============================================================

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';

const ROOT_DIR = path.resolve(import.meta.dirname ?? __dirname, '..', '..');
const LOGS_DIR = path.join(ROOT_DIR, 'logs');
const AGENTS_JSONL = path.join(LOGS_DIR, 'agents.jsonl');
const SESSIONS_JSONL = path.join(LOGS_DIR, 'sessions.jsonl');

// ── Agents from registry ──────────────────────────────────────
const AGENTS = [
  'ace', 'api-postman', 'bartholomew', 'bon-clay', 'brook', 'chopper',
  'discovery', 'doc-hunt', 'franky', 'incident', 'jinbe', 'law',
  'law-sql', 'luffy', 'modernize', 'morgans', 'mugiwara', 'nami',
  'onboard', 'one_piece', 'perona', 'pre-launch', 'robin', 'sanji',
  'sanji-design', 'sanji-dotnet', 'sanji-flutter', 'sanji-go',
  'sanji-i18n', 'sanji-java', 'sanji-python', 'sanji-rust', 'sanji-ts',
  'senor-pink', 'shanks', 'usopp', 'vegapunk', 'vivi', 'yamato', 'zorro',
];

const PIPELINES = [
  { name: 'mugiwara', agents: ['zorro', 'sanji', 'nami', 'luffy'] },
  { name: 'api-postman', agents: ['bartholomew', 'perona', 'senor-pink'] },
  { name: 'discovery', agents: ['vivi', 'zorro'] },
  { name: 'doc-hunt', agents: ['robin', 'brook'] },
  { name: 'incident', agents: ['chopper', 'franky', 'usopp'] },
  { name: 'modernize', agents: ['shanks', 'sanji', 'nami'] },
  { name: 'onboard', agents: ['vivi', 'robin', 'brook'] },
  { name: 'pre-launch', agents: ['nami', 'franky', 'jinbe', 'usopp'] },
];

// ── Helpers ───────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function isoDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

// ── Generate Data ─────────────────────────────────────────────

interface AgentLine {
  timestamp: string;
  event: string;
  agent?: string;
  tool?: string;
  args_preview?: string;
  output_summary?: string;
  session_id?: string;
  is_pipeline?: boolean;
  trigger_file?: string;
  exit_code?: number;
  summary?: string;
  reason?: string;
  pipeline_detected?: string;
}

interface SessionLine {
  timestamp: string;
  event: string;
  session_id: string;
}

const agentLines: AgentLine[] = [];
const sessionLines: SessionLine[] = [];

const now = new Date();
const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

// Generate 1-4 sessions per day
let currentDate = new Date(thirtyDaysAgo);

while (currentDate < now) {
  const sessionsPerDay = randomInt(1, 4);

  for (let s = 0; s < sessionsPerDay; s++) {
    const sessionId = uuid();
    const sessionStart = new Date(
      currentDate.getTime() + randomInt(0, 20) * 60 * 60 * 1000 + randomInt(0, 59) * 60 * 1000
    );

    if (sessionStart > now) break;

    // Session start event
    sessionLines.push({
      timestamp: isoDate(sessionStart),
      event: 'session_start',
      session_id: sessionId,
    });

    // Decide: pipeline or solo agents
    const isPipeline = Math.random() < 0.4;

    if (isPipeline) {
      const pipeline = randomChoice(PIPELINES);
      let eventTime = new Date(sessionStart.getTime() + randomInt(5, 30) * 1000);

      for (const agent of pipeline.agents) {
        const duration = randomInt(30, 600) * 1000; // 30s to 10min

        agentLines.push({
          timestamp: isoDate(eventTime),
          event: 'agent_invocation',
          agent,
          tool: 'Skill',
          args_preview: `Pipeline ${pipeline.name} step`,
          output_summary: JSON.stringify({
            success: true,
            commandName: agent,
            status: 'forked',
            agentId: `a${Math.random().toString(16).slice(2, 18)}`,
            result: `Agent ${agent} completed successfully.`,
          }),
          session_id: sessionId,
          is_pipeline: true,
        });

        eventTime = new Date(eventTime.getTime() + duration);
      }

      // Pipeline completion
      agentLines.push({
        timestamp: isoDate(eventTime),
        event: 'agent_invocation',
        agent: pipeline.name,
        tool: 'Skill',
        args_preview: `Pipeline ${pipeline.name} execution`,
        output_summary: JSON.stringify({
          success: true,
          commandName: pipeline.name,
          status: 'forked',
          result: `Pipeline ${pipeline.name} completed.`,
        }),
        session_id: sessionId,
        is_pipeline: true,
      });

      // Session stop
      const stopTime = new Date(eventTime.getTime() + randomInt(5, 60) * 1000);
      agentLines.push({
        timestamp: isoDate(stopTime),
        event: 'session_stop',
        session_id: sessionId,
        reason: 'unknown',
        pipeline_detected: pipeline.name,
      });
    } else {
      // Solo agent invocations (1-5)
      const invocationCount = randomInt(1, 5);
      let eventTime = new Date(sessionStart.getTime() + randomInt(5, 30) * 1000);

      for (let i = 0; i < invocationCount; i++) {
        const agent = randomChoice(AGENTS);
        const duration = randomInt(10, 300) * 1000;

        agentLines.push({
          timestamp: isoDate(eventTime),
          event: 'agent_invocation',
          agent,
          tool: 'Skill',
          args_preview: `Solo invocation of ${agent}`,
          output_summary: JSON.stringify({
            success: true,
            commandName: agent,
            status: 'forked',
            agentId: `a${Math.random().toString(16).slice(2, 18)}`,
            result: `Agent ${agent} task completed.`,
          }),
          session_id: sessionId,
          is_pipeline: false,
        });

        eventTime = new Date(eventTime.getTime() + duration);
      }

      // Session stop
      agentLines.push({
        timestamp: isoDate(eventTime),
        event: 'session_stop',
        session_id: sessionId,
        reason: 'unknown',
      });
    }

    // Smoke tests (occasionally, 30% chance)
    if (Math.random() < 0.3) {
      const smokeTime = new Date(sessionStart.getTime() + randomInt(600, 3600) * 1000);
      const agent = randomChoice(AGENTS);
      const passed = Math.random() < 0.92;

      agentLines.push({
        timestamp: isoDate(smokeTime),
        event: 'smoke_tests',
        trigger_file: `C:/Users/Alexi/Documents/projet/mugiwara-agents/skills/${agent}/SKILL.md`,
        exit_code: passed ? 0 : 1,
        summary: passed
          ? '  FAIL: 0\n  WARN: 0\n  Total: 342 tests\n\n  All tests passed!'
          : '  FAIL: 2\n  WARN: 1\n  Total: 342 tests\n\n  Some tests failed.',
      });
    }
  }

  currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
}

// ── Sort by timestamp ─────────────────────────────────────────
agentLines.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
sessionLines.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

// ── Write files ───────────────────────────────────────────────
if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true });
}

const agentsContent = agentLines.map((l) => JSON.stringify(l)).join('\n');
const sessionsContent = sessionLines.map((l) => JSON.stringify(l)).join('\n');

writeFileSync(AGENTS_JSONL, agentsContent + '\n', 'utf-8');
writeFileSync(SESSIONS_JSONL, sessionsContent + '\n', 'utf-8');

console.log(`[seed] Generated ${agentLines.length} agent events in ${AGENTS_JSONL}`);
console.log(`[seed] Generated ${sessionLines.length} session events in ${SESSIONS_JSONL}`);
console.log('[seed] Done!');
