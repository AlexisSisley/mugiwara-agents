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

  function getStepIcon(status: string): string {
    if (status === 'success') return '\u2705';
    if (status === 'failure') return '\u274C';
    if (status === 'running') return '\u{1F7E2}';
    return '\u26AA';
  }

  onMount(() => {
    startPolling(reload);
  });

  onDestroy(() => {
    stopPolling();
  });
</script>

<Header title="PIPELINES" />

<div class="page">
  <!-- KPI Cards -->
  {#if $stats}
    <div class="kpi-row">
      <StatCard label="Pipelines" value={formatNumber($stats.totalPipelines)} icon={'\u{1F680}'} accent="var(--cat-pipeline)" />
      <StatCard label="Sessions" value={formatNumber($stats.totalSessions)} accent="var(--color-accent)" icon={'\u{1F4CB}'} />
      <StatCard label="Nakama" value={formatNumber($stats.totalAgents)} icon={'\u{1F465}'} />
      <StatCard label="Invocations" value={formatNumber($stats.totalInvocations)} accent="var(--color-secondary)" icon={'\u{26A1}'} />
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
    <div class="loading">
      <span class="loading-icon anim-spin">{'\u{1F300}'}</span>
      Chargement des pipelines...
    </div>
  {:else if $pipelinesError}
    <div class="error">{$pipelinesError}</div>
  {:else if $pipelines}
    <div class="pipeline-grid">
      {#each $pipelines.data as pipeline (pipeline.sessionId)}
        <div class="pipeline-card">
          <div class="card-accent-bar" style="background: {getStepStatusColor(pipeline.status)};"></div>
          <div class="card-content">
            <div class="pipeline-header">
              <div class="pipeline-name-group">
                <span class="pipeline-icon">{'\u{1F680}'}</span>
                <span class="pipeline-name manga">{pipeline.name}</span>
              </div>
              <Badge variant={getStatusVariant(pipeline.status)}>
                {pipeline.status.toUpperCase()}
              </Badge>
            </div>
            <div class="pipeline-meta">
              <span class="meta-item">{formatDateTime(pipeline.startTime)}</span>
              <span class="meta-item mono meta-duration">{formatDuration(pipeline.durationMs)}</span>
            </div>

            <!-- Steps Timeline -->
            <div class="steps-timeline">
              {#each pipeline.steps as step, idx}
                <div class="step-box" style="--step-color: {getStepStatusColor(step.status)};">
                  <div class="step-status">{getStepIcon(step.status)}</div>
                  <span class="step-agent mono">{step.agent}</span>
                  <span class="step-duration mono">{formatDuration(step.durationMs)}</span>
                </div>
                {#if idx < pipeline.steps.length - 1}
                  <div class="step-connector">
                    <span class="connector-arrow">{'\u{27A1}'}</span>
                  </div>
                {/if}
              {/each}
            </div>

            <div class="pipeline-footer">
              <span class="session-id mono">{pipeline.sessionId.slice(0, 8)}...</span>
            </div>
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
    animation: fade-in 250ms ease;
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
    height: 38px;
    padding: 0 var(--space-3);
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: 13px;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
  }

  .filter-select:focus {
    border-color: var(--color-secondary);
    outline: none;
  }

  .pipeline-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  .pipeline-card {
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-md);
  }

  .pipeline-card:hover {
    border-color: var(--color-border-strong);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .card-accent-bar {
    height: 4px;
  }

  .card-content {
    padding: var(--space-5);
  }

  .pipeline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }

  .pipeline-name-group {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .pipeline-icon {
    font-size: 16px;
    opacity: 0.6;
  }

  .pipeline-name {
    font-size: 18px;
    color: var(--color-text-primary);
    letter-spacing: 0.04em;
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

  .meta-duration {
    color: var(--color-secondary);
    font-weight: 600;
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
    min-width: 64px;
    flex-shrink: 0;
    padding: var(--space-2);
    border-radius: var(--radius-md);
    border: 1px solid color-mix(in srgb, var(--step-color) 30%, transparent);
    background: color-mix(in srgb, var(--step-color) 8%, transparent);
  }

  .step-status {
    font-size: 12px;
    color: var(--step-color);
  }

  .step-agent {
    font-size: 10px;
    color: var(--color-text-secondary);
    white-space: nowrap;
    font-weight: 600;
  }

  .step-duration {
    font-size: 9px;
    color: var(--color-text-tertiary);
  }

  .step-connector {
    display: flex;
    align-items: center;
    padding: 0 2px;
    margin-top: -14px;
  }

  .connector-arrow {
    font-size: 8px;
    color: var(--color-secondary);
    opacity: 0.6;
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
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
  }

  .loading-icon {
    font-size: 20px;
    display: inline-block;
  }

  .error { color: var(--color-error); }
</style>
