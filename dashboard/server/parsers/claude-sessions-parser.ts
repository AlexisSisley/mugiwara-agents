// ============================================================
// Claude Sessions Parser
// Reads session JSONL files from ~/.claude/projects/<slug>/
// Extracts: timestamps, duration, messages, tools, git branch
// ============================================================

import { readdirSync, readFileSync, existsSync, statSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { MemoryCache } from '../cache.js';
import type { ClaudeSessionInfo } from '../../shared/types.js';

const CLAUDE_PROJECTS_DIR = path.join(homedir(), '.claude', 'projects');
const cache = new MemoryCache(60_000); // 60s TTL

// ── Slug Conversion ─────────────────────────────────────────

/**
 * Convert a project filesystem path to a .claude/projects slug.
 * C:\Users\foo\Documents\Projet\my-app → C--Users-foo-Documents-Projet-my-app
 */
export function projectPathToSlug(projectPath: string): string {
  // Claude Code slugifies paths: special chars each become '-'
  // Covers: : / \ . ~ space _
  return projectPath.replace(/[:\\/. ~_]/g, '-');
}

/**
 * Find the matching slug directory for a project path.
 * Handles case-insensitivity (some slugs start with lowercase c--)
 */
function findSlugDir(projectPath: string): string | null {
  const slug = projectPathToSlug(projectPath);

  // Direct match
  const direct = path.join(CLAUDE_PROJECTS_DIR, slug);
  if (existsSync(direct)) return direct;

  // Case-insensitive match
  try {
    const dirs = readdirSync(CLAUDE_PROJECTS_DIR);
    const match = dirs.find((d) => d.toLowerCase() === slug.toLowerCase());
    if (match) return path.join(CLAUDE_PROJECTS_DIR, match);
  } catch { /* dir doesn't exist */ }

  return null;
}

// ── Session Count (fast, no parsing) ────────────────────────

export function countClaudeSessions(projectPath: string): number {
  const cacheKey = `count:${projectPath}`;
  const cached = cache.get<number>(cacheKey);
  if (cached !== undefined) return cached;

  const slugDir = findSlugDir(projectPath);
  if (!slugDir) {
    cache.set(cacheKey, 0);
    return 0;
  }

  try {
    const files = readdirSync(slugDir);
    const count = files.filter((f) => f.endsWith('.jsonl')).length;
    cache.set(cacheKey, count);
    return count;
  } catch {
    cache.set(cacheKey, 0);
    return 0;
  }
}

// ── Full Session Parsing ────────────────────────────────────

interface RawSessionData {
  firstTimestamp: string | null;
  lastTimestamp: string | null;
  durationMs: number;
  userMessages: number;
  assistantMessages: number;
  toolsUsed: Set<string>;
  gitBranch: string | null;
}

function parseSessionJsonl(filePath: string): RawSessionData {
  const data: RawSessionData = {
    firstTimestamp: null,
    lastTimestamp: null,
    durationMs: 0,
    userMessages: 0,
    assistantMessages: 0,
    toolsUsed: new Set(),
    gitBranch: null,
  };

  try {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const event = JSON.parse(line);
        const type = event.type;
        const ts = event.timestamp;

        // Track timestamps
        if (ts) {
          if (!data.firstTimestamp || ts < data.firstTimestamp) data.firstTimestamp = ts;
          if (!data.lastTimestamp || ts > data.lastTimestamp) data.lastTimestamp = ts;
        }

        // Count messages
        if (type === 'user') data.userMessages++;
        if (type === 'assistant') data.assistantMessages++;

        // System events
        if (type === 'system') {
          if (event.subtype === 'turn_duration' && event.durationMs) {
            data.durationMs += event.durationMs;
          }
          if (event.gitBranch && !data.gitBranch) {
            data.gitBranch = event.gitBranch;
          }
        }

        // Tool use extraction
        if (type === 'assistant' && event.message?.content) {
          const content = event.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block?.type === 'tool_use' && block.name) {
                data.toolsUsed.add(block.name);
              }
            }
          }
        }
      } catch { /* skip unparseable lines */ }
    }
  } catch { /* file read error */ }

  return data;
}

/**
 * Get all Claude sessions for a given project path.
 * Returns sessions sorted by most recent first.
 */
export function getClaudeSessions(projectPath: string): ClaudeSessionInfo[] {
  const cacheKey = `sessions:${projectPath}`;
  const cached = cache.get<ClaudeSessionInfo[]>(cacheKey);
  if (cached) return cached;

  const slugDir = findSlugDir(projectPath);
  if (!slugDir) return [];

  try {
    const files = readdirSync(slugDir)
      .filter((f) => f.endsWith('.jsonl'));

    const sessions: ClaudeSessionInfo[] = [];

    for (const file of files) {
      const filePath = path.join(slugDir, file);
      const sessionId = file.replace('.jsonl', '');

      // Skip very small files (< 100 bytes = likely empty/corrupt)
      try {
        const stat = statSync(filePath);
        if (stat.size < 100) continue;
      } catch { continue; }

      const raw = parseSessionJsonl(filePath);

      // Skip sessions with no timestamps (empty/corrupt)
      if (!raw.firstTimestamp) continue;

      sessions.push({
        sessionId,
        startTime: raw.firstTimestamp,
        endTime: raw.lastTimestamp,
        durationMs: raw.durationMs,
        userMessages: raw.userMessages,
        assistantMessages: raw.assistantMessages,
        toolsUsed: [...raw.toolsUsed].sort(),
        gitBranch: raw.gitBranch,
      });
    }

    // Sort by most recent first
    sessions.sort((a, b) => (b.startTime ?? '').localeCompare(a.startTime ?? ''));

    cache.set(cacheKey, sessions);
    return sessions;
  } catch {
    return [];
  }
}
