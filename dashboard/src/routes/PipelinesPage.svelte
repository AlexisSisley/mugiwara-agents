<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    pipelines,
    pipelinesLoading,
    pipelinesError,
    fetchPipelines,
    fetchStats,
    stats,
    startPolling,
    stopPolling,
  } from '$lib/stores';
  import Header from '$lib/components/Header.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { formatDuration, formatDateTime, formatNumber } from '$lib/format';
  import type { PipelineRun, PipelineStatus } from '../../shared/types';

  let statusFilter = '';
  let currentPage = 1;

  function buildParams(): Record<string, string> {
    const params: Record<string, string> = {
      page: String(currentPage),
      limit: '10',
    };
    if (statusFilter) params['status'] = statusFilter;
    return params;
  }

  async function reload() {
    await Promise.all([fetchPipelines(buildParams()), fetchStats()]);
  }

  function handleStatusChange(e: Event) {
    statusFilter = (e.target as HTMLSelectElement).value;
    currentPage = 1;
    reload();
  }

  function handlePage(e: CustomEvent<number>) {
    currentPage = e.detail;
    reload();
  }

  function getStatusVariant(status: PipelineStatus): 'pass' | 'fail' | 'running' | 'idle' {
    if (status === 'success') return 'pass';
    if (status === 'failure') return 'fail';
    if (status === 'running') return 'running';
    return 'idle';
  }

  function getStepStatusColor(status: string): string {
    if (status === 'success') return 'var(--color-success)';
    if (status === 'failure') return 'var(--color-error)';
    if (status === 'running') return 'var(--color-info)';
    return 'var(--color-text-tertiary)';
  }

  onMount(() => {
    startPolling(reload);
  });

  onDestroy(() => {
    stopPolling();
  });
</script>

<Header title="Pipelines" />

<div class="page">
  <!-- KPI Cards -->
  {#if $stats}
    <div class="kpi-row">
      <StatCard label="Pipelines" value={formatNumber($stats.totalPipelines)} icon="&#128256;" accent="var(--cat-pipeline)" />
      <StatCard label="Sessions" value={formatNumber($stats.totalSessions)} accent="var(--color-info)" icon="&#128203;" />
      <StatCard label="Agents" value={formatNumber($stats.totalAgents)} icon="&#129302;" />
      <StatCard label="Invocations" value={formatNumber($stats.totalInvocations)} accent="var(--color-primary)" icon="&#9889;" />
    </div>
  {/if}

  <!-- Toolbar -->
  <div class="toolbar">
    <select class="filter-select" value={statusFilter} on:change={handleStatusChange}>
      <option value="">Tous les statuts</option>
      <option value="success">Success</option>
      <option value="failure">Failure</option>
      <option value="running">Running</option>
    </select>
  </div>

  <!-- Pipeline Cards Grid -->
  {#if $pipelinesLoading && !$pipelines}
    <div class="loading">Chargement des pipelines...</div>
  {:else if $pipelinesError}
    <div class="error">{$pipelinesError}</div>
  {:else if $pipelines}
    <div class="pipeline-grid">
      {#each $pipelines.data as pipeline (pipeline.sessionId)}
        <div class="pipeline-card">
          <div class="pipeline-header">
            <span class="pipeline-name mono">{pipeline.name}</span>
            <Badge variant={getStatusVariant(pipeline.status)}>
              {pipeline.status.toUpperCase()}
            </Badge>
          </div>
          <div class="pipeline-meta">
            <span class="meta-item">{formatDateTime(pipeline.startTime)}</span>
            <span class="meta-item mono">{formatDuration(pipeline.durationMs)}</span>
          </div>

          <!-- Steps Timeline -->
          <div class="steps-timeline">
            {#each pipeline.steps as step, idx}
              <div class="step-box">
                <div class="step-dot" style="background: {getStepStatusColor(step.status)};"></div>
                <span class="step-agent mono">{step.agent}</span>
                <span class="step-duration mono">{formatDuration(step.durationMs)}</span>
              </div>
              {#if idx < pipeline.steps.length - 1}
                <div class="step-connector"></div>
              {/if}
            {/each}
          </div>

          <div class="pipeline-footer">
            <span class="session-id mono">{pipeline.sessionId.slice(0, 8)}...</span>
          </div>
        </div>
      {/each}
    </div>

    {#if $pipelines.data.length === 0}
      <div class="empty">Aucun pipeline trouve.</div>
    {/if}

    <Pagination pagination={$pipelines.pagination} on:page={handlePage} />
  {/if}
</div>

<style>
  .page {
    padding: var(--space-6);
    animation: fade-in 200ms ease;
  }

  .kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }

  .filter-select {
    height: 36px;
    padding: 0 var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: 13px;
    cursor: pointer;
  }

  .filter-select:focus {
    border-color: var(--color-primary);
    outline: none;
  }

  .pipeline-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  .pipeline-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    transition: border-color var(--transition-fast);
  }

  .pipeline-card:hover {
    border-color: var(--color-border-light);
  }

  .pipeline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }

  .pipeline-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .pipeline-meta {
    display: flex;
    gap: var(--space-4);
    margin-bottom: var(--space-4);
  }

  .meta-item {
    font-size: 12px;
    color: var(--color-text-secondary);
  }

  .steps-timeline {
    display: flex;
    align-items: center;
    gap: 0;
    overflow-x: auto;
    padding: var(--space-3) 0;
  }

  .step-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    min-width: 60px;
    flex-shrink: 0;
  }

  .step-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .step-agent {
    font-size: 10px;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }

  .step-duration {
    font-size: 9px;
    color: var(--color-text-tertiary);
  }

  .step-connector {
    width: 24px;
    height: 2px;
    background: var(--color-border-light);
    flex-shrink: 0;
    margin-top: -16px;
  }

  .pipeline-footer {
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--color-border);
  }

  .session-id {
    font-size: 11px;
    color: var(--color-text-tertiary);
  }

  .loading, .error, .empty {
    padding: var(--space-10);
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 14px;
  }

  .error { color: var(--color-error); }
</style>
