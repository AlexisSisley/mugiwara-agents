// ============================================================
// Svelte Stores - Reactive state with 30s polling
// ============================================================
//
// "A man's dream never dies!" — Marshall D. Teach
//

import { writable } from 'svelte/store';
import { api } from './api/client';
import type {
  PipelineRun,
  PaginatedResponse,
  ProjectsResponse,
  OverviewResponse,
  CrewResponse,
  OrchestratorResponse,
  OrchestratorStats,
  ProjectTimelineResponse,
  ReportsResponse,
  ReportDetailResponse,
  McpResponse,
} from '../../shared/types';

// ── Polling interval ──────────────────────────────────────────
const POLL_INTERVAL = 30_000;

// ── Overview Store (Dashboard v3) ────────────────────────────
export const overview = writable<OverviewResponse | null>(null);
export const overviewLoading = writable(true);
export const overviewError = writable<string | null>(null);

export async function fetchOverview(): Promise<void> {
  try {
    overviewLoading.set(true);
    overviewError.set(null);
    const data = await api.getOverview();
    overview.set(data);
  } catch (err) {
    overviewError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    overviewLoading.set(false);
  }
}

// ── Crew Store (Dashboard v3) ────────────────────────────────
export const crew = writable<CrewResponse | null>(null);
export const crewLoading = writable(true);
export const crewError = writable<string | null>(null);

export async function fetchCrew(params?: Record<string, string>): Promise<void> {
  try {
    crewLoading.set(true);
    crewError.set(null);
    const data = await api.getCrew(params);
    crew.set(data);
  } catch (err) {
    crewError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    crewLoading.set(false);
  }
}

// ── Orchestrator Store (Dashboard v3) ────────────────────────
export const orchestratorStats = writable<OrchestratorStats | null>(null);
export const orchestratorHistory = writable<OrchestratorResponse | null>(null);
export const orchestratorLoading = writable(true);
export const orchestratorError = writable<string | null>(null);

export async function fetchOrchestratorStats(): Promise<void> {
  try {
    orchestratorLoading.set(true);
    orchestratorError.set(null);
    const data = await api.getOrchestratorStats();
    orchestratorStats.set(data.stats);
  } catch (err) {
    orchestratorError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    orchestratorLoading.set(false);
  }
}

export async function fetchOrchestratorHistory(params?: Record<string, string>): Promise<void> {
  try {
    orchestratorLoading.set(true);
    orchestratorError.set(null);
    const data = await api.getOrchestratorHistory(params);
    orchestratorHistory.set(data);
  } catch (err) {
    orchestratorError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    orchestratorLoading.set(false);
  }
}

// ── Pipelines Store ──────────────────────────────────────────
export const pipelines = writable<PaginatedResponse<PipelineRun> | null>(null);
export const pipelinesLoading = writable(true);
export const pipelinesError = writable<string | null>(null);

export async function fetchPipelines(params?: Record<string, string>): Promise<void> {
  try {
    pipelinesLoading.set(true);
    pipelinesError.set(null);
    const data = await api.getPipelines(params);
    pipelines.set(data);
  } catch (err) {
    pipelinesError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    pipelinesLoading.set(false);
  }
}

// ── Projects Store ──────────────────────────────────────────
export const projects = writable<ProjectsResponse | null>(null);
export const projectsLoading = writable(true);
export const projectsError = writable<string | null>(null);

export async function fetchProjects(params?: Record<string, string>): Promise<void> {
  try {
    projectsLoading.set(true);
    projectsError.set(null);
    const data = await api.getProjects(params);
    projects.set(data);
  } catch (err) {
    projectsError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    projectsLoading.set(false);
  }
}

export async function scanProjects(): Promise<void> {
  try {
    projectsLoading.set(true);
    projectsError.set(null);
    const data = await api.scanProjects();
    projects.set(data);
  } catch (err) {
    projectsError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    projectsLoading.set(false);
  }
}

export async function openClaude(projectName: string, dangerouslySkipPermissions = false): Promise<boolean> {
  try {
    await api.openClaude(projectName, dangerouslySkipPermissions);
    return true;
  } catch {
    return false;
  }
}

export async function openExplorer(projectName: string): Promise<boolean> {
  try {
    await api.openExplorer(projectName);
    return true;
  } catch {
    return false;
  }
}

export async function runAgent(projectName: string, agent: string, message: string): Promise<boolean> {
  try {
    await api.runAgent(projectName, agent, message);
    return true;
  } catch {
    return false;
  }
}

// ── Project Timeline Store (Dashboard v3) ────────────────────
export const projectTimeline = writable<ProjectTimelineResponse | null>(null);
export const projectTimelineLoading = writable(false);

export async function fetchProjectTimeline(name: string): Promise<void> {
  try {
    projectTimelineLoading.set(true);
    const data = await api.getProjectTimeline(name);
    projectTimeline.set(data);
  } catch {
    projectTimeline.set(null);
  } finally {
    projectTimelineLoading.set(false);
  }
}

// ── Reports Store ────────────────────────────────────────────
export const reports = writable<ReportsResponse | null>(null);
export const reportsLoading = writable(false);
export const reportsError = writable<string | null>(null);
export const selectedReport = writable<ReportDetailResponse | null>(null);

export async function fetchReports(): Promise<void> {
  try {
    reportsLoading.set(true);
    reportsError.set(null);
    const data = await api.getReports();
    reports.set(data);
  } catch (err) {
    reportsError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    reportsLoading.set(false);
  }
}

export async function generateReport(weekStart?: string): Promise<ReportDetailResponse | null> {
  try {
    reportsError.set(null);
    const data = await api.generateReport(weekStart);
    // Refresh list
    await fetchReports();
    return data;
  } catch (err) {
    reportsError.set(err instanceof Error ? err.message : 'Unknown error');
    return null;
  }
}

export async function regenerateReport(weekStart?: string): Promise<ReportDetailResponse | null> {
  try {
    reportsError.set(null);
    const data = await api.regenerateReport(weekStart);
    await fetchReports();
    return data;
  } catch (err) {
    reportsError.set(err instanceof Error ? err.message : 'Unknown error');
    return null;
  }
}

export async function fetchReport(weekStart: string): Promise<void> {
  try {
    const data = await api.getReport(weekStart);
    selectedReport.set(data);
  } catch {
    selectedReport.set(null);
  }
}

// ── Polling Manager ───────────────────────────────────────────
let pollTimer: ReturnType<typeof setInterval> | null = null;

export function startPolling(callback: () => void): void {
  stopPolling();
  callback();
  pollTimer = setInterval(callback, POLL_INTERVAL);
}

export function stopPolling(): void {
  if (pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// ── MCP / Plugins Store ──────────────────────────────────────
export const mcp = writable<McpResponse | null>(null);
export const mcpLoading = writable(false);
export const mcpError = writable<string | null>(null);

export async function fetchMcp(forceRefresh = false): Promise<void> {
  try {
    mcpLoading.set(true);
    mcpError.set(null);
    const params = forceRefresh ? { refresh: 'true' } : undefined;
    const data = await api.getMcp(params);
    mcp.set(data);
  } catch (err) {
    mcpError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    mcpLoading.set(false);
  }
}

// ── Active Route ──────────────────────────────────────────────
export const activeRoute = writable<string>('/');
