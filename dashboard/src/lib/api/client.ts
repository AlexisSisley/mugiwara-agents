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
}

export const api = new ApiClient();
