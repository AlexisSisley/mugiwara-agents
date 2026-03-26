<script lang="ts">
  import { onMount } from 'svelte';
  import {
    orchestratorStats,
    orchestratorHistory,
    orchestratorLoading,
    orchestratorError,
    fetchOrchestratorStats,
    fetchOrchestratorHistory,
  } from '$lib/stores';
  import Header from '$lib/components/Header.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import ConfidenceDonut from '$lib/components/ConfidenceDonut.svelte';
  import Sparkline from '$lib/components/Sparkline.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Drawer from '$lib/components/Drawer.svelte';
  import { truncate, formatRelativeTime } from '$lib/format';
  import type { OrchestratorDecision, ConfidenceLevel } from '../../shared/types';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';

  let search = '';
  let agentFilter = '';
  let projectFilter = '';
  let confidenceFilter: ConfidenceLevel | '' = '';
  let selectedDecision: OrchestratorDecision | null = null;

  onMount(() => {
    fetchOrchestratorStats();
    fetchOrchestratorHistory();
  });

  $: stats = $orchestratorStats;
  $: decisions = $orchestratorHistory?.decisions ?? [];
  $: total = $orchestratorHistory?.total ?? 0;

  // Derive unique agents/projects for filters
  $: uniqueAgents = [...new Set(decisions.map((d) => d.routeAgent).filter(Boolean))].sort();
  $: uniqueProjects = [...new Set(decisions.map((d) => d.project).filter(Boolean))].sort();

  $: hauteCount = stats?.confidenceDistribution.haute ?? 0;
  $: moyenneCount = stats?.confidenceDistribution.moyenne ?? 0;
  $: basseCount = stats?.confidenceDistribution.basse ?? 0;
  $: hautePct = stats?.totalDecisions
    ? Math.round((hauteCount / stats.totalDecisions) * 100)
    : 0;

  function applyFilters() {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    if (agentFilter) params['agent'] = agentFilter;
    if (projectFilter) params['project'] = projectFilter;
    if (confidenceFilter) params['confidence'] = confidenceFilter;
    fetchOrchestratorHistory(params);
  }

  function handleSearch(e: CustomEvent<string>) {
    search = e.detail;
    applyFilters();
  }

  function handleFilterChange() { applyFilters(); }

  function getConfianceBadge(c: string): 'pass' | 'warning' | 'fail' {
    if (c === 'haute') return 'pass';
    if (c === 'moyenne') return 'warning';
    return 'fail';
  }

  function getResultBadge(r: string): 'pass' | 'fail' | 'running' {
    if (r === 'succes') return 'pass';
    if (r === 'echec') return 'fail';
    return 'running';
  }
</script>

<Header title="ORCHESTRATOR" />

<div class="page">
  {#if $orchestratorLoading && !$orchestratorStats}
    <div class="kpi-row">
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
    </div>
    <div class="charts-row" style="margin-top: var(--space-4);">
      <Skeleton variant="card" height="200px" />
      <Skeleton variant="card" height="200px" />
    </div>
    <div style="margin-top: var(--space-4);">
      <Skeleton variant="table-row" count={5} />
    </div>
  {:else if $orchestratorError}
    <div class="error">{$orchestratorError}</div>
  {:else}
    <!-- KPI Row -->
    <div class="kpi-row">
      <StatCard label="Decisions" value={stats?.totalDecisions ?? 0} icon="&#x1F9E0;" accent="var(--color-primary)" />
      <StatCard label="Confiance Haute" value="{hautePct}%" icon="&#x2705;" accent="var(--color-accent)" />
      <StatCard
        label="Top Agent"
        value={stats?.topAgents?.[0]?.name ?? '--'}
        icon="&#x1F947;"
        accent="var(--color-secondary)"
      />
      <StatCard
        label="Top Projet"
        value={stats?.topProjects?.[0]?.name ?? '--'}
        icon="&#x1F4C1;"
        accent="#818CF8"
      />
    </div>

    <!-- Charts Row -->
    <div class="charts-row">
      <div class="chart-card">
        <h3 class="section-title manga">DISTRIBUTION CONFIANCE</h3>
        <ConfidenceDonut
          haute={hauteCount}
          moyenne={moyenneCount}
          basse={basseCount}
        />
      </div>
      <div class="chart-card">
        <h3 class="section-title manga">DECISIONS 7J</h3>
        <Sparkline
          data={stats?.dailyDecisions7d ?? []}
          color="var(--color-primary)"
          width={300}
          height={80}
        />
      </div>
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <SearchInput placeholder="Rechercher dans les decisions..." on:search={handleSearch} />
      <select class="filter-select" bind:value={agentFilter} on:change={handleFilterChange}>
        <option value="">Tous les agents</option>
        {#each uniqueAgents as a}
          <option value={a}>{a}</option>
        {/each}
      </select>
      <select class="filter-select" bind:value={projectFilter} on:change={handleFilterChange}>
        <option value="">Tous les projets</option>
        {#each uniqueProjects as p}
          <option value={p}>{p}</option>
        {/each}
      </select>
      <select class="filter-select" bind:value={confidenceFilter} on:change={handleFilterChange}>
        <option value="">Toute confiance</option>
        <option value="haute">Haute</option>
        <option value="moyenne">Moyenne</option>
        <option value="basse">Basse</option>
      </select>
    </div>

    <!-- History Table -->
    {#if decisions.length === 0}
      <EmptyState
        icon={'\u{1F9E0}'}
        title="Aucune decision"
        subtitle="L'orchestrateur One Piece n'a pas encore enregistre de decisions de routage."
      />
    {:else}
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Confiance</th>
              <th>Resultat</th>
              <th>Demande</th>
              <th>Agent</th>
              <th>Projet</th>
            </tr>
          </thead>
          <tbody>
            {#each decisions as decision}
              <tr
                class="data-row"
                class:selected={selectedDecision === decision}
                on:click={() => { selectedDecision = decision; }}
              >
                <td class="mono">{formatRelativeTime(decision.timestamp)}</td>
                <td class="col-center">
                  <Badge variant={getConfianceBadge(decision.confidence)} small>
                    {decision.confidence}
                  </Badge>
                </td>
                <td class="col-center">
                  <Badge variant={getResultBadge(decision.result)} small>
                    {decision.result}
                  </Badge>
                </td>
                <td>{truncate(decision.demande, 60)}</td>
                <td>
                  <span class="agent-tag">{decision.routeAgent}</span>
                </td>
                <td class="mono">{truncate(decision.project, 20)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  {/if}
</div>

<!-- Detail Drawer -->
<Drawer
  open={selectedDecision !== null}
  title="Detail Decision"
  width="520px"
  on:close={() => { selectedDecision = null; }}
>
  {#if selectedDecision}
    <div class="drawer-content">
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value mono">{selectedDecision.timestamp}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Demande</span>
        <span class="detail-value">{selectedDecision.demande}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Agent Route</span>
        <span class="detail-value">{selectedDecision.routeAgent}</span>
      </div>
      <div class="detail-badges">
        <div class="detail-badge-group">
          <span class="detail-label">Confiance</span>
          <Badge variant={getConfianceBadge(selectedDecision.confidence)}>
            {selectedDecision.confidence}
          </Badge>
        </div>
        <div class="detail-badge-group">
          <span class="detail-label">Resultat</span>
          <Badge variant={getResultBadge(selectedDecision.result)}>
            {selectedDecision.result}
          </Badge>
        </div>
      </div>
      <div class="detail-row">
        <span class="detail-label">Sujet</span>
        <span class="detail-value">{selectedDecision.sujet}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Projet</span>
        <span class="detail-value mono">{selectedDecision.project}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Detail Resultat</span>
        <span class="detail-value">{selectedDecision.resultDetail}</span>
      </div>
      <div class="detail-row contexte-row">
        <span class="detail-label">Contexte</span>
        <span class="detail-value contexte-text">{selectedDecision.contexte}</span>
      </div>
    </div>
  {/if}
</Drawer>

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

  .charts-row {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .chart-card {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
    box-shadow: var(--shadow-md);
  }

  .section-title {
    font-size: 14px;
    color: var(--color-text-secondary);
    letter-spacing: 0.06em;
    margin-bottom: var(--space-4);
    text-shadow: none;
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
  }

  .filter-select {
    background: var(--color-bg-alt);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: 13px;
    padding: var(--space-2) var(--space-3);
    cursor: pointer;
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--color-gold);
    box-shadow: 0 0 0 3px rgba(201,168,76,0.15);
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
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .data-row:hover {
    background: var(--color-gold-dim);
  }

  .data-row.selected {
    background: rgba(201,168,76,0.08);
    border-left: 4px solid var(--color-gold);
    box-shadow: none;
  }

  .col-center { text-align: center; }

  .agent-tag {
    display: inline-block;
    padding: 2px 8px;
    background: rgba(201,168,76,0.12);
    border: 1px solid rgba(201,168,76,0.25);
    color: var(--color-gold);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
  }

  /* Drawer styles */
  .drawer-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .detail-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .detail-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-tertiary);
  }

  .detail-value {
    color: var(--color-text-primary);
    font-size: 14px;
    line-height: 1.5;
  }

  .detail-badges {
    display: flex;
    gap: var(--space-6);
  }

  .detail-badge-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .contexte-row {
    margin-top: var(--space-2);
    padding-top: var(--space-4);
    border-top: 1px solid var(--glass-border);
  }

  .contexte-text {
    font-style: italic;
    color: var(--color-text-secondary);
  }

  .error {
    background: rgba(248,113,113,0.1);
    border: 1px solid rgba(248,113,113,0.3);
    color: #F87171;
    border-radius: var(--radius-md);
    padding: var(--space-10);
    text-align: center;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
  }

  @media (max-width: 1100px) {
    .kpi-row { grid-template-columns: repeat(2, 1fr); }
    .charts-row { grid-template-columns: 1fr; }
  }
</style>
