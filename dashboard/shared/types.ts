// ============================================================
// Mugiwara Dashboard - Shared Types
// Source entities, derived entities, API contracts
// ============================================================

// ── Source Entities (from JSONL / YAML files) ─────────────────

/** Events stored in agents.jsonl */
export type AgentEventType =
  | 'agent_invocation'
  | 'smoke_tests'
  | 'session_start'
  | 'session_stop';

export interface AgentEvent {
  readonly timestamp: string; // ISO-8601
  readonly event: AgentEventType;
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
}

/** Events stored in sessions.jsonl */
export interface SessionEvent {
  readonly timestamp: string; // ISO-8601
  readonly event: 'session_start';
  readonly session_id: string;
}

/** Agent definition from registry.yaml */
export interface AgentDefinition {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly category: AgentCategory;
}

// ── Agent Categories ──────────────────────────────────────────

export type AgentCategory =
  | 'pipeline'
  | 'analysis'
  | 'architecture'
  | 'security'
  | 'qa'
  | 'writing'
  | 'debugging'
  | 'management'
  | 'data'
  | 'devops'
  | 'refactoring'
  | 'router'
  | 'meta'
  | 'performance'
  | 'intelligence'
  | 'infrastructure'
  | 'cloud'
  | 'monitoring'
  | 'quality'
  | 'ai-ml';

export const CATEGORY_COLORS: Record<AgentCategory, string> = {
  pipeline: '#818CF8',
  analysis: '#2DD4BF',
  architecture: '#FB923C',
  security: '#F472B6',
  qa: '#84CC16',
  writing: '#FBBF24',
  debugging: '#C084FC',
  management: '#60A5FA',
  data: '#22D3EE',
  devops: '#4ADE80',
  refactoring: '#FB7185',
  router: '#FACC15',
  meta: '#94A3B8',
  performance: '#F87171',
  intelligence: '#A78BFA',
  infrastructure: '#7C8DB5',
  cloud: '#38BDF8',
  monitoring: '#F59E0B',
  quality: '#10B981',
  'ai-ml': '#E879F9',
} as const;

// ── Derived Entities ──────────────────────────────────────────

export type SmokeTestStatus = 'pass' | 'fail' | 'unknown';

export interface AgentStats {
  readonly name: string;
  readonly description: string;
  readonly category: AgentCategory;
  readonly version: string;
  readonly invocationCount: number;
  readonly lastInvocation: string | null; // ISO-8601 or null
  readonly smokeTestStatus: SmokeTestStatus;
  readonly lastSmokeTest: string | null; // ISO-8601 or null
}

export type PipelineStatus = 'success' | 'failure' | 'running' | 'unknown';

export interface PipelineStep {
  readonly agent: string;
  readonly timestamp: string;
  readonly durationMs: number;
  readonly status: 'success' | 'failure' | 'running' | 'pending';
}

export interface PipelineRun {
  readonly name: string;
  readonly sessionId: string;
  readonly startTime: string;
  readonly endTime: string | null;
  readonly durationMs: number;
  readonly steps: readonly PipelineStep[];
  readonly status: PipelineStatus;
}

export interface Session {
  readonly id: string;
  readonly startTime: string;
  readonly endTime: string | null;
  readonly durationMs: number;
  readonly events: readonly AgentEvent[];
  readonly pipelineDetected: string | null;
  readonly agentCount: number;
}

// ── API Contracts ─────────────────────────────────────────────

export interface Pagination {
  readonly page: number;
  readonly limit: number;
  readonly total: number;
  readonly totalPages: number;
}

export interface PaginatedResponse<T> {
  readonly data: readonly T[];
  readonly pagination: Pagination;
}

export interface HealthResponse {
  readonly status: 'ok' | 'degraded';
  readonly uptime: number;
  readonly version: string;
  readonly dataFiles: {
    readonly agents: boolean;
    readonly sessions: boolean;
    readonly registry: boolean;
  };
}

export interface StatsResponse {
  readonly totalAgents: number;
  readonly totalInvocations: number;
  readonly totalSessions: number;
  readonly totalPipelines: number;
  readonly smokeTests: {
    readonly pass: number;
    readonly fail: number;
  };
  readonly categories: Record<string, number>;
  readonly lastActivity: string | null;
}

export interface ApiError {
  readonly error: string;
  readonly message: string;
}

// ── Query Parameters ──────────────────────────────────────────

export interface AgentsQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly category?: AgentCategory;
  readonly search?: string;
  readonly sort?: 'name' | 'invocations' | 'lastInvocation' | 'category';
  readonly order?: 'asc' | 'desc';
}

export interface SessionsQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly pipeline?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface PipelinesQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly name?: string;
  readonly status?: PipelineStatus;
}

// ── Memory (One Piece contextual memory) ─────────────────────

export type ConfidenceLevel = 'haute' | 'moyenne' | 'basse';
export type ResultStatus = 'succes' | 'echec' | 'en-cours';

export interface MemoryEntry {
  readonly date: string;
  readonly demande: string;
  readonly route: string;
  readonly routeAgent: string;
  readonly confiance: ConfidenceLevel;
  readonly sujet: string;
  readonly projet: string;
  readonly resultat: ResultStatus;
  readonly resultatDetail: string;
  readonly contexte: string;
}

export interface MemoryResponse {
  readonly entries: readonly MemoryEntry[];
  readonly total: number;
  readonly fileExists: boolean;
}

// ── Setup (Claude Code installed components) ─────────────────

export interface SubAgentInfo {
  readonly name: string;
  readonly description: string;
  readonly model: string;
  readonly color: string;
  readonly fileName: string;
}

export interface McpServerInfo {
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Record<string, string>;
}

export interface PluginInfo {
  readonly name: string;
  readonly description: string;
  readonly author: string;
  readonly enabled: boolean;
}

export interface SetupResponse {
  readonly subAgents: readonly SubAgentInfo[];
  readonly mcpServers: readonly McpServerInfo[];
  readonly plugins: readonly PluginInfo[];
}
