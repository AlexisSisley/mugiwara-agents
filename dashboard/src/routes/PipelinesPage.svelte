<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    pipelines,
    pipelinesLoading,
    pipelinesError,
    fetchPipelines,
    startPolling,
    stopPolling,
  } from '$lib/stores';
  import Header from '$lib/components/Header.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import { formatDuration, formatDateTime, formatNumber } from '$lib/format';
  import type { PipelineRun, PipelineStatus } from '../../shared/types';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

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
    await fetchPipelines(buildParams());
  }

  // Derive stats from pipelines data
  $: pipelineData = $pipelines?.data ?? [];
  $: totalPipelines = $pipelines?.total ?? 0;
  $: successCount = pipelineData.filter((p) => p.status === 'success').length;
  $: failureCount = pipelineData.filter((p) => p.status === 'failure').length;
  $: uniqueNames = new Set(pipelineData.map((p) => p.name)).size;

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
  {#if $pipelines}
    <div class="kpi-row">
      <StatCard label="Total Executions" value={formatNumber(totalPipelines)} icon={'\u{1F680}'} accent="var(--cat-pipeline)" />
      <StatCard label="Success" value={formatNumber(successCount)} accent="var(--color-accent)" icon={'\u{2705}'} />
      <StatCard label="Echecs" value={formatNumber(failureCount)} accent="var(--color-error)" icon={'\u{274C}'} />
      <StatCard label="Pipelines Uniques" value={formatNumber(uniqueNames)} accent="var(--color-secondary)" icon={'\u{1F4CB}'} />
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
    <div class="kpi-row">
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
    </div>
    <div style="margin-top: var(--space-4);">
      <Skeleton variant="table-row" count={5} />
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
      <EmptyState
        icon={'\u{1F680}'}
        title="Aucune expedition"
        subtitle="Les pipelines apparaitront ici une fois que tu auras lance des expeditions Mugiwara."
      />
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
    background: var(--color-bg-alt);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: 13px;
    cursor: pointer;
  }

  .filter-select:focus {
    border-color: var(--color-gold);
    outline: none;
    box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.15);
  }

  .pipeline-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  .pipeline-card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    overflow: hidden;
    transition: all var(--transition-fast);
  }

  .pipeline-card:hover {
    border-color: rgba(201, 168, 76, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  }

  .card-accent-bar {
    height: 4px;
    border-radius: var(--radius-xl) var(--radius-xl) 0 0;
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
    color: var(--color-gold);
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
    border: 1px solid color-mix(in srgb, var(--step-color) 30%, var(--glass-border));
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
    color: var(--color-gold);
    opacity: 0.5;
  }

  .pipeline-footer {
    margin-top: var(--space-3);
    padding-top: var(--space-3);
    border-top: 1px solid var(--glass-border);
  }

  .session-id {
    font-size: 11px;
    color: var(--color-text-tertiary);
  }

  .error {
    padding: var(--space-10);
    text-align: center;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    color: #F87171;
    border-radius: var(--radius-md);
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
  }
</style>
