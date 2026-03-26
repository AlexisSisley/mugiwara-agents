// ============================================================
// API Client - Fetch wrapper for dashboard REST API
// ============================================================
// If you're reading this, you've gone too deep.
// Turn back now... or join the crew.
// "The sea is vast. If you don't know what you want,
//  the sea will swallow you whole." - Jinbe
// ============================================================

import type {
  HealthResponse,
  PipelineRun,
  PaginatedResponse,
  ApiError,
  ProjectsResponse,
  ProjectInfo,
  ProjectsConfig,
  ProjectSessionsResponse,
  ClaudeSessionsResponse,
  OverviewResponse,
  CrewResponse,
  OrchestratorResponse,
  OrchestratorStats,
  ProjectTimelineResponse,
  ReportsResponse,
  ReportDetailResponse,
} from '../../../shared/types';

const BASE_URL = '/api';

class ApiClient {
  private async fetch<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${endpoint}`, window.location.origin);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, value);
        }
      }
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'unknown',
        message: `HTTP ${response.status}`,
      }));
      throw new Error(error.message);
    }

    return response.json() as Promise<T>;
  }

  private async put<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'unknown',
        message: `HTTP ${response.status}`,
      }));
      throw new Error(error.message);
    }

    return response.json() as Promise<T>;
  }

  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: 'unknown',
        message: `HTTP ${response.status}`,
      }));
      throw new Error(error.message);
    }

    return response.json() as Promise<T>;
  }

  async getHealth(): Promise<HealthResponse> {
    return this.fetch<HealthResponse>('/health');
  }

  async getPipelines(params?: Record<string, string>): Promise<PaginatedResponse<PipelineRun>> {
    return this.fetch<PaginatedResponse<PipelineRun>>('/pipelines', params);
  }

  // ── Projects ──────────────────────────────────────────────────

  async getProjects(params?: Record<string, string>): Promise<ProjectsResponse> {
    return this.fetch<ProjectsResponse>('/projects', params);
  }

  async getProjectSessions(name: string): Promise<ProjectSessionsResponse> {
    return this.fetch<ProjectSessionsResponse>(`/projects/${encodeURIComponent(name)}/sessions`);
  }

  async getClaudeSessions(name: string): Promise<ClaudeSessionsResponse> {
    return this.fetch<ClaudeSessionsResponse>(`/projects/${encodeURIComponent(name)}/claude-sessions`);
  }

  async getProjectFile(name: string, relativePath: string): Promise<import('../../../shared/types').ProjectFileContent> {
    return this.fetch(`/projects/${encodeURIComponent(name)}/file?path=${encodeURIComponent(relativePath)}`);
  }

  async getProject(name: string): Promise<ProjectInfo> {
    return this.fetch<ProjectInfo>(`/projects/${encodeURIComponent(name)}`);
  }

  async scanProjects(): Promise<ProjectsResponse> {
    return this.post<ProjectsResponse>('/projects/scan', {});
  }

  async openClaude(projectName: string, dangerouslySkipPermissions = false): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/projects/${encodeURIComponent(projectName)}/open`, { dangerouslySkipPermissions });
  }

  async openExplorer(projectName: string): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/projects/${encodeURIComponent(projectName)}/explore`, {});
  }

  async runAgent(projectName: string, agent: string, message: string): Promise<{ success: boolean }> {
    return this.post<{ success: boolean }>(`/projects/${encodeURIComponent(projectName)}/run-agent`, { agent, message });
  }

  async updateProjectsConfig(config: Partial<ProjectsConfig>): Promise<ProjectsResponse> {
    return this.put<ProjectsResponse>('/projects/config', config);
  }

  async addProject(projectPath: string, category?: string): Promise<{ success: boolean; project: ProjectInfo | null }> {
    return this.post<{ success: boolean; project: ProjectInfo | null }>('/projects/add', { path: projectPath, category });
  }

  // ── Dashboard v3 ─────────────────────────────────────────────

  async getOverview(): Promise<OverviewResponse> {
    return this.fetch<OverviewResponse>('/overview');
  }

  async getCrew(params?: Record<string, string>): Promise<CrewResponse> {
    return this.fetch<CrewResponse>('/crew', params);
  }

  async getOrchestratorStats(): Promise<{ stats: OrchestratorStats }> {
    return this.fetch<{ stats: OrchestratorStats }>('/orchestrator/stats');
  }

  async getOrchestratorHistory(params?: Record<string, string>): Promise<OrchestratorResponse> {
    return this.fetch<OrchestratorResponse>('/orchestrator/history', params);
  }

  async getProjectTimeline(name: string): Promise<ProjectTimelineResponse> {
    return this.fetch<ProjectTimelineResponse>(`/projects/${encodeURIComponent(name)}/timeline`);
  }

  // ── Reports ─────────────────────────────────────────────────

  async getReports(): Promise<ReportsResponse> {
    return this.fetch<ReportsResponse>('/reports');
  }

  async getReport(weekStart: string): Promise<ReportDetailResponse> {
    return this.fetch<ReportDetailResponse>(`/reports/${encodeURIComponent(weekStart)}`);
  }

  async generateReport(weekStart?: string): Promise<ReportDetailResponse> {
    return this.post<ReportDetailResponse>('/reports/generate', { weekStart });
  }
}

export const api = new ApiClient();
