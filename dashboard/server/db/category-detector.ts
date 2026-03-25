// ============================================================
// Category Detector - Auto-classifies entries as pro/poc/perso
// Uses configurable patterns from ~/.mugiwara/category-rules.json
// ============================================================

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

export type Category = 'pro' | 'poc' | 'perso';

export interface DetectionContext {
  readonly projet?: string;
  readonly args_preview?: string;
  readonly cwd?: string;
  readonly sujet?: string;
}

interface CategoryRules {
  readonly pro_patterns: string[];
  readonly poc_patterns: string[];
  readonly perso_patterns: string[];
  readonly default: Category;
}

const RULES_FILE = path.join(homedir(), '.mugiwara', 'category-rules.json');

const DEFAULT_RULES: CategoryRules = {
  pro_patterns: ['sisley', 'demeter', 'etude'],
  poc_patterns: ['poc', 'prototype', 'spike'],
  perso_patterns: ['mugiwara', 'perso'],
  default: 'pro',
};

// Path-based patterns (case-insensitive)
const PATH_PATTERNS: Record<Category, RegExp[]> = {
  pro: [/[/\\]sisley[/\\]/i, /[/\\]work[/\\]/i],
  poc: [/[/\\]poc[/\\]/i, /[/\\]spike[/\\]/i],
  perso: [/[/\\]perso[/\\]/i, /[/\\]personal[/\\]/i],
};

let cachedRules: CategoryRules | null = null;
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60_000; // 1 minute

function loadRules(): CategoryRules {
  const now = Date.now();
  if (cachedRules && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedRules;
  }

  if (existsSync(RULES_FILE)) {
    try {
      const raw = readFileSync(RULES_FILE, 'utf-8');
      cachedRules = { ...DEFAULT_RULES, ...JSON.parse(raw) } as CategoryRules;
      cacheTimestamp = now;
      return cachedRules;
    } catch {
      // Fallback to defaults on parse error
    }
  }

  cachedRules = DEFAULT_RULES;
  cacheTimestamp = now;
  return cachedRules;
}

function matchesPatterns(text: string, patterns: string[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((p) => lower.includes(p.toLowerCase()));
}

function matchesPathPatterns(text: string, regexes: RegExp[]): boolean {
  return regexes.some((r) => r.test(text));
}

/**
 * Detects the category (pro/poc/perso) from context.
 * Priority: project name > CWD path > subject > args > default
 */
export function detectCategory(ctx: DetectionContext): Category {
  const rules = loadRules();

  // 1. Match by project name
  if (ctx.projet) {
    if (matchesPatterns(ctx.projet, rules.perso_patterns)) return 'perso';
    if (matchesPatterns(ctx.projet, rules.poc_patterns)) return 'poc';
    if (matchesPatterns(ctx.projet, rules.pro_patterns)) return 'pro';
  }

  // 2. Match by CWD path
  if (ctx.cwd) {
    if (matchesPathPatterns(ctx.cwd, PATH_PATTERNS.perso)) return 'perso';
    if (matchesPathPatterns(ctx.cwd, PATH_PATTERNS.poc)) return 'poc';
    if (matchesPathPatterns(ctx.cwd, PATH_PATTERNS.pro)) return 'pro';
  }

  // 3. Match by subject
  if (ctx.sujet) {
    if (matchesPatterns(ctx.sujet, rules.perso_patterns)) return 'perso';
    if (matchesPatterns(ctx.sujet, rules.poc_patterns)) return 'poc';
    if (matchesPatterns(ctx.sujet, rules.pro_patterns)) return 'pro';
  }

  // 4. Match by args preview
  if (ctx.args_preview) {
    if (matchesPatterns(ctx.args_preview, rules.perso_patterns)) return 'perso';
    if (matchesPatterns(ctx.args_preview, rules.poc_patterns)) return 'poc';
    if (matchesPatterns(ctx.args_preview, rules.pro_patterns)) return 'pro';
  }

  return rules.default;
}

/**
 * Creates the default rules file if it doesn't exist.
 */
export function ensureRulesFile(): void {
  if (!existsSync(RULES_FILE)) {
    mkdirSync(path.dirname(RULES_FILE), { recursive: true });
    writeFileSync(RULES_FILE, JSON.stringify(DEFAULT_RULES, null, 2), 'utf-8');
  }
}
