<script lang="ts">
  import { onMount } from 'svelte';
  import {
    memory,
    memoryLoading,
    memoryError,
    fetchMemory,
  } from '$lib/stores';
  import Header from '$lib/components/Header.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import Drawer from '$lib/components/Drawer.svelte';
  import { truncate } from '$lib/format';
  import type { MemoryEntry } from '../../shared/types';

  let search = '';
  let projetFilter = '';
  let routeFilter = '';
  let confianceFilter = '';
  let selectedEntry: MemoryEntry | null = null;

  function buildParams(): Record<string, string> {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    if (projetFilter) params['projet'] = projetFilter;
    if (routeFilter) params['route'] = routeFilter;
    if (confianceFilter) params['confiance'] = confianceFilter;
    return params;
  }

  async function reload() {
    await fetchMemory(buildParams());
  }

  function handleSearch(e: CustomEvent<string>) {
    search = e.detail;
    reload();
  }

  function handleProjetChange(e: Event) {
    projetFilter = (e.target as HTMLSelectElement).value;
    reload();
  }

  function handleRouteChange(e: Event) {
    routeFilter = (e.target as HTMLSelectElement).value;
    reload();
  }

  function handleConfianceChange(e: Event) {
    confianceFilter = (e.target as HTMLSelectElement).value;
    reload();
  }

  function getConfianceBadge(confiance: string): 'pass' | 'warning' | 'fail' {
    if (confiance === 'haute') return 'pass';
    if (confiance === 'moyenne') return 'warning';
    return 'fail';
  }

  function getResultBadge(resultat: string): 'pass' | 'fail' | 'running' {
    if (resultat === 'succes') return 'pass';
    if (resultat === 'echec') return 'fail';
    return 'running';
  }

  function getResultLabel(resultat: string): string {
    if (resultat === 'succes') return 'Succes';
    if (resultat === 'echec') return 'Echec';
    return 'En cours';
  }

  // Derive unique values for filter dropdowns
  $: projets = $memory
    ? [...new Set($memory.entries.map((e) => e.projet).filter(Boolean))].sort()
    : [];

  $: routes = $memory
    ? [...new Set($memory.entries.map((e) => e.routeAgent).filter(Boolean))].sort()
    : [];

  // KPI computations
  $: totalEntries = $memory?.total ?? 0;
  $: lastAgent = $memory?.entries?.[0]?.routeAgent ?? '--';
  $: topProjet = (() => {
    if (!$memory?.entries?.length) return '--';
    const counts: Record<string, number> = {};
    for (const e of $memory.entries) {
      if (e.projet) counts[e.projet] = (counts[e.projet] ?? 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] ?? '--';
  })();

  onMount(() => {
    reload();
  });
</script>

<Header title="MEMORY" />

<div class="page">
  <!-- KPI Cards -->
  <div class="kpi-row">
    <StatCard label="Sessions" value={totalEntries} icon={'\u{1F9E0}'} accent="var(--color-accent)" />
    <StatCard label="Dernier Agent" value={lastAgent} icon={'\u{1F916}'} accent="var(--color-secondary)" />
    <StatCard label="Top Projet" value={truncate(topProjet, 18)} icon={'\u{1F4C1}'} accent="var(--cat-pipeline)" />
  </div>

  <!-- Toolbar -->
  <div class="toolbar">
    <SearchInput placeholder="Rechercher dans demande / sujet..." on:input={handleSearch} />
    <select class="filter-select" on:change={handleRouteChange}>
      <option value="">Tous les agents</option>
      {#each routes as r}
        <option value={r}>{r}</option>
      {/each}
    </select>
    <select class="filter-select" on:change={handleProjetChange}>
      <option value="">Tous les projets</option>
      {#each projets as p}
        <option value={p}>{p}</option>
      {/each}
    </select>
    <select class="filter-select" on:change={handleConfianceChange}>
      <option value="">Confiance</option>
      <option value="haute">Haute</option>
      <option value="moyenne">Moyenne</option>
      <option value="basse">Basse</option>
    </select>
  </div>

  <!-- Content -->
  {#if $memoryLoading && !$memory}
    <div class="loading">
      <span class="loading-icon anim-spin">{'\u{1F300}'}</span>
      Chargement de la memoire...
    </div>
  {:else if $memoryError}
    <div class="error">{$memoryError}</div>
  {:else if $memory && !$memory.fileExists}
    <div class="empty-state">
      <span class="empty-icon">{'\u{1F9E0}'}</span>
      <p class="manga">AUCUNE MEMOIRE</p>
      <p class="empty-sub">Le fichier one_piece_memory.md n'existe pas encore. Utilisez One Piece pour creer des sessions.</p>
    </div>
  {:else if $memory}
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-date">Date</th>
            <th class="col-confiance">Confiance</th>
            <th class="col-resultat">Resultat</th>
            <th class="col-demande">Demande</th>
            <th class="col-route">Agent</th>
            <th class="col-projet">Projet</th>
          </tr>
        </thead>
        <tbody>
          {#each $memory.entries as entry, idx (idx)}
            <tr
              class="data-row"
              class:selected={selectedEntry === entry}
              on:click={() => { selectedEntry = entry; }}
            >
              <td class="col-date mono">{entry.date}</td>
              <td class="col-confiance">
                <Badge variant={getConfianceBadge(entry.confiance)} small>
                  {entry.confiance}
                </Badge>
              </td>
              <td class="col-resultat">
                <Badge variant={getResultBadge(entry.resultat)} small>
                  {getResultLabel(entry.resultat)}
                </Badge>
              </td>
              <td class="col-demande">{truncate(entry.demande, 80)}</td>
              <td class="col-route">
                <span class="agent-tag">{entry.routeAgent}</span>
              </td>
              <td class="col-projet mono">{truncate(entry.projet, 25)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if $memory.entries.length === 0}
      <div class="empty">Aucune entree correspondante.</div>
    {/if}
  {/if}
</div>

<!-- Detail Drawer -->
<Drawer
  open={selectedEntry !== null}
  title="Detail Memoire"
  width="520px"
  on:close={() => { selectedEntry = null; }}
>
  {#if selectedEntry}
    <div class="drawer-content">
      <div class="detail-row">
        <span class="detail-label">Date</span>
        <span class="detail-value mono">{selectedEntry.date}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Demande</span>
        <span class="detail-value">{selectedEntry.demande}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Route</span>
        <span class="detail-value">{selectedEntry.route}</span>
      </div>
      <div class="detail-badges">
        <div class="detail-badge-group">
          <span class="detail-label">Confiance</span>
          <Badge variant={getConfianceBadge(selectedEntry.confiance)}>
            {selectedEntry.confiance}
          </Badge>
        </div>
        <div class="detail-badge-group">
          <span class="detail-label">Resultat</span>
          <Badge variant={getResultBadge(selectedEntry.resultat)}>
            {getResultLabel(selectedEntry.resultat)}
          </Badge>
        </div>
      </div>
      <div class="detail-row">
        <span class="detail-label">Sujet</span>
        <span class="detail-value">{selectedEntry.sujet}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Projet</span>
        <span class="detail-value mono">{selectedEntry.projet}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Detail Resultat</span>
        <span class="detail-value">{selectedEntry.resultatDetail}</span>
      </div>
      <div class="detail-row contexte-row">
        <span class="detail-label">Contexte pour la suite</span>
        <span class="detail-value contexte-text">{selectedEntry.contexte}</span>
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
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
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
    box-shadow: var(--shadow-sm);
    transition: all var(--transition-fast);
    cursor: pointer;
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

  .col-date { width: 150px; }
  .col-confiance { width: 100px; text-align: center; }
  .col-resultat { width: 100px; text-align: center; }
  .col-demande { min-width: 200px; }
  .col-route { width: 120px; }
  .col-projet { width: 150px; }

  .agent-tag {
    display: inline-block;
    padding: 2px 8px;
    background: var(--color-surface-active);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-secondary);
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

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-12) var(--space-6);
    text-align: center;
    color: var(--color-text-secondary);
  }

  .empty-icon {
    font-size: 64px;
    margin-bottom: var(--space-4);
    opacity: 0.4;
  }

  .empty-state .manga {
    font-size: 20px;
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-2);
  }

  .empty-sub {
    font-size: 13px;
    color: var(--color-text-tertiary);
    max-width: 400px;
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
    border-top: 2px solid var(--color-border);
  }

  .contexte-text {
    font-style: italic;
    color: var(--color-text-secondary);
  }
</style>
