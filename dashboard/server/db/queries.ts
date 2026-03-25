// ============================================================
// Mugiwara Database - Typed Query Functions (sql.js API)
// ============================================================

import { getDb, saveDb } from './index.js';
import { detectCategory, type Category, type DetectionContext } from './category-detector.js';

// ── Input Types ──────────────────────────────────────────────

export interface InvocationInput {
  readonly timestamp: string;
  readonly event: string;
  readonly agent?: string;
  readonly tool?: string;
  readonly args_preview?: string;
  readonly output_summary?: string;
  readonly session_id?: string;
  readonly is_pipeline?: boolean;
  readonly trigger_file?: string;
  readonly exit_code?: number;
  readonly summary?: string;
  readonly reason?: string;
  readonly pipeline_detected?: string;
  readonly category?: Category;
  readonly cwd?: string;
}

export interface SessionInput {
  readonly timestamp: string;
  readonly event: string;
  readonly session_id: string;
  readonly reason?: string;
  readonly category?: Category;
  readonly cwd?: string;
}

export interface MemoryInput {
  readonly date: string;
  readonly demande: string;
  readonly route?: string;
  readonly route_agent?: string;
  readonly confiance?: string;
  readonly sujet?: string;
  readonly projet?: string;
  readonly resultat?: string;
  readonly resultat_detail?: string;
  readonly contexte?: string;
  readonly category?: Category;
}

// ── Output Types ─────────────────────────────────────────────

export interface WeeklyCategoryStats {
  readonly category: Category;
  readonly invocationCount: number;
  readonly sessionCount: number;
  readonly topAgents: { name: string; count: number }[];
  readonly subjects: string[];
  readonly projects: string[];
}

export interface WeeklyReportRow {
  readonly week_start: string;
  readonly week_end: string;
  readonly generated_at: string;
  readonly html_path: string | null;
  readonly draft_id: string | null;
  readonly status: string;
}

// ── Helpers ──────────────────────────────────────────────────

/** Runs a SELECT and returns all rows as objects */
function queryAll<T>(sql: string, params: Record<string, unknown> = {}): T[] {
  const db = getDb();
  const stmt = db.prepare(sql);
  stmt.bind(mapParams(params));
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

/** Runs a SELECT and returns first row or null */
function queryOne<T>(sql: string, params: Record<string, unknown> = {}): T | null {
  const rows = queryAll<T>(sql, params);
  return rows[0] ?? null;
}

/** Runs an INSERT/UPDATE/DELETE */
function execute(sql: string, params: Record<string, unknown> = {}): void {
  const db = getDb();
  db.run(sql, mapParams(params));
}

/**
 * sql.js uses $param syntax. Convert { key: val } to { $key: val }.
 */
function mapParams(params: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(params)) {
    mapped[`$${key}`] = val ?? null;
  }
  return mapped;
}

// ── Insert Functions ─────────────────────────────────────────

export function insertInvocation(data: InvocationInput): void {
  const ctx: DetectionContext = {
    projet: data.agent,
    args_preview: data.args_preview,
    cwd: data.cwd,
  };
  const category = data.category ?? detectCategory(ctx);

  execute(`
    INSERT OR IGNORE INTO invocations
      (timestamp, event, agent, tool, args_preview, output_summary,
       session_id, is_pipeline, trigger_file, exit_code, summary,
       reason, pipeline_detected, category)
    VALUES
      ($timestamp, $event, $agent, $tool, $args_preview, $output_summary,
       $session_id, $is_pipeline, $trigger_file, $exit_code, $summary,
       $reason, $pipeline_detected, $category)
  `, {
    timestamp: data.timestamp,
    event: data.event,
    agent: data.agent,
    tool: data.tool,
    args_preview: data.args_preview,
    output_summary: data.output_summary,
    session_id: data.session_id,
    is_pipeline: data.is_pipeline ? 1 : 0,
    trigger_file: data.trigger_file,
    exit_code: data.exit_code,
    summary: data.summary,
    reason: data.reason,
    pipeline_detected: data.pipeline_detected,
    category,
  });

  saveDb();
}

export function insertSession(data: SessionInput): void {
  const category = data.category ?? detectCategory({ cwd: data.cwd });

  execute(`
    INSERT OR IGNORE INTO sessions
      (timestamp, event, session_id, reason, category)
    VALUES
      ($timestamp, $event, $session_id, $reason, $category)
  `, {
    timestamp: data.timestamp,
    event: data.event,
    session_id: data.session_id,
    reason: data.reason,
    category,
  });

  saveDb();
}

export function insertMemory(data: MemoryInput): void {
  const ctx: DetectionContext = {
    projet: data.projet,
    sujet: data.sujet,
  };
  const category = data.category ?? detectCategory(ctx);

  execute(`
    INSERT OR IGNORE INTO memory
      (date, demande, route, route_agent, confiance, sujet,
       projet, resultat, resultat_detail, contexte, category)
    VALUES
      ($date, $demande, $route, $route_agent, $confiance, $sujet,
       $projet, $resultat, $resultat_detail, $contexte, $category)
  `, {
    date: data.date,
    demande: data.demande,
    route: data.route,
    route_agent: data.route_agent,
    confiance: data.confiance ?? 'moyenne',
    sujet: data.sujet,
    projet: data.projet,
    resultat: data.resultat ?? 'en-cours',
    resultat_detail: data.resultat_detail,
    contexte: data.contexte,
    category,
  });

  saveDb();
}

// ── Batch Insert (for migration — saves once at the end) ────

export function insertInvocationBatch(items: InvocationInput[]): number {
  let count = 0;
  for (const data of items) {
    try {
      const ctx: DetectionContext = { projet: data.agent, args_preview: data.args_preview, cwd: data.cwd };
      const category = data.category ?? detectCategory(ctx);

      execute(`
        INSERT OR IGNORE INTO invocations
          (timestamp, event, agent, tool, args_preview, output_summary,
           session_id, is_pipeline, trigger_file, exit_code, summary,
           reason, pipeline_detected, category)
        VALUES
          ($timestamp, $event, $agent, $tool, $args_preview, $output_summary,
           $session_id, $is_pipeline, $trigger_file, $exit_code, $summary,
           $reason, $pipeline_detected, $category)
      `, {
        timestamp: data.timestamp, event: data.event, agent: data.agent,
        tool: data.tool, args_preview: data.args_preview, output_summary: data.output_summary,
        session_id: data.session_id, is_pipeline: data.is_pipeline ? 1 : 0,
        trigger_file: data.trigger_file, exit_code: data.exit_code,
        summary: data.summary, reason: data.reason,
        pipeline_detected: data.pipeline_detected, category,
      });
      count++;
    } catch { /* skip duplicates */ }
  }
  saveDb();
  return count;
}

export function insertSessionBatch(items: SessionInput[]): number {
  let count = 0;
  for (const data of items) {
    try {
      const category = data.category ?? detectCategory({ cwd: data.cwd });
      execute(`
        INSERT OR IGNORE INTO sessions
          (timestamp, event, session_id, reason, category)
        VALUES ($timestamp, $event, $session_id, $reason, $category)
      `, {
        timestamp: data.timestamp, event: data.event,
        session_id: data.session_id, reason: data.reason, category,
      });
      count++;
    } catch { /* skip duplicates */ }
  }
  saveDb();
  return count;
}

export function insertMemoryBatch(items: MemoryInput[]): number {
  let count = 0;
  for (const data of items) {
    try {
      const ctx: DetectionContext = { projet: data.projet, sujet: data.sujet };
      const category = data.category ?? detectCategory(ctx);
      execute(`
        INSERT OR IGNORE INTO memory
          (date, demande, route, route_agent, confiance, sujet,
           projet, resultat, resultat_detail, contexte, category)
        VALUES ($date, $demande, $route, $route_agent, $confiance, $sujet,
                $projet, $resultat, $resultat_detail, $contexte, $category)
      `, {
        date: data.date, demande: data.demande, route: data.route,
        route_agent: data.route_agent, confiance: data.confiance ?? 'moyenne',
        sujet: data.sujet, projet: data.projet,
        resultat: data.resultat ?? 'en-cours',
        resultat_detail: data.resultat_detail, contexte: data.contexte, category,
      });
      count++;
    } catch { /* skip duplicates */ }
  }
  saveDb();
  return count;
}

// ── Weekly Report Queries ────────────────────────────────────

export function getWeeklyStats(weekStart: string, weekEnd: string): WeeklyCategoryStats[] {
  const categories: Category[] = ['pro', 'poc', 'perso'];
  const results: WeeklyCategoryStats[] = [];

  for (const cat of categories) {
    const invCount = queryOne<{ count: number }>(`
      SELECT COUNT(*) as count FROM invocations
      WHERE timestamp >= $weekStart AND timestamp < $weekEnd
        AND event = 'agent_invocation' AND category = $category
    `, { weekStart, weekEnd, category: cat });

    const sessCount = queryOne<{ count: number }>(`
      SELECT COUNT(DISTINCT session_id) as count FROM sessions
      WHERE timestamp >= $weekStart AND timestamp < $weekEnd
        AND event = 'session_start' AND category = $category
    `, { weekStart, weekEnd, category: cat });

    const topAgents = queryAll<{ name: string; count: number }>(`
      SELECT agent as name, COUNT(*) as count FROM invocations
      WHERE timestamp >= $weekStart AND timestamp < $weekEnd
        AND event = 'agent_invocation' AND category = $category
        AND agent IS NOT NULL
      GROUP BY agent ORDER BY count DESC LIMIT 10
    `, { weekStart, weekEnd, category: cat });

    const subjects = queryAll<{ sujet: string }>(`
      SELECT DISTINCT sujet FROM memory
      WHERE date >= $weekStart AND date < $weekEnd
        AND category = $category AND sujet IS NOT NULL AND sujet != ''
    `, { weekStart, weekEnd, category: cat });

    const projects = queryAll<{ projet: string }>(`
      SELECT DISTINCT projet FROM memory
      WHERE date >= $weekStart AND date < $weekEnd
        AND category = $category AND projet IS NOT NULL AND projet != ''
    `, { weekStart, weekEnd, category: cat });

    results.push({
      category: cat,
      invocationCount: invCount?.count ?? 0,
      sessionCount: sessCount?.count ?? 0,
      topAgents,
      subjects: subjects.map((s) => s.sujet),
      projects: projects.map((p) => p.projet),
    });
  }

  return results;
}

export function getGlobalWeeklyStats(weekStart: string, weekEnd: string): {
  totalSessions: number;
  totalInvocations: number;
  uniqueAgents: number;
  successRate: number;
} {
  const inv = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM invocations
    WHERE timestamp >= $weekStart AND timestamp < $weekEnd
      AND event = 'agent_invocation'
  `, { weekStart, weekEnd });

  const sess = queryOne<{ count: number }>(`
    SELECT COUNT(DISTINCT session_id) as count FROM sessions
    WHERE timestamp >= $weekStart AND timestamp < $weekEnd
      AND event = 'session_start'
  `, { weekStart, weekEnd });

  const agents = queryOne<{ count: number }>(`
    SELECT COUNT(DISTINCT agent) as count FROM invocations
    WHERE timestamp >= $weekStart AND timestamp < $weekEnd
      AND event = 'agent_invocation' AND agent IS NOT NULL
  `, { weekStart, weekEnd });

  const totalMem = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM memory
    WHERE date >= $weekStart AND date < $weekEnd
  `, { weekStart, weekEnd });

  const successMem = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM memory
    WHERE date >= $weekStart AND date < $weekEnd AND resultat = 'succes'
  `, { weekStart, weekEnd });

  const total = totalMem?.count ?? 0;
  const success = successMem?.count ?? 0;
  const successRate = total > 0 ? Math.round((success / total) * 100) : 100;

  return {
    totalSessions: sess?.count ?? 0,
    totalInvocations: inv?.count ?? 0,
    uniqueAgents: agents?.count ?? 0,
    successRate,
  };
}

// ── Report CRUD ──────────────────────────────────────────────

export function getReportByWeek(weekStart: string): WeeklyReportRow | null {
  return queryOne<WeeklyReportRow>(`
    SELECT * FROM weekly_reports WHERE week_start = $weekStart
  `, { weekStart });
}

export function saveReport(data: {
  weekStart: string;
  weekEnd: string;
  htmlPath?: string;
  draftId?: string;
  status?: string;
}): void {
  execute(`
    INSERT OR REPLACE INTO weekly_reports
      (week_start, week_end, generated_at, html_path, draft_id, status)
    VALUES
      ($weekStart, $weekEnd, datetime('now'), $htmlPath, $draftId, $status)
  `, {
    weekStart: data.weekStart,
    weekEnd: data.weekEnd,
    htmlPath: data.htmlPath,
    draftId: data.draftId,
    status: data.status ?? 'generated',
  });
  saveDb();
}

export function getAllReports(): WeeklyReportRow[] {
  return queryAll<WeeklyReportRow>(`
    SELECT * FROM weekly_reports ORDER BY week_start DESC
  `);
}

// ── Project Sessions Query ───────────────────────────────────

export interface ProjectSessionRow {
  readonly session_id: string;
  readonly start_time: string;
  readonly agents: string;
  readonly invocation_count: number;
  readonly pipeline_detected: string | null;
}

export function getProjectSessions(projectName: string, limit = 20): ProjectSessionRow[] {
  return queryAll<ProjectSessionRow>(`
    SELECT
      i.session_id,
      MIN(i.timestamp) as start_time,
      GROUP_CONCAT(DISTINCT i.agent) as agents,
      COUNT(*) as invocation_count,
      MAX(i.pipeline_detected) as pipeline_detected
    FROM invocations i
    WHERE i.session_id IN (
      SELECT DISTINCT session_id FROM invocations
      WHERE args_preview LIKE $pattern
        AND event = 'agent_invocation'
        AND session_id IS NOT NULL
    )
    AND i.event = 'agent_invocation'
    GROUP BY i.session_id
    ORDER BY start_time DESC
    LIMIT $limit
  `, { pattern: `%${projectName}%`, limit });
}

// ── Category Override ────────────────────────────────────────

export function updateCategory(
  table: 'invocations' | 'sessions' | 'memory',
  id: number,
  category: Category
): void {
  const validTables = ['invocations', 'sessions', 'memory'] as const;
  if (!validTables.includes(table)) throw new Error(`Invalid table: ${table}`);

  execute(`UPDATE ${table} SET category = $category WHERE id = $id`, { category, id });
  saveDb();
}
