<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    agents,
    agentsLoading,
    agentsError,
    fetchAgents,
    fetchStats,
    stats,
    startPolling,
    stopPolling,
  } from '$lib/stores';
  import Header from '$lib/components/Header.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import CategoryTag from '$lib/components/CategoryTag.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import Drawer from '$lib/components/Drawer.svelte';
  import { formatRelativeTime, formatNumber } from '$lib/format';
  import type { AgentStats, AgentCategory } from '../../shared/types';

  let search = '';
  let categoryFilter = '';
  let sortBy = 'name';
  let sortOrder = 'asc';
  let currentPage = 1;
  let selectedAgent: AgentStats | null = null;

  const categories: AgentCategory[] = [
    'pipeline', 'analysis', 'architecture', 'security', 'qa',
    'writing', 'debugging', 'management', 'data', 'devops',
    'refactoring', 'router', 'meta', 'performance', 'intelligence',
  ];

  function buildParams(): Record<string, string> {
    const params: Record<string, string> = {
      page: String(currentPage),
      limit: '20',
      sort: sortBy,
      order: sortOrder,
    };
    if (search) params['search'] = search;
    if (categoryFilter) params['category'] = categoryFilter;
    return params;
  }

  async function reload() {
    await Promise.all([fetchAgents(buildParams()), fetchStats()]);
  }

  function handleSearch(e: CustomEvent<string>) {
    search = e.detail;
    currentPage = 1;
    reload();
  }

  function handleCategoryChange(e: Event) {
    categoryFilter = (e.target as HTMLSelectElement).value;
    currentPage = 1;
    reload();
  }

  function handleSort(col: string) {
    if (sortBy === col) {
      sortOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = col;
      sortOrder = 'asc';
    }
    reload();
  }

  function handlePage(e: CustomEvent<number>) {
    currentPage = e.detail;
    reload();
  }

  function selectAgent(agent: AgentStats) {
    selectedAgent = agent;
  }

  function getSmokeVariant(status: string): 'pass' | 'fail' | 'idle' {
    if (status === 'pass') return 'pass';
    if (status === 'fail') return 'fail';
    return 'idle';
  }

  onMount(() => {
    startPolling(reload);
  });

  onDestroy(() => {
    stopPolling();
  });
</script>

<Header title="AGENTS" />

<div class="page">
  <!-- KPI Cards -->
  {#if $stats}
    <div class="kpi-row">
      <StatCard label="Nakama" value={formatNumber($stats.totalAgents)} icon={'\u{1F465}'} />
      <StatCard label="Invocations" value={formatNumber($stats.totalInvocations)} accent="var(--color-accent)" icon={'\u{26A1}'} />
      <StatCard
        label="Smoke Pass"
        value={formatNumber($stats.smokeTests.pass)}
        accent="var(--color-success)"
        icon={'\u2705'}
      />
      <StatCard
        label="Smoke Fail"
        value={formatNumber($stats.smokeTests.fail)}
        accent="var(--color-error)"
        icon={'\u274C'}
      />
    </div>
  {/if}

  <!-- Toolbar -->
  <div class="toolbar">
    <SearchInput placeholder="Rechercher un nakama..." on:input={handleSearch} />
    <select class="filter-select" value={categoryFilter} on:change={handleCategoryChange}>
      <option value="">Toutes categories</option>
      {#each categories as cat}
        <option value={cat}>{cat}</option>
      {/each}
    </select>
  </div>

  <!-- Table -->
  {#if $agentsLoading && !$agents}
    <div class="loading">
      <span class="loading-icon anim-spin">{'\u{1F300}'}</span>
      Chargement des agents...
    </div>
  {:else if $agentsError}
    <div class="error">{$agentsError}</div>
  {:else if $agents}
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-status">Statut</th>
            <th class="col-name sortable" on:click={() => handleSort('name')}>
              Nom {sortBy === 'name' ? (sortOrder === 'asc' ? '\u25B2' : '\u25BC') : ''}
            </th>
            <th class="col-desc">Description</th>
            <th class="col-cat sortable" on:click={() => handleSort('category')}>
              Cat. {sortBy === 'category' ? (sortOrder === 'asc' ? '\u25B2' : '\u25BC') : ''}
            </th>
            <th class="col-ver">Version</th>
            <th class="col-inv sortable" on:click={() => handleSort('invocations')}>
              Invoc. {sortBy === 'invocations' ? (sortOrder === 'asc' ? '\u25B2' : '\u25BC') : ''}
            </th>
            <th class="col-last sortable" on:click={() => handleSort('lastInvocation')}>
              Derniere {sortBy === 'lastInvocation' ? (sortOrder === 'asc' ? '\u25B2' : '\u25BC') : ''}
            </th>
          </tr>
        </thead>
        <tbody>
          {#each $agents.data as agent (agent.name)}
            <tr
              class="data-row"
              class:selected={selectedAgent?.name === agent.name}
              on:click={() => selectAgent(agent)}
            >
              <td class="col-status">
                <Badge variant={getSmokeVariant(agent.smokeTestStatus)} small />
              </td>
              <td class="col-name mono">{agent.name}</td>
              <td class="col-desc truncate">{agent.description}</td>
              <td class="col-cat"><CategoryTag category={agent.category} /></td>
              <td class="col-ver mono">{agent.version}</td>
              <td class="col-inv mono">{agent.invocationCount}</td>
              <td class="col-last">{formatRelativeTime(agent.lastInvocation)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <Pagination pagination={$agents.pagination} on:page={handlePage} />
  {/if}
</div>

<!-- Agent Detail Drawer -->
<Drawer open={selectedAgent !== null} title={selectedAgent?.name ?? ''} width="400px" on:close={() => { selectedAgent = null; }}>
  {#if selectedAgent}
    <div class="drawer-content">
      <div class="detail-row">
        <span class="detail-label">Categorie</span>
        <CategoryTag category={selectedAgent.category} />
      </div>
      <div class="detail-row">
        <span class="detail-label">Version</span>
        <span class="mono detail-value">{selectedAgent.version}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Description</span>
        <p class="detail-desc">{selectedAgent.description}</p>
      </div>
      <div class="detail-divider"></div>
      <div class="detail-row">
        <span class="detail-label">Smoke Tests</span>
        <Badge variant={getSmokeVariant(selectedAgent.smokeTestStatus)} />
      </div>
      <div class="detail-row">
        <span class="detail-label">Invocations</span>
        <span class="mono detail-value">{formatNumber(selectedAgent.invocationCount)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Derniere invocation</span>
        <span class="detail-value">{formatRelativeTime(selectedAgent.lastInvocation)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Dernier smoke test</span>
        <span class="detail-value">{formatRelativeTime(selectedAgent.lastSmokeTest)}</span>
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
    transition: all var(--transition-fast);
  }

  .filter-select:focus {
    border-color: var(--color-secondary);
    outline: none;
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15);
  }

  .table-wrapper {
    overflow-x: auto;
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-md);
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .data-table thead {
    background: var(--color-bg-alt);
  }

  .data-table th {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    font-weight: 700;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-secondary);
    border-bottom: 2px solid var(--color-border);
    white-space: nowrap;
    font-family: var(--font-ui);
  }

  .data-table th.sortable {
    cursor: pointer;
    user-select: none;
  }

  .data-table th.sortable:hover {
    color: var(--color-primary);
  }

  .data-table td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .data-row {
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .data-row:hover {
    background: var(--color-surface-hover);
  }

  .data-row.selected {
    background: var(--color-surface-active);
    border-left: 4px solid var(--color-primary);
    box-shadow: inset 0 0 20px rgba(230, 57, 70, 0.05);
  }

  .col-status { width: 70px; text-align: center; }
  .col-name { width: 140px; color: var(--color-secondary); }
  .col-desc { max-width: 300px; }
  .col-cat { width: 120px; }
  .col-ver { width: 80px; }
  .col-inv { width: 80px; text-align: right; }
  .col-last { width: 120px; }

  .loading, .error {
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

  .drawer-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
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
  }

  .detail-desc {
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .detail-divider {
    height: 2px;
    background: linear-gradient(90deg, var(--color-border), transparent);
    margin: var(--space-1) 0;
  }
</style>
