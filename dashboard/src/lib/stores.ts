// ============================================================
// Svelte Stores - Reactive state with 30s polling
// ============================================================
//
// If you're reading this, you've navigated the Grand Line of our codebase.
// The treasure you seek is not gold or silver — it's reactive state.
// "A man's dream never dies!" — Marshall D. Teach
//

import { writable } from 'svelte/store';
import { api } from './api/client';
import type {
  StatsResponse,
  AgentStats,
  Session,
  PipelineRun,
  PaginatedResponse,
  MemoryResponse,
  SetupResponse,
} from '../../shared/types';

// ── Polling interval ──────────────────────────────────────────
const POLL_INTERVAL = 30_000;

// ── Stats Store ───────────────────────────────────────────────
export const stats = writable<StatsResponse | null>(null);
export const statsLoading = writable(true);
export const statsError = writable<string | null>(null);

export async function fetchStats(): Promise<void> {
  try {
    statsLoading.set(true);
    statsError.set(null);
    const data = await api.getStats();
    stats.set(data);
  } catch (err) {
    statsError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    statsLoading.set(false);
  }
}

// ── Agents Store ──────────────────────────────────────────────
export const agents = writable<PaginatedResponse<AgentStats> | null>(null);
export const agentsLoading = writable(true);
export const agentsError = writable<string | null>(null);

export async function fetchAgents(params?: Record<string, string>): Promise<void> {
  try {
    agentsLoading.set(true);
    agentsError.set(null);
    const data = await api.getAgents(params);
    agents.set(data);
  } catch (err) {
    agentsError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    agentsLoading.set(false);
  }
}

// ── Sessions Store ────────────────────────────────────────────
export const sessions = writable<PaginatedResponse<Session> | null>(null);
export const sessionsLoading = writable(true);
export const sessionsError = writable<string | null>(null);

export async function fetchSessions(params?: Record<string, string>): Promise<void> {
  try {
    sessionsLoading.set(true);
    sessionsError.set(null);
    const data = await api.getSessions(params);
    sessions.set(data);
  } catch (err) {
    sessionsError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    sessionsLoading.set(false);
  }
}

// ── Pipelines Store ───────────────────────────────────────────
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

// ── Memory Store ──────────────────────────────────────────────
export const memory = writable<MemoryResponse | null>(null);
export const memoryLoading = writable(true);
export const memoryError = writable<string | null>(null);

export async function fetchMemory(params?: Record<string, string>): Promise<void> {
  try {
    memoryLoading.set(true);
    memoryError.set(null);
    const data = await api.getMemory(params);
    memory.set(data);
  } catch (err) {
    memoryError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    memoryLoading.set(false);
  }
}

// ── Setup Store ───────────────────────────────────────────────
export const setup = writable<SetupResponse | null>(null);
export const setupLoading = writable(true);
export const setupError = writable<string | null>(null);

export async function fetchSetup(): Promise<void> {
  try {
    setupLoading.set(true);
    setupError.set(null);
    const data = await api.getSetup();
    setup.set(data);
  } catch (err) {
    setupError.set(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    setupLoading.set(false);
  }
}

export async function togglePlugin(name: string, enabled: boolean): Promise<void> {
  try {
    setupError.set(null);
    const data = await api.togglePlugin(name, enabled);
    setup.set(data);
  } catch (err) {
    setupError.set(err instanceof Error ? err.message : 'Unknown error');
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

// ── Active Route ──────────────────────────────────────────────
export const activeRoute = writable<string>('/');
