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
  StatsResponse,
  AgentStats,
  Session,
  PipelineRun,
  PaginatedResponse,
  ApiError,
  MemoryResponse,
  SetupResponse,
  PluginToggleRequest,
  ProjectsResponse,
  ProjectInfo,
  ProjectsConfig,
  ProjectSessionsResponse,
  ClaudeSessionsResponse,
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

  async getStats(): Promise<StatsResponse> {
    return this.fetch<StatsResponse>('/stats');
  }

  async getAgents(params?: Record<string, string>): Promise<PaginatedResponse<AgentStats>> {
    return this.fetch<PaginatedResponse<AgentStats>>('/agents', params);
  }

  async getSessions(params?: Record<string, string>): Promise<PaginatedResponse<Session>> {
    return this.fetch<PaginatedResponse<Session>>('/sessions', params);
  }

  async getPipelines(params?: Record<string, string>): Promise<PaginatedResponse<PipelineRun>> {
    return this.fetch<PaginatedResponse<PipelineRun>>('/pipelines', params);
  }

  async getMemory(params?: Record<string, string>): Promise<MemoryResponse> {
    return this.fetch<MemoryResponse>('/memory', params);
  }

  async getSetup(): Promise<SetupResponse> {
    return this.fetch<SetupResponse>('/setup');
  }

  async togglePlugin(name: string, enabled: boolean): Promise<SetupResponse> {
    return this.post<SetupResponse>('/setup/plugins/toggle', { name, enabled } satisfies PluginToggleRequest);
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
}

export const api = new ApiClient();
