// ============================================================
// Registry & Data File Loader
// Reduced to: agent definitions from registry.yaml + file status
// All runtime data now served from SQLite via db/queries.ts
// ============================================================

import path from 'path';
import { existsSync } from 'fs';
import { parseRegistryFile } from './parsers/yaml-parser.js';
import { MemoryCache } from './cache.js';
import type { AgentDefinition } from '../shared/types.js';

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

// ── Agent Definitions (from registry.yaml) ────────────────────

export function loadAgentDefinitions(): AgentDefinition[] {
  const cached = cache.get<AgentDefinition[]>('agentDefinitions');
  if (cached) return cached;

  const defs = parseRegistryFile(REGISTRY_YAML);
  cache.set('agentDefinitions', defs);
  return defs;
}

// ── Data File Status ──────────────────────────────────────────

export function getDataFileStatus(): { agents: boolean; sessions: boolean; registry: boolean } {
  return {
    agents: existsSync(AGENTS_JSONL),
    sessions: existsSync(SESSIONS_JSONL),
    registry: existsSync(REGISTRY_YAML),
  };
}
