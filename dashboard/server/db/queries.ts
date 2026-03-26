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
  readonly project?: string;
  readonly category?: Category;
  readonly cwd?: string;
}

export interface SessionInput {
  readonly timestamp: string;
  readonly event: string;
  readonly session_id: string;
  readonly reason?: string;
  readonly project?: string;
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
  const project = data.project ?? extractProjectFromCwd(data.cwd);

  execute(`
    INSERT OR IGNORE INTO invocations
      (timestamp, event, agent, tool, args_preview, output_summary,
       session_id, is_pipeline, trigger_file, exit_code, summary,
       reason, pipeline_detected, project, category)
    VALUES
      ($timestamp, $event, $agent, $tool, $args_preview, $output_summary,
       $session_id, $is_pipeline, $trigger_file, $exit_code, $summary,
       $reason, $pipeline_detected, $project, $category)
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
    project,
    category,
  });

  saveDb();
}

export function insertSession(data: SessionInput): void {
  const category = data.category ?? detectCategory({ cwd: data.cwd });
  const project = data.project ?? extractProjectFromCwd(data.cwd);

  execute(`
    INSERT OR IGNORE INTO sessions
      (timestamp, event, session_id, reason, project, category)
    VALUES
      ($timestamp, $event, $session_id, $reason, $project, $category)
  `, {
    timestamp: data.timestamp,
    event: data.event,
    session_id: data.session_id,
    reason: data.reason,
    project,
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
      const project = data.project ?? extractProjectFromCwd(data.cwd);

      execute(`
        INSERT OR IGNORE INTO invocations
          (timestamp, event, agent, tool, args_preview, output_summary,
           session_id, is_pipeline, trigger_file, exit_code, summary,
           reason, pipeline_detected, project, category)
        VALUES
          ($timestamp, $event, $agent, $tool, $args_preview, $output_summary,
           $session_id, $is_pipeline, $trigger_file, $exit_code, $summary,
           $reason, $pipeline_detected, $project, $category)
      `, {
        timestamp: data.timestamp, event: data.event, agent: data.agent,
        tool: data.tool, args_preview: data.args_preview, output_summary: data.output_summary,
        session_id: data.session_id, is_pipeline: data.is_pipeline ? 1 : 0,
        trigger_file: data.trigger_file, exit_code: data.exit_code,
        summary: data.summary, reason: data.reason,
        pipeline_detected: data.pipeline_detected, project, category,
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
      const project = data.project ?? extractProjectFromCwd(data.cwd);
      execute(`
        INSERT OR IGNORE INTO sessions
          (timestamp, event, session_id, reason, project, category)
        VALUES ($timestamp, $event, $session_id, $reason, $project, $category)
      `, {
        timestamp: data.timestamp, event: data.event,
        session_id: data.session_id, reason: data.reason, project, category,
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
  // Use explicit project column first, fallback to LIKE on args_preview for legacy data
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
      WHERE (project = $project OR ($project IS NOT NULL AND args_preview LIKE $pattern))
        AND event = 'agent_invocation'
        AND session_id IS NOT NULL
    )
    AND i.event = 'agent_invocation'
    GROUP BY i.session_id
    ORDER BY start_time DESC
    LIMIT $limit
  `, { project: projectName, pattern: `%${projectName}%`, limit });
}

// ── Helpers ──────────────────────────────────────────────────

/** Extract project name from cwd path (basename of the directory). */
function extractProjectFromCwd(cwd?: string): string | null {
  if (!cwd) return null;
  const normalized = cwd.replace(/\\/g, '/').replace(/\/+$/, '');
  const parts = normalized.split('/');
  return parts[parts.length - 1] ?? null;
}

// ── Overview Queries (Dashboard v3) ─────────────────────────

export function getOverviewKpis(): {
  totalInvocations: number;
  totalSessions: number;
  uniqueAgents: number;
  activeProjects: number;
} {
  const inv = queryOne<{ count: number }>(`
    SELECT COUNT(*) as count FROM invocations WHERE event = 'agent_invocation'
  `);
  const sess = queryOne<{ count: number }>(`
    SELECT COUNT(DISTINCT session_id) as count FROM sessions WHERE event = 'session_start'
  `);
  const agents = queryOne<{ count: number }>(`
    SELECT COUNT(DISTINCT agent) as count FROM invocations
    WHERE event = 'agent_invocation' AND agent IS NOT NULL
  `);
  const projects = queryOne<{ count: number }>(`
    SELECT COUNT(DISTINCT project) as count FROM invocations
    WHERE event = 'agent_invocation' AND project IS NOT NULL
  `);
  return {
    totalInvocations: inv?.count ?? 0,
    totalSessions: sess?.count ?? 0,
    uniqueAgents: agents?.count ?? 0,
    activeProjects: projects?.count ?? 0,
  };
}

export function getSparklineData(days: number, table: 'invocations' | 'sessions'): number[] {
  const result: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const dateStr = `date('now', '-${i} days')`;
    let row: { count: number } | null;
    if (table === 'invocations') {
      row = queryOne<{ count: number }>(`
        SELECT COUNT(*) as count FROM invocations
        WHERE date(timestamp) = ${dateStr} AND event = 'agent_invocation'
      `);
    } else {
      row = queryOne<{ count: number }>(`
        SELECT COUNT(DISTINCT session_id) as count FROM sessions
        WHERE date(timestamp) = ${dateStr} AND event = 'session_start'
      `);
    }
    result.push(row?.count ?? 0);
  }
  return result;
}

export function getHeatmapData(days: number): { day: number; hour: number; count: number }[] {
  return queryAll<{ day: number; hour: number; count: number }>(`
    SELECT
      CAST(strftime('%w', timestamp) AS INTEGER) as day,
      CAST(strftime('%H', timestamp) AS INTEGER) as hour,
      COUNT(*) as count
    FROM invocations
    WHERE timestamp >= datetime('now', '-${days} days')
      AND event = 'agent_invocation'
    GROUP BY day, hour
  `);
}

export function getActivityFeed(limit: number, offset: number): {
  type: string;
  timestamp: string;
  agent: string | null;
  project: string | null;
  session_id: string | null;
}[] {
  return queryAll(`
    SELECT
      'invocation' as type,
      timestamp,
      agent,
      project,
      session_id
    FROM invocations
    WHERE event = 'agent_invocation'
    UNION ALL
    SELECT
      event as type,
      timestamp,
      NULL as agent,
      project,
      session_id
    FROM sessions
    ORDER BY timestamp DESC
    LIMIT $limit OFFSET $offset
  `, { limit, offset });
}

// ── Crew Queries (Dashboard v3) ─────────────────────────────

export function getAgentUsageStats(): {
  agent: string;
  total: number;
  last7d: number;
  last_used: string | null;
  top_projects: string;
}[] {
  return queryAll(`
    SELECT
      agent,
      COUNT(*) as total,
      SUM(CASE WHEN timestamp >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as last7d,
      MAX(timestamp) as last_used,
      (SELECT GROUP_CONCAT(DISTINCT project) FROM (
        SELECT project FROM invocations i2
        WHERE i2.agent = invocations.agent
          AND i2.project IS NOT NULL
          AND i2.event = 'agent_invocation'
        ORDER BY i2.timestamp DESC LIMIT 5
      )) as top_projects
    FROM invocations
    WHERE event = 'agent_invocation' AND agent IS NOT NULL
    GROUP BY agent
    ORDER BY total DESC
  `);
}

// ── Orchestrator Queries (Dashboard v3) ─────────────────────

export function getOrchestratorStats(): {
  totalDecisions: number;
  haute: number;
  moyenne: number;
  basse: number;
  topAgents: { name: string; count: number }[];
  topProjects: { name: string; count: number }[];
} {
  const total = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM memory`);
  const haute = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM memory WHERE confiance = 'haute'`);
  const moyenne = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM memory WHERE confiance = 'moyenne'`);
  const basse = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM memory WHERE confiance = 'basse'`);
  const topAgents = queryAll<{ name: string; count: number }>(`
    SELECT route_agent as name, COUNT(*) as count FROM memory
    WHERE route_agent IS NOT NULL
    GROUP BY route_agent ORDER BY count DESC LIMIT 10
  `);
  const topProjects = queryAll<{ name: string; count: number }>(`
    SELECT projet as name, COUNT(*) as count FROM memory
    WHERE projet IS NOT NULL AND projet != ''
    GROUP BY projet ORDER BY count DESC LIMIT 10
  `);

  return {
    totalDecisions: total?.count ?? 0,
    haute: haute?.count ?? 0,
    moyenne: moyenne?.count ?? 0,
    basse: basse?.count ?? 0,
    topAgents,
    topProjects,
  };
}

export function getOrchestratorHistory(filters: {
  search?: string;
  agent?: string;
  project?: string;
  confidence?: string;
  limit?: number;
  offset?: number;
}): { rows: MemoryRow[]; total: number } {
  const conditions: string[] = [];
  const params: Record<string, unknown> = {};

  if (filters.search) {
    conditions.push(`(demande LIKE $search OR sujet LIKE $search)`);
    params.search = `%${filters.search}%`;
  }
  if (filters.agent) {
    conditions.push(`route_agent = $agent`);
    params.agent = filters.agent;
  }
  if (filters.project) {
    conditions.push(`projet = $project`);
    params.project = filters.project;
  }
  if (filters.confidence) {
    conditions.push(`confiance = $confidence`);
    params.confidence = filters.confidence;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const total = queryOne<{ count: number }>(`SELECT COUNT(*) as count FROM memory ${where}`, params);
  const rows = queryAll<MemoryRow>(`
    SELECT * FROM memory ${where}
    ORDER BY date DESC
    LIMIT $limit OFFSET $offset
  `, { ...params, limit, offset });

  return { rows, total: total?.count ?? 0 };
}

interface MemoryRow {
  id: number;
  date: string;
  demande: string;
  route: string;
  route_agent: string;
  confiance: string;
  sujet: string;
  projet: string;
  resultat: string;
  resultat_detail: string;
  contexte: string;
  category: string;
}

export function getOrchestratorDailyDecisions7d(): number[] {
  const result: number[] = [];
  for (let i = 6; i >= 0; i--) {
    const row = queryOne<{ count: number }>(`
      SELECT COUNT(*) as count FROM memory
      WHERE date(date) = date('now', '-${i} days')
    `);
    result.push(row?.count ?? 0);
  }
  return result;
}

// ── Project Timeline Queries (Dashboard v3) ─────────────────

export function getProjectTimeline(projectName: string, limit = 50): {
  timestamp: string;
  type: string;
  agent: string | null;
  session_id: string | null;
  pipeline: string | null;
}[] {
  return queryAll(`
    SELECT
      timestamp,
      'invocation' as type,
      agent,
      session_id,
      pipeline_detected as pipeline
    FROM invocations
    WHERE (project = $project OR args_preview LIKE $pattern)
      AND event = 'agent_invocation'
    UNION ALL
    SELECT
      timestamp,
      event as type,
      NULL as agent,
      session_id,
      NULL as pipeline
    FROM sessions
    WHERE project = $project
    ORDER BY timestamp DESC
    LIMIT $limit
  `, { project: projectName, pattern: `%${projectName}%`, limit });
}

export function getProjectAgentDistribution(projectName: string): { name: string; count: number }[] {
  return queryAll(`
    SELECT agent as name, COUNT(*) as count FROM invocations
    WHERE (project = $project OR args_preview LIKE $pattern)
      AND event = 'agent_invocation'
      AND agent IS NOT NULL
    GROUP BY agent ORDER BY count DESC
  `, { project: projectName, pattern: `%${projectName}%` });
}

// ── Pipeline Runs from SQLite ─────────────────────────────────

export function getPipelineRunsFromDb(filters?: { name?: string; status?: string }): import('../../shared/types.js').PipelineRun[] {
  // Get all sessions that have pipeline invocations
  const rows = queryAll<{
    session_id: string;
    pipeline_detected: string;
    agent: string;
    timestamp: string;
    event: string;
    exit_code: number | null;
    reason: string | null;
  }>(`
    SELECT session_id, pipeline_detected, agent, timestamp, event, exit_code, reason
    FROM invocations
    WHERE session_id IS NOT NULL
      AND session_id IN (
        SELECT DISTINCT session_id FROM invocations
        WHERE pipeline_detected IS NOT NULL
          AND event = 'agent_invocation'
      )
    ORDER BY session_id, timestamp ASC
  `);

  // Group by session_id
  const sessionMap = new Map<string, typeof rows>();
  for (const row of rows) {
    const arr = sessionMap.get(row.session_id) ?? [];
    arr.push(row);
    sessionMap.set(row.session_id, arr);
  }

  const pipelines: import('../../shared/types.js').PipelineRun[] = [];

  for (const [sessionId, events] of sessionMap) {
    const invocations = events.filter((e) => e.event === 'agent_invocation' && e.agent);
    if (invocations.length === 0) continue;

    const pipelineName = events.find((e) => e.pipeline_detected)?.pipeline_detected ?? 'unknown';
    const firstTimestamp = events[0]!.timestamp;
    const stopEvent = events.find((e) => e.event === 'session_stop');
    const lastTimestamp = stopEvent?.timestamp ?? events[events.length - 1]!.timestamp;

    const startMs = new Date(firstTimestamp).getTime();
    const endMs = stopEvent ? new Date(lastTimestamp).getTime() : Date.now();
    const durationMs = endMs - startMs;

    const steps: import('../../shared/types.js').PipelineStep[] = invocations.map((inv, idx) => {
      const nextTs = invocations[idx + 1]?.timestamp ?? lastTimestamp;
      const stepStart = new Date(inv.timestamp).getTime();
      const stepEnd = new Date(nextTs).getTime();
      return {
        agent: inv.agent,
        timestamp: inv.timestamp,
        durationMs: stepEnd - stepStart,
        status: 'success' as const,
      };
    });

    let status: import('../../shared/types.js').PipelineStatus = 'unknown';
    if (stopEvent) {
      status = stopEvent.reason === 'error' ? 'failure' : 'success';
    } else {
      status = 'running';
    }

    pipelines.push({
      name: pipelineName,
      sessionId,
      startTime: firstTimestamp,
      endTime: stopEvent ? lastTimestamp : null,
      durationMs,
      steps,
      status,
    });
  }

  // Sort newest first
  pipelines.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  // Apply filters
  let result = pipelines;
  if (filters?.name) {
    result = result.filter((p) => p.name === filters.name);
  }
  if (filters?.status) {
    result = result.filter((p) => p.status === filters.status);
  }

  return result;
}

// ── Daily Stats Aggregation ──────────────────────────────────

export function aggregateDailyStats(date: string): void {
  const db = getDb();

  // Get stats for the given date
  const invResult = db.exec(`
    SELECT COUNT(*) as total,
           COUNT(DISTINCT agent) as unique_agents,
           COUNT(DISTINCT project) as unique_projects
    FROM invocations
    WHERE DATE(timestamp) = $date AND event = 'agent_invocation'
  `, { $date: date });

  const sessResult = db.exec(`
    SELECT COUNT(*) as total FROM sessions WHERE DATE(timestamp) = $date
  `, { $date: date });

  const topAgentResult = db.exec(`
    SELECT agent FROM invocations
    WHERE DATE(timestamp) = $date AND event = 'agent_invocation' AND agent IS NOT NULL
    GROUP BY agent ORDER BY COUNT(*) DESC LIMIT 1
  `, { $date: date });

  const topProjectResult = db.exec(`
    SELECT project FROM invocations
    WHERE DATE(timestamp) = $date AND event = 'agent_invocation' AND project IS NOT NULL
    GROUP BY project ORDER BY COUNT(*) DESC LIMIT 1
  `, { $date: date });

  const totalInvocations = (invResult[0]?.values[0]?.[0] as number) ?? 0;
  const uniqueAgents = (invResult[0]?.values[0]?.[1] as number) ?? 0;
  const uniqueProjects = (invResult[0]?.values[0]?.[2] as number) ?? 0;
  const totalSessions = (sessResult[0]?.values[0]?.[0] as number) ?? 0;
  const topAgent = (topAgentResult[0]?.values[0]?.[0] as string) ?? null;
  const topProject = (topProjectResult[0]?.values[0]?.[0] as string) ?? null;

  db.run(`
    INSERT OR REPLACE INTO daily_stats (date, total_invocations, total_sessions, unique_agents, unique_projects, top_agent, top_project)
    VALUES ($date, $totalInvocations, $totalSessions, $uniqueAgents, $uniqueProjects, $topAgent, $topProject)
  `, {
    $date: date,
    $totalInvocations: totalInvocations,
    $totalSessions: totalSessions,
    $uniqueAgents: uniqueAgents,
    $uniqueProjects: uniqueProjects,
    $topAgent: topAgent,
    $topProject: topProject,
  });

  saveDb();
}

export function aggregateAllDailyStats(): void {
  const db = getDb();

  // Find all dates that have invocations but no daily_stats
  const result = db.exec(`
    SELECT DISTINCT DATE(timestamp) as d FROM invocations
    WHERE DATE(timestamp) NOT IN (SELECT date FROM daily_stats)
    ORDER BY d
  `);

  const dates = result[0]?.values.map((row: unknown[]) => row[0] as string) ?? [];

  for (const date of dates) {
    aggregateDailyStats(date);
  }

  if (dates.length > 0) {
    console.log(`[mugiwara-dashboard] Backfilled daily_stats for ${dates.length} days`);
  }
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
