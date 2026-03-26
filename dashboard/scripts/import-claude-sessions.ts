#!/usr/bin/env tsx
// ============================================================
// Import Claude Code session history into Mugiwara SQLite DB
// Scans ~/.claude/projects/ for all session .jsonl files
// Populates: invocations, sessions, memory tables
// ============================================================

import { readFileSync, readdirSync, existsSync, statSync } from 'fs';
import path from 'path';
import { openDb, closeDb } from '../server/db/index.js';
import {
  insertInvocationBatch,
  insertSessionBatch,
  insertMemoryBatch,
  aggregateAllDailyStats,
} from '../server/db/queries.js';
import type { InvocationInput, SessionInput, MemoryInput } from '../server/db/queries.js';

const CLAUDE_PROJECTS_DIR = path.join(
  process.env['HOME'] || process.env['USERPROFILE'] || '~',
  '.claude',
  'projects'
);

const PIPELINES = [
  'mugiwara', 'incident', 'pre-launch', 'onboard', 'modernize', 'discovery',
  'doc-hunt', 'api-postman', 'thousand-sunny', 'polar-tang', 'oro-jackson',
  'baratie', 'pluton', 'ohara', 'merry', 'maxim'
];

// Known Mugiwara agents (for memory/orchestrator tracking)
const MUGIWARA_AGENTS = new Set([
  ...PIPELINES,
  'one_piece', 'zorro', 'sanji', 'nami', 'luffy', 'chopper', 'franky',
  'robin', 'jinbe', 'brook', 'usopp', 'vivi', 'yamato', 'shanks', 'ace',
  'law', 'law-sql', 'bartholomew', 'perona', 'senor-pink', 'morgans',
  'rayleigh', 'poneglyph', 'vegapunk', 'crocodile', 'kizaru', 'aokiji',
  'sabo', 'iceburg', 'paulie', 'coby', 'enel', 'ivankov', 'doflamingo',
  'magellan', 'katakuri', 'caesar', 'fujitora', 'big-mom', 'hawkins',
  'smoker', 'bon-clay', 'sanji-ts', 'sanji-python', 'sanji-dotnet',
  'sanji-flutter', 'sanji-go', 'sanji-java', 'sanji-rust', 'sanji-design',
  'sanji-i18n',
]);

interface SessionLine {
  type?: string;
  timestamp?: string;
  sessionId?: string;
  cwd?: string;
  message?: {
    role?: string;
    content?: Array<{
      type?: string;
      name?: string;
      input?: {
        skill?: string;
        subagent_type?: string;
        args?: string;
        prompt?: string;
        description?: string;
      };
    }> | string;
  };
}

interface ExtractedInvocation {
  timestamp: string;
  agent: string;
  tool: string;
  toolType: string;
  argsPreview: string;
  sessionId: string;
  project: string;
  description: string;
  isPipeline: boolean;
  isMugiwara: boolean;
}

interface ImportStats {
  totalProjects: number;
  totalSessions: number;
  totalInvocations: number;
  totalSessionEvents: number;
  totalMemoryEntries: number;
  totalPipelinesDetected: number;
  byProject: Record<string, number>;
  byAgent: Record<string, number>;
  errors: number;
}

function slugToProjectName(slug: string): string {
  const parts = slug.split('-');
  const projetIdx = parts.lastIndexOf('projet');
  if (projetIdx >= 0 && projetIdx + 1 < parts.length) {
    return parts.slice(projetIdx + 1).join('-');
  }
  const downloadsIdx = parts.lastIndexOf('Downloads');
  if (downloadsIdx >= 0 && downloadsIdx + 1 < parts.length) {
    return parts.slice(downloadsIdx + 1).join('-');
  }
  return parts.slice(-2).join('-');
}

function detectCategory(project: string): 'pro' | 'poc' | 'perso' {
  const pro = ['mugiwara-agents', 'magic-compagnion', 'mpcfill-custom-cards'];
  const perso = ['voxel-craft', 'poly-tron'];
  if (pro.some((p) => project.includes(p))) return 'pro';
  if (perso.some((p) => project.includes(p))) return 'perso';
  return 'poc';
}

function extractSessionData(filePath: string): {
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  sessionId: string | null;
} {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);

  let firstTimestamp: string | null = null;
  let lastTimestamp: string | null = null;
  let sessionId: string | null = null;

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as SessionLine;
      if (entry.timestamp) {
        if (!firstTimestamp) firstTimestamp = entry.timestamp;
        lastTimestamp = entry.timestamp;
      }
      if (entry.sessionId && !sessionId) {
        sessionId = entry.sessionId;
      }
    } catch { /* skip */ }
  }

  return { firstTimestamp, lastTimestamp, sessionId: sessionId || path.basename(filePath, '.jsonl') };
}

function extractInvocationsFromSession(
  filePath: string,
  projectName: string
): ExtractedInvocation[] {
  const invocations: ExtractedInvocation[] = [];

  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as SessionLine;

      if (entry.type !== 'assistant' || !entry.message?.content) continue;
      if (!Array.isArray(entry.message.content)) continue;

      const sessionId = entry.sessionId || path.basename(filePath, '.jsonl');
      const timestamp = entry.timestamp || new Date().toISOString();

      for (const block of entry.message.content) {
        if (block.type !== 'tool_use') continue;
        if (block.name !== 'Skill' && block.name !== 'Agent') continue;

        const input = block.input || {};
        const agent = input.skill || input.subagent_type || 'unknown';
        const toolType = input.subagent_type ? 'subagent' : input.skill ? 'skill' : 'unknown';
        const args = (input.args || input.prompt || '').slice(0, 200);
        const description = input.description || '';
        const isPipeline = PIPELINES.includes(agent);
        const isMugiwara = MUGIWARA_AGENTS.has(agent);

        if (agent === 'unknown') continue;

        invocations.push({
          timestamp, agent, tool: block.name, toolType,
          argsPreview: args, sessionId, project: projectName,
          description, isPipeline, isMugiwara,
        });
      }
    } catch { /* skip */ }
  }

  return invocations;
}

/**
 * Detect pipeline name for a session based on invocation patterns.
 * Returns the pipeline name if detected, null otherwise.
 */
function detectPipelineInSession(invocations: ExtractedInvocation[]): string | null {
  // Direct pipeline call: if any invocation targets a pipeline by name
  for (const inv of invocations) {
    if (inv.isPipeline) return inv.agent;
  }

  // Pattern matching: detect known pipeline agent sequences
  const mugiwaraAgents = invocations.filter((i) => i.isMugiwara).map((i) => i.agent);

  const pipelinePatterns: Record<string, string[][]> = {
    'mugiwara': [
      ['zorro', 'sanji', 'nami', 'luffy'],
      ['zorro', 'sanji', 'nami', 'franky', 'luffy'],
      ['sanji', 'nami', 'luffy'], // relaxed: sanji before zorro sometimes
      ['zorro', 'nami', 'luffy'], // relaxed: without sanji explicit
    ],
    'incident': [['chopper', 'franky', 'jinbe', 'usopp'], ['chopper', 'franky', 'jinbe']],
    'pre-launch': [['nami', 'franky', 'jinbe', 'usopp'], ['nami', 'franky', 'jinbe', 'usopp', 'ace', 'brook']],
    'onboard': [['robin', 'franky', 'brook'], ['robin', 'brook']],
    'discovery': [['vivi', 'zorro', 'sanji'], ['vivi', 'sanji'], ['vivi', 'zorro']],
    'modernize': [['yamato', 'robin', 'law', 'sanji', 'shanks', 'usopp']],
  };

  // Also detect: if one_piece routed 3+ Mugiwara agents in the session, it's a dynamic pipeline
  if (mugiwaraAgents.filter(a => a !== 'one_piece').length >= 3) {
    // Check if one_piece is present (it orchestrated)
    if (mugiwaraAgents.includes('one_piece')) {
      return 'mugiwara'; // dynamic pipeline via One Piece router
    }
  }

  for (const [pipeline, patterns] of Object.entries(pipelinePatterns)) {
    for (const pattern of patterns) {
      if (isSubsequence(pattern, mugiwaraAgents)) return pipeline;
    }
  }

  return null;
}

function isSubsequence(pattern: string[], sequence: string[]): boolean {
  if (pattern.length > sequence.length) return false;
  let pi = 0;
  for (const item of sequence) {
    if (item === pattern[pi]) pi++;
    if (pi === pattern.length) return true;
  }
  return false;
}

async function main() {
  console.log('=== Mugiwara Import: Claude Code Sessions ===\n');

  if (!existsSync(CLAUDE_PROJECTS_DIR)) {
    console.error(`ERROR: Claude projects dir not found: ${CLAUDE_PROJECTS_DIR}`);
    process.exit(1);
  }

  const stats: ImportStats = {
    totalProjects: 0, totalSessions: 0, totalInvocations: 0,
    totalSessionEvents: 0, totalMemoryEntries: 0, totalPipelinesDetected: 0,
    byProject: {}, byAgent: {}, errors: 0,
  };

  await openDb();
  console.log('[db] SQLite database opened\n');

  const projectDirs = readdirSync(CLAUDE_PROJECTS_DIR).filter((d) => {
    const fullPath = path.join(CLAUDE_PROJECTS_DIR, d);
    return statSync(fullPath).isDirectory();
  });

  console.log(`Found ${projectDirs.length} Claude project directories\n`);

  const allSessionEvents: SessionInput[] = [];
  const allMemoryEntries: MemoryInput[] = [];

  for (const dirName of projectDirs) {
    const dirPath = path.join(CLAUDE_PROJECTS_DIR, dirName);
    const projectName = slugToProjectName(dirName);
    const category = detectCategory(projectName);

    const sessionFiles = readdirSync(dirPath).filter((f) => f.endsWith('.jsonl'));
    if (sessionFiles.length === 0) continue;

    stats.totalProjects++;
    stats.byProject[projectName] = 0;

    const invocationBatch: InvocationInput[] = [];

    for (const sessionFile of sessionFiles) {
      const filePath = path.join(dirPath, sessionFile);
      const fileStats = statSync(filePath);
      if (fileStats.size < 1024) continue;

      stats.totalSessions++;

      try {
        // --- Extract session metadata ---
        const sessionData = extractSessionData(filePath);

        if (sessionData.firstTimestamp && sessionData.sessionId) {
          allSessionEvents.push({
            timestamp: sessionData.firstTimestamp,
            event: 'session_start',
            session_id: sessionData.sessionId,
            project: projectName,
            category,
          });
          if (sessionData.lastTimestamp && sessionData.lastTimestamp !== sessionData.firstTimestamp) {
            allSessionEvents.push({
              timestamp: sessionData.lastTimestamp,
              event: 'session_stop',
              session_id: sessionData.sessionId,
              reason: 'completed',
              project: projectName,
              category,
            });
          }
        }

        // --- Extract invocations ---
        const invocations = extractInvocationsFromSession(filePath, projectName);

        // --- Detect pipeline in this session ---
        const pipelineDetected = detectPipelineInSession(invocations);
        if (pipelineDetected) stats.totalPipelinesDetected++;

        for (const inv of invocations) {
          invocationBatch.push({
            timestamp: inv.timestamp,
            event: 'agent_invocation',
            agent: inv.agent,
            tool: inv.tool,
            args_preview: inv.argsPreview,
            output_summary: '',
            session_id: inv.sessionId,
            is_pipeline: inv.isPipeline,
            pipeline_detected: pipelineDetected ?? undefined,
            project: inv.project,
            category,
          });

          // --- Create memory/orchestrator entries for Mugiwara agents ---
          if (inv.isMugiwara) {
            allMemoryEntries.push({
              date: inv.timestamp,
              demande: inv.argsPreview || `Invocation ${inv.agent}`,
              route: inv.tool === 'Agent' ? 'subagent' : 'skill',
              route_agent: inv.agent,
              confiance: 'haute',
              sujet: (inv.argsPreview || inv.description || inv.agent).slice(0, 100),
              projet: inv.project,
              resultat: 'succes',
              resultat_detail: `${inv.toolType} ${inv.agent} via ${inv.tool}`,
              contexte: `Session ${inv.sessionId} — Project ${inv.project}`,
              category,
            });
          }
        }
      } catch (err) {
        stats.errors++;
        console.warn(`  [warn] Error processing ${sessionFile}: ${(err as Error).message}`);
      }
    }

    if (invocationBatch.length > 0) {
      const inserted = insertInvocationBatch(invocationBatch);
      stats.totalInvocations += inserted;
      stats.byProject[projectName] = inserted;
      for (const inv of invocationBatch) {
        if (inv.agent) {
          stats.byAgent[inv.agent] = (stats.byAgent[inv.agent] || 0) + 1;
        }
      }
    }

    const count = stats.byProject[projectName] || 0;
    if (count > 0) {
      console.log(`  [${projectName}] ${sessionFiles.length} sessions, ${count} invocations imported`);
    }
  }

  // --- Batch insert sessions ---
  console.log(`\n[db] Inserting ${allSessionEvents.length} session events...`);
  stats.totalSessionEvents = insertSessionBatch(allSessionEvents);
  console.log(`[db] ${stats.totalSessionEvents} session events inserted`);

  // --- Batch insert memory/orchestrator ---
  console.log(`[db] Inserting ${allMemoryEntries.length} memory/orchestrator entries...`);
  stats.totalMemoryEntries = insertMemoryBatch(allMemoryEntries);
  console.log(`[db] ${stats.totalMemoryEntries} memory entries inserted`);

  // --- Rebuild daily stats ---
  console.log('[db] Aggregating daily stats...');
  aggregateAllDailyStats();

  closeDb();

  // --- Summary ---
  console.log('\n=== Import Summary ===');
  console.log(`Projects scanned:     ${stats.totalProjects}`);
  console.log(`Sessions processed:   ${stats.totalSessions}`);
  console.log(`Session events:       ${stats.totalSessionEvents}`);
  console.log(`Invocations added:    ${stats.totalInvocations}`);
  console.log(`Memory entries:       ${stats.totalMemoryEntries}`);
  console.log(`Pipelines detected:   ${stats.totalPipelinesDetected}`);
  console.log(`Errors:               ${stats.errors}`);

  if (Object.keys(stats.byAgent).length > 0) {
    console.log('\n--- By Agent (top 15) ---');
    const sorted = Object.entries(stats.byAgent).sort((a, b) => b[1] - a[1]).slice(0, 15);
    for (const [agent, count] of sorted) {
      console.log(`  ${agent.padEnd(20)} ${count}`);
    }

    console.log('\n--- By Project ---');
    for (const [project, count] of Object.entries(stats.byProject)) {
      if (count > 0) console.log(`  ${project.padEnd(30)} ${count}`);
    }
  }

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
