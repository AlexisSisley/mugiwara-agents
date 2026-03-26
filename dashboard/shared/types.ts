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
  readonly role: AgentRole;
  readonly elevated: boolean;
  readonly aliasOf: string | null;
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
  | 'ai-ml'
  | 'itsm';

export type AgentRole = 'agent' | 'pipeline' | 'router' | 'alias' | 'meta';

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
  itsm: '#FF6B6B',
} as const;

// ── Derived Entities ──────────────────────────────────────────

export type SmokeTestStatus = 'pass' | 'fail' | 'unknown';

export interface AgentStats {
  readonly name: string;
  readonly description: string;
  readonly category: AgentCategory;
  readonly version: string;
  readonly role: AgentRole;
  readonly elevated: boolean;
  readonly aliasOf: string | null;
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
  readonly role?: AgentRole;
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

// ── Categories ───────────────────────────────────────────────

export type Category = 'pro' | 'poc' | 'perso';

export const CATEGORY_LABELS: Record<Category, string> = {
  pro: 'Pro (Sisley)',
  poc: 'POC',
  perso: 'Perso',
} as const;

export const CATEGORY_SECTION_COLORS: Record<Category, string> = {
  pro: '#3B82F6',
  poc: '#F59E0B',
  perso: '#10B981',
} as const;

// ── Weekly Report ────────────────────────────────────────────

export interface WeeklyReport {
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly generatedAt: string;
  readonly htmlPath: string | null;
  readonly draftId: string | null;
  readonly status: 'generated' | 'draft_created' | 'sent';
}

export interface CategorySection {
  readonly invocationCount: number;
  readonly sessionCount: number;
  readonly topAgents: { name: string; count: number }[];
  readonly subjects: string[];
  readonly projects: string[];
}

export interface WeeklyReportData {
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly generatedAt: string;
  readonly summary: {
    readonly totalSessions: number;
    readonly totalInvocations: number;
    readonly uniqueAgents: number;
    readonly successRate: number;
  };
  readonly sections: Record<Category, CategorySection>;
}

export interface ReportsResponse {
  readonly data: readonly WeeklyReport[];
  readonly total: number;
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

export type McpSource = 'user' | 'project' | 'plugin';

export interface McpServerInfo {
  readonly name: string;
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Record<string, string>;
  readonly source: McpSource;
}

export interface PluginInfo {
  readonly name: string;
  readonly description: string;
  readonly author: string;
  readonly enabled: boolean;
  readonly version: string;
  readonly scope: string;
}

export interface SetupResponse {
  readonly subAgents: readonly SubAgentInfo[];
  readonly mcpServers: readonly McpServerInfo[];
  readonly plugins: readonly PluginInfo[];
}

export interface PluginToggleRequest {
  readonly name: string;
  readonly enabled: boolean;
}

// ── Projects ─────────────────────────────────────────────────

export interface GitInfo {
  readonly branch: string;
  readonly lastCommit: string;
  readonly lastCommitDate: string;
  readonly isDirty: boolean;
}

export interface ProjectMugiwaraStats {
  readonly sessionCount: number;
  readonly invocationCount: number;
  readonly topAgents: { name: string; count: number }[];
  readonly lastActivity: string | null;
}

export type DocFileCategory = 'doc' | 'sql' | 'config' | 'schema' | 'ci' | 'other';

export interface ProjectFile {
  readonly name: string;
  readonly relativePath: string;
  readonly category: DocFileCategory;
  readonly sizeBytes: number;
  readonly lastModified: string;
}

export interface ProjectFileContent {
  readonly content: string;
  readonly name: string;
  readonly path: string;
  readonly size: number;
  readonly language: string;
}

export interface ProjectInfo {
  readonly name: string;
  readonly path: string;
  readonly category: Category;
  readonly stack: string[];
  readonly git: GitInfo | null;
  readonly keyFiles: string[];
  readonly docFiles: ProjectFile[];
  readonly mugiwaraStats: ProjectMugiwaraStats | null;
  readonly claudeSessionCount: number;
  readonly lastModified: string | null;
  readonly isManual: boolean;
}

export interface ClaudeSessionInfo {
  readonly sessionId: string;
  readonly startTime: string;
  readonly endTime: string | null;
  readonly durationMs: number;
  readonly userMessages: number;
  readonly assistantMessages: number;
  readonly toolsUsed: string[];
  readonly gitBranch: string | null;
}

export interface ClaudeSessionsResponse {
  readonly sessions: readonly ClaudeSessionInfo[];
  readonly total: number;
}

export interface ProjectSession {
  readonly sessionId: string;
  readonly startTime: string;
  readonly agents: string[];
  readonly invocationCount: number;
  readonly pipelineDetected: string | null;
}

export interface ProjectSessionsResponse {
  readonly sessions: readonly ProjectSession[];
  readonly total: number;
}

export interface ProjectsConfig {
  readonly scanDirs: string[];
  readonly maxDepth: number;
  readonly ignoreDirs: string[];
  readonly refreshIntervalMs: number;
}

export interface ProjectsResponse {
  readonly data: readonly ProjectInfo[];
  readonly total: number;
  readonly scanDirs: string[];
  readonly lastScan: string | null;
}

export interface ProjectsQuery {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly category?: Category;
  readonly stack?: string;
  readonly sort?: 'name' | 'lastModified' | 'category';
  readonly order?: 'asc' | 'desc';
}

// ── Overview (Dashboard v3) ─────────────────────────────────

export interface OverviewKpis {
  readonly totalInvocations: number;
  readonly totalSessions: number;
  readonly uniqueAgents: number;
  readonly activeProjects: number;
}

export interface OverviewResponse {
  readonly kpis: OverviewKpis;
  readonly sparklines: {
    readonly invocations7d: number[];
    readonly sessions7d: number[];
  };
  readonly heatmap: HeatmapCell[];
  readonly activityFeed: ActivityFeedItem[];
}

export interface HeatmapCell {
  readonly day: number;   // 0=Sunday, 1=Monday, ...
  readonly hour: number;  // 0-23
  readonly count: number;
}

export interface ActivityFeedItem {
  readonly type: 'invocation' | 'session_start' | 'session_end';
  readonly timestamp: string;
  readonly agent?: string;
  readonly project?: string;
  readonly confidence?: string;
  readonly sessionId?: string;
  readonly duration?: number;
}

// ── Crew (Dashboard v3) ─────────────────────────────────────

export type CrewType = 'subagent' | 'skill' | 'pipeline';

export interface CrewMember {
  readonly name: string;
  readonly type: CrewType;
  readonly role: AgentRole;
  readonly elevated: boolean;
  readonly aliasOf: string | null;
  readonly description: string;
  readonly category: AgentCategory;
  readonly version: string;
  readonly model?: string;
  readonly color?: string;
  readonly stats: CrewMemberStats;
}

export interface CrewMemberStats {
  readonly totalInvocations: number;
  readonly last7d: number;
  readonly lastUsed: string | null;
  readonly topProjects: string[];
}

export interface CrewResponse {
  readonly members: readonly CrewMember[];
  readonly total: number;
  readonly byType: {
    readonly subagents: number;
    readonly skills: number;
    readonly pipelines: number;
  };
}

export interface CrewQuery {
  readonly search?: string;
  readonly type?: CrewType;
  readonly category?: AgentCategory;
  readonly sort?: 'name' | 'invocations' | 'lastUsed';
}

// ── Orchestrator (Dashboard v3) ─────────────────────────────

export interface OrchestratorDecision {
  readonly timestamp: string;
  readonly demande: string;
  readonly routeAgent: string;
  readonly confidence: ConfidenceLevel;
  readonly project: string;
  readonly result: ResultStatus;
  readonly resultDetail: string;
  readonly sujet: string;
  readonly contexte: string;
}

export interface OrchestratorStats {
  readonly totalDecisions: number;
  readonly confidenceDistribution: {
    readonly haute: number;
    readonly moyenne: number;
    readonly basse: number;
  };
  readonly topAgents: { readonly name: string; readonly count: number }[];
  readonly topProjects: { readonly name: string; readonly count: number }[];
  readonly dailyDecisions7d: number[];
}

export interface OrchestratorResponse {
  readonly stats: OrchestratorStats;
  readonly decisions: readonly OrchestratorDecision[];
  readonly total: number;
}

export interface OrchestratorQuery {
  readonly search?: string;
  readonly agent?: string;
  readonly project?: string;
  readonly confidence?: ConfidenceLevel;
  readonly limit?: number;
  readonly offset?: number;
}

// ── Project Timeline (Dashboard v3) ─────────────────────────

export interface ProjectTimelineEntry {
  readonly timestamp: string;
  readonly type: 'invocation' | 'session';
  readonly agent?: string;
  readonly sessionId?: string;
  readonly pipeline?: string;
}

export interface ProjectGitCommit {
  readonly hash: string;
  readonly message: string;
  readonly date: string;
  readonly author: string;
}

export interface ProjectTimelineResponse {
  readonly entries: readonly ProjectTimelineEntry[];
  readonly gitCommits: readonly ProjectGitCommit[];
  readonly agentDistribution: { readonly name: string; readonly count: number }[];
}

// ── Reports ──────────────────────────────────────────────────

export interface WeeklyReport {
  readonly id: number;
  readonly week_start: string;
  readonly week_end: string;
  readonly generated_at: string;
  readonly html_path: string;
  readonly status: 'generated' | 'draft_created' | 'sent';
}

export interface ReportsResponse {
  readonly data: readonly WeeklyReport[];
  readonly total: number;
}

export interface ReportDetailResponse extends WeeklyReport {
  readonly html: string;
  readonly alreadyExisted?: boolean;
  readonly summary?: Record<string, unknown>;
}
