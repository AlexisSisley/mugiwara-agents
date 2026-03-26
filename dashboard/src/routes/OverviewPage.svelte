<script lang="ts">
  import { onMount } from 'svelte';
  import {
    overview,
    overviewLoading,
    overviewError,
    fetchOverview,
  } from '$lib/stores';
  import Header from '$lib/components/Header.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import Sparkline from '$lib/components/Sparkline.svelte';
  import Heatmap from '$lib/components/Heatmap.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import { formatRelativeTime } from '$lib/format';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

  onMount(() => {
    fetchOverview();
  });

  $: kpis = $overview?.kpis;
  $: sparklines = $overview?.sparklines;
  $: heatmap = $overview?.heatmap ?? [];
  $: feed = $overview?.activityFeed ?? [];
</script>

<Header title="OVERVIEW" />

<div class="page">
  {#if $overviewLoading && !$overview}
    <div class="kpi-row">
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
    </div>
    <div style="margin-top: var(--space-4);">
      <Skeleton variant="card" height="200px" />
    </div>
    <div style="margin-top: var(--space-4);">
      <Skeleton variant="table-row" count={5} />
    </div>
  {:else if $overviewError}
    <div class="error">{$overviewError}</div>
  {:else if $overview}
    <!-- KPI Row -->
    <div class="kpi-row">
      <StatCard label="Invocations" value={kpis?.totalInvocations ?? 0} icon="&#x1F680;" accent="var(--color-primary)" />
      <StatCard label="Sessions" value={kpis?.totalSessions ?? 0} icon="&#x1F4CB;" accent="var(--color-secondary)" />
      <StatCard label="Agents Actifs" value={kpis?.uniqueAgents ?? 0} icon="&#x1F464;" accent="var(--color-accent)" />
      <StatCard label="Projets" value={kpis?.activeProjects ?? 0} icon="&#x1F4C1;" accent="#818CF8" />
    </div>

    <!-- Sparklines Row -->
    <div class="sparklines-row">
      <div class="sparkline-card">
        <div class="sparkline-header">
          <span class="sparkline-title manga">INVOCATIONS 7J</span>
          <span class="sparkline-total mono">{sparklines?.invocations7d.reduce((a, b) => a + b, 0) ?? 0}</span>
        </div>
        <Sparkline data={sparklines?.invocations7d ?? []} color="var(--color-primary)" width={280} height={48} />
      </div>
      <div class="sparkline-card">
        <div class="sparkline-header">
          <span class="sparkline-title manga">SESSIONS 7J</span>
          <span class="sparkline-total mono">{sparklines?.sessions7d.reduce((a, b) => a + b, 0) ?? 0}</span>
        </div>
        <Sparkline data={sparklines?.sessions7d ?? []} color="var(--color-accent)" width={280} height={48} />
      </div>
    </div>

    <!-- Heatmap -->
    <div class="heatmap-section">
      <h3 class="section-title manga">HEATMAP ACTIVITE (7 JOURS)</h3>
      <div class="heatmap-card">
        <Heatmap data={heatmap} color="var(--color-primary)" />
      </div>
    </div>

    <!-- Activity Feed -->
    <div class="feed-section">
      <h3 class="section-title manga">ACTIVITE RECENTE</h3>
      {#if feed.length === 0}
        <EmptyState
          icon={'\u{1F9ED}'}
          title="Aucune activite"
          subtitle="Lance un agent pour commencer l'aventure !"
        />
      {:else}
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Agent</th>
                <th>Projet</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {#each feed as item}
                <tr class="data-row">
                  <td>
                    {#if item.type === 'invocation'}
                      <Badge variant="pass" small>Invocation</Badge>
                    {:else if item.type === 'session_start'}
                      <Badge variant="running" small>Session</Badge>
                    {:else}
                      <Badge variant="warning" small>Fin</Badge>
                    {/if}
                  </td>
                  <td>
                    {#if item.agent}
                      <span class="agent-tag">{item.agent}</span>
                    {:else}
                      <span class="text-muted">--</span>
                    {/if}
                  </td>
                  <td>
                    {#if item.project}
                      <span class="project-tag">{item.project}</span>
                    {:else}
                      <span class="text-muted">--</span>
                    {/if}
                  </td>
                  <td class="mono">{formatRelativeTime(item.timestamp)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </div>
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

  .sparklines-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .sparkline-card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: var(--space-4) var(--space-5);
    box-shadow: var(--shadow-md);
  }

  .sparkline-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-3);
  }

  .sparkline-title {
    font-size: 14px;
    color: var(--color-text-primary);
    letter-spacing: 1px;
  }

  .sparkline-total {
    font-size: 18px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .heatmap-section {
    margin-bottom: var(--space-6);
  }

  .section-title {
    font-size: 16px;
    color: var(--color-text-secondary);
    letter-spacing: 0.06em;
    margin-bottom: var(--space-3);
    text-shadow: none;
  }

  .heatmap-card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: var(--space-4) var(--space-5);
    box-shadow: var(--shadow-md);
    overflow-x: auto;
  }

  .feed-section {
    margin-bottom: var(--space-6);
  }

  .table-wrapper {
    overflow-x: auto;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-md);
    overflow: hidden;
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .data-table thead {
    background: rgba(255,255,255,0.03);
  }

  .data-table th {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-tertiary);
    border-bottom: 1px solid var(--glass-border);
    white-space: nowrap;
  }

  .data-table td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid rgba(255,255,255,0.04);
    vertical-align: middle;
  }

  .data-row {
    transition: all var(--transition-fast);
  }

  .data-row:hover {
    background: var(--color-gold-dim);
  }

  .agent-tag {
    display: inline-block;
    padding: 2px 8px;
    background: rgba(201,168,76,0.12);
    border: 1px solid rgba(201,168,76,0.25);
    color: var(--color-gold);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
  }

  .project-tag {
    display: inline-block;
    padding: 2px 8px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--color-accent);
    background: rgba(52,211,153,0.08);
    border: 1px solid rgba(52,211,153,0.2);
    border-radius: var(--radius-sm);
  }

  .text-muted {
    color: var(--color-text-tertiary);
  }

  .error {
    background: rgba(248,113,113,0.1);
    border: 1px solid rgba(248,113,113,0.3);
    color: #F87171;
    border-radius: var(--radius-md);
    padding: var(--space-4);
    text-align: center;
  }

  @media (max-width: 1100px) {
    .kpi-row { grid-template-columns: repeat(2, 1fr); }
    .sparklines-row { grid-template-columns: 1fr; }
  }
</style>
