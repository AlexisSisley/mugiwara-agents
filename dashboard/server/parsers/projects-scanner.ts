// ============================================================
// Projects Scanner - Detects projects on local filesystem
// Scans configured directories, detects stack, git info, etc.
// ============================================================

import { readdirSync, readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { homedir } from 'os';
import path from 'path';
import { detectCategory } from '../db/category-detector.js';
import { MemoryCache } from '../cache.js';
import { countClaudeSessions } from './claude-sessions-parser.js';
import type { ProjectInfo, GitInfo, ProjectMugiwaraStats, ProjectsConfig, Category } from '../../shared/types.js';

// ── Config Paths ─────────────────────────────────────────────

const MUGIWARA_DIR = path.join(homedir(), '.mugiwara');
const CONFIG_PATH = path.join(MUGIWARA_DIR, 'projects-config.json');
const MANUAL_PATH = path.join(MUGIWARA_DIR, 'projects.json');

const DEFAULT_CONFIG: ProjectsConfig = {
  scanDirs: [
    path.join(homedir(), 'Documents', 'Projet'),
    path.join(homedir(), 'Documents', 'Perso'),
  ],
  maxDepth: 2,
  ignoreDirs: ['node_modules', '.git', 'dist', 'build', 'vendor', '__pycache__', '.venv', 'bin', 'obj'],
  refreshIntervalMs: 60000,
};

// ── Project Markers ──────────────────────────────────────────

const PROJECT_MARKERS = [
  '.git',
  'package.json',
  'CLAUDE.md',
  'Cargo.toml',
  'go.mod',
  'pubspec.yaml',
  'requirements.txt',
  'pyproject.toml',
  'setup.py',
  'Makefile',
  'CMakeLists.txt',
] as const;

// .sln and .csproj need glob matching
const DOTNET_EXTENSIONS = ['.sln', '.csproj', '.fsproj'];

const KEY_FILES = [
  'README.md', 'CLAUDE.md', 'package.json', 'docker-compose.yml',
  'docker-compose.yaml', 'Dockerfile', '.env.example', 'Makefile',
  'Cargo.toml', 'go.mod', 'pubspec.yaml', 'requirements.txt',
  'pyproject.toml',
];

// ── Stack Detection Rules ────────────────────────────────────

interface StackRule {
  readonly file: string;
  readonly tags: string[];
  readonly deepCheck?: (content: string) => string[];
}

const STACK_RULES: StackRule[] = [
  {
    file: 'package.json',
    tags: ['node'],
    deepCheck: (content) => {
      const tags: string[] = [];
      try {
        const pkg = JSON.parse(content);
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (allDeps['react'] || allDeps['react-dom']) tags.push('react');
        if (allDeps['next']) tags.push('next');
        if (allDeps['svelte']) tags.push('svelte');
        if (allDeps['vue']) tags.push('vue');
        if (allDeps['nuxt']) tags.push('nuxt');
        if (allDeps['express']) tags.push('express');
        if (allDeps['@nestjs/core']) tags.push('nestjs');
        if (allDeps['fastify']) tags.push('fastify');
        if (allDeps['prisma'] || allDeps['@prisma/client']) tags.push('prisma');
        if (allDeps['tailwindcss']) tags.push('tailwind');
        if (allDeps['electron']) tags.push('electron');
        if (allDeps['flutter']) tags.push('flutter');
      } catch { /* ignore parse errors */ }
      return tags;
    },
  },
  { file: 'tsconfig.json', tags: ['typescript'] },
  { file: 'Cargo.toml', tags: ['rust'] },
  { file: 'go.mod', tags: ['go'] },
  { file: 'pubspec.yaml', tags: ['flutter', 'dart'] },
  { file: 'requirements.txt', tags: ['python'] },
  { file: 'pyproject.toml', tags: ['python'] },
  { file: 'setup.py', tags: ['python'] },
  { file: 'Gemfile', tags: ['ruby'] },
  { file: 'Makefile', tags: [] },  // too generic to tag
  { file: 'CMakeLists.txt', tags: ['c++'] },
  { file: 'docker-compose.yml', tags: ['docker'] },
  { file: 'docker-compose.yaml', tags: ['docker'] },
  { file: 'Dockerfile', tags: ['docker'] },
];

// ── Cache ────────────────────────────────────────────────────

const cache = new MemoryCache(60_000); // 60s TTL for FS scan
let lastScan: string | null = null;

// ── Config Functions ─────────────────────────────────────────

export function loadProjectsConfig(): ProjectsConfig {
  if (existsSync(CONFIG_PATH)) {
    try {
      const raw = readFileSync(CONFIG_PATH, 'utf-8');
      return { ...DEFAULT_CONFIG, ...JSON.parse(raw) } as ProjectsConfig;
    } catch { /* fallback */ }
  }
  return DEFAULT_CONFIG;
}

export function saveProjectsConfig(config: ProjectsConfig): void {
  mkdirSync(MUGIWARA_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

export function ensureProjectsConfig(): void {
  if (!existsSync(CONFIG_PATH)) {
    saveProjectsConfig(DEFAULT_CONFIG);
  }
}

// ── Manual Projects ──────────────────────────────────────────

interface ManualProject {
  path: string;
  category?: Category;
  name?: string;
}

function loadManualProjects(): ManualProject[] {
  if (!existsSync(MANUAL_PATH)) return [];
  try {
    return JSON.parse(readFileSync(MANUAL_PATH, 'utf-8')) as ManualProject[];
  } catch {
    return [];
  }
}

export function addManualProject(projectPath: string, category?: Category): void {
  const manual = loadManualProjects();
  const normalized = path.resolve(projectPath);

  // Don't add duplicates
  if (manual.some((p) => path.resolve(p.path) === normalized)) return;

  manual.push({ path: normalized, category });
  mkdirSync(MUGIWARA_DIR, { recursive: true });
  writeFileSync(MANUAL_PATH, JSON.stringify(manual, null, 2), 'utf-8');

  // Invalidate cache
  cache.invalidate('projects');
}

// ── Detection Functions ──────────────────────────────────────

function isProject(dirPath: string): boolean {
  // Check standard markers
  for (const marker of PROJECT_MARKERS) {
    const markerPath = path.join(dirPath, marker);
    if (existsSync(markerPath)) return true;
  }

  // Check .sln / .csproj files
  try {
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase();
      if (DOTNET_EXTENSIONS.includes(ext)) return true;
    }
  } catch { /* permission denied, etc. */ }

  return false;
}

function detectStack(dirPath: string): string[] {
  const tags = new Set<string>();

  for (const rule of STACK_RULES) {
    const filePath = path.join(dirPath, rule.file);
    if (existsSync(filePath)) {
      for (const tag of rule.tags) tags.add(tag);

      if (rule.deepCheck) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          for (const tag of rule.deepCheck(content)) tags.add(tag);
        } catch { /* ignore read errors */ }
      }
    }
  }

  // Check for .sln/.csproj
  try {
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const ext = path.extname(entry).toLowerCase();
      if (ext === '.sln' || ext === '.csproj') tags.add('dotnet');
      if (ext === '.fsproj') tags.add('fsharp');
    }
  } catch { /* ignore */ }

  return [...tags].sort();
}

function getGitInfo(dirPath: string): GitInfo | null {
  const gitDir = path.join(dirPath, '.git');
  if (!existsSync(gitDir)) return null;

  try {
    const branch = execSync(`git -C "${dirPath}" branch --show-current`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim() || 'HEAD';

    const lastCommit = execSync(`git -C "${dirPath}" log -1 --format=%s`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    const lastCommitDate = execSync(`git -C "${dirPath}" log -1 --format=%aI`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    const porcelain = execSync(`git -C "${dirPath}" status --porcelain`, {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();

    return {
      branch,
      lastCommit: lastCommit || '(no commits)',
      lastCommitDate: lastCommitDate || new Date().toISOString(),
      isDirty: porcelain.length > 0,
    };
  } catch {
    return null;
  }
}

function getKeyFiles(dirPath: string): string[] {
  const found: string[] = [];
  for (const file of KEY_FILES) {
    if (existsSync(path.join(dirPath, file))) {
      found.push(file);
    }
  }

  // Also check for .sln files
  try {
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      if (entry.endsWith('.sln')) found.push(entry);
    }
  } catch { /* ignore */ }

  return found;
}

function getLastModified(dirPath: string): string | null {
  try {
    const stat = statSync(dirPath);
    return stat.mtime.toISOString();
  } catch {
    return null;
  }
}

// ── Mugiwara Stats (from SQLite) ─────────────────────────────

function getMugiwaraStats(projectName: string): ProjectMugiwaraStats | null {
  try {
    // Dynamic import to avoid circular deps and handle missing DB gracefully
    const { getDb } = require('../db/index.js');
    const db = getDb();

    const pattern = `%${projectName}%`;

    const invCount = db.prepare(
      `SELECT COUNT(*) as c FROM invocations WHERE event='agent_invocation' AND (args_preview LIKE $p OR session_id IN (SELECT DISTINCT session_id FROM invocations WHERE args_preview LIKE $p))`
    );
    invCount.bind({ $p: pattern });
    invCount.step();
    const invocations = (invCount.getAsObject() as { c: number }).c;
    invCount.free();

    const memCount = db.prepare(
      `SELECT COUNT(DISTINCT session_id) as c FROM sessions WHERE session_id IN (SELECT DISTINCT session_id FROM invocations WHERE args_preview LIKE $p)`
    );
    memCount.bind({ $p: pattern });
    memCount.step();
    const sessions = (memCount.getAsObject() as { c: number }).c;
    memCount.free();

    const topAgentsStmt = db.prepare(
      `SELECT agent as name, COUNT(*) as count FROM invocations WHERE event='agent_invocation' AND args_preview LIKE $p AND agent IS NOT NULL GROUP BY agent ORDER BY count DESC LIMIT 5`
    );
    topAgentsStmt.bind({ $p: pattern });
    const topAgents: { name: string; count: number }[] = [];
    while (topAgentsStmt.step()) {
      topAgents.push(topAgentsStmt.getAsObject() as { name: string; count: number });
    }
    topAgentsStmt.free();

    const lastStmt = db.prepare(
      `SELECT MAX(timestamp) as t FROM invocations WHERE args_preview LIKE $p`
    );
    lastStmt.bind({ $p: pattern });
    lastStmt.step();
    const lastActivity = (lastStmt.getAsObject() as { t: string | null }).t;
    lastStmt.free();

    if (invocations === 0 && sessions === 0) return null;

    return { sessionCount: sessions, invocationCount: invocations, topAgents, lastActivity };
  } catch {
    return null;
  }
}

// ── Main Scanner ─────────────────────────────────────────────

function scanDirectory(dirPath: string, depth: number, maxDepth: number, ignoreDirs: string[]): string[] {
  if (depth > maxDepth) return [];
  const projects: string[] = [];

  try {
    const entries = readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (ignoreDirs.includes(entry.name)) continue;
      if (entry.name.startsWith('.') && entry.name !== '.git') continue;

      const fullPath = path.join(dirPath, entry.name);

      if (isProject(fullPath)) {
        projects.push(fullPath);
        // Don't recurse into projects (they are leaf nodes)
      } else if (depth < maxDepth) {
        // Recurse to find projects deeper
        projects.push(...scanDirectory(fullPath, depth + 1, maxDepth, ignoreDirs));
      }
    }
  } catch {
    // Permission denied, etc.
  }

  return projects;
}

function buildProjectInfo(dirPath: string, isManual: boolean, manualCategory?: Category): ProjectInfo {
  const name = path.basename(dirPath);
  const category = manualCategory ?? detectCategory({ cwd: dirPath, projet: name });
  const stack = detectStack(dirPath);
  const git = getGitInfo(dirPath);
  const keyFiles = getKeyFiles(dirPath);
  const mugiwaraStats = getMugiwaraStats(name);
  const claudeSessionCount = countClaudeSessions(dirPath);
  const lastModified = getLastModified(dirPath);

  return {
    name,
    path: dirPath,
    category,
    stack,
    git,
    keyFiles,
    mugiwaraStats,
    claudeSessionCount,
    lastModified,
    isManual,
  };
}

// ── Public API ───────────────────────────────────────────────

export function getProjects(): ProjectInfo[] {
  const cached = cache.get<ProjectInfo[]>('projects');
  if (cached) return cached;

  return forceRescan();
}

export function forceRescan(): ProjectInfo[] {
  const config = loadProjectsConfig();
  const projectPaths = new Set<string>();

  // Scan configured directories
  for (const dir of config.scanDirs) {
    if (!existsSync(dir)) continue;
    const found = scanDirectory(dir, 0, config.maxDepth, config.ignoreDirs);
    for (const p of found) projectPaths.add(path.resolve(p));
  }

  // Build project infos from scanned
  const scanned = [...projectPaths].map((p) => buildProjectInfo(p, false));

  // Load manual projects and merge
  const manual = loadManualProjects();
  const manualInfos: ProjectInfo[] = [];
  for (const mp of manual) {
    const resolved = path.resolve(mp.path);
    if (!existsSync(resolved)) continue;
    if (projectPaths.has(resolved)) continue; // Already scanned
    manualInfos.push(buildProjectInfo(resolved, true, mp.category as Category | undefined));
  }

  const all = [...scanned, ...manualInfos].sort((a, b) => a.name.localeCompare(b.name));

  cache.set('projects', all);
  lastScan = new Date().toISOString();

  return all;
}

export function getLastScanTime(): string | null {
  return lastScan;
}

export function getProjectByName(name: string): ProjectInfo | undefined {
  const projects = getProjects();
  return projects.find((p) => p.name === name);
}

export function clearProjectsCache(): void {
  cache.invalidate('projects');
}
