<script lang="ts">
  import { onMount } from 'svelte';
  import {
    crew,
    crewLoading,
    crewError,
    fetchCrew,
  } from '$lib/stores';
  import Header from '$lib/components/Header.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import AgentCard from '$lib/components/AgentCard.svelte';
  import Drawer from '$lib/components/Drawer.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import type { CrewMember, CrewType } from '../../shared/types';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { formatRelativeTime } from '$lib/format';

  let search = '';
  let typeFilter: CrewType | '' = '';
  let sortBy: 'name' | 'invocations' | 'lastUsed' = 'invocations';
  let selectedMember: CrewMember | null = null;

  onMount(() => {
    fetchCrew();
  });

  $: members = $crew?.members ?? [];
  $: byType = $crew?.byType ?? { subagents: 0, skills: 0, pipelines: 0 };

  function applyFilters() {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    if (typeFilter) params['type'] = typeFilter;
    if (sortBy) params['sort'] = sortBy;
    fetchCrew(params);
  }

  function handleSearch(e: CustomEvent<string>) {
    search = e.detail;
    applyFilters();
  }

  function handleTypeChange() { applyFilters(); }
  function handleSortChange() { applyFilters(); }

  function handleSelectMember(e: CustomEvent<CrewMember>) {
    selectedMember = e.detail;
  }
</script>

<Header title="CREW" />

<div class="page">
  {#if $crewLoading && !$crew}
    <div class="kpi-row">
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
    </div>
    <div class="cards-grid" style="margin-top: var(--space-4);">
      <Skeleton variant="card" height="180px" />
      <Skeleton variant="card" height="180px" />
      <Skeleton variant="card" height="180px" />
      <Skeleton variant="card" height="180px" />
      <Skeleton variant="card" height="180px" />
      <Skeleton variant="card" height="180px" />
    </div>
  {:else if $crewError}
    <div class="error">{$crewError}</div>
  {:else if $crew}
    <!-- KPI Row -->
    <div class="kpi-row">
      <StatCard label="Total Agents" value={$crew.total} icon="&#x1F464;" accent="var(--color-accent)" />
      <StatCard label="Subagents" value={byType.subagents} icon="&#x1F916;" accent="#3B82F6" />
      <StatCard label="Skills" value={byType.skills} icon="&#x2699;&#xFE0F;" accent="var(--color-secondary)" />
      <StatCard label="Pipelines" value={byType.pipelines} icon="&#x1F680;" accent="#818CF8" />
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <SearchInput placeholder="Rechercher un agent..." on:search={handleSearch} />
      <select class="filter-select" bind:value={typeFilter} on:change={handleTypeChange}>
        <option value="">Tous les types</option>
        <option value="subagent">Subagents</option>
        <option value="skill">Skills</option>
        <option value="pipeline">Pipelines</option>
      </select>
      <select class="filter-select" bind:value={sortBy} on:change={handleSortChange}>
        <option value="invocations">Tri: Plus utilise</option>
        <option value="name">Tri: Nom</option>
        <option value="lastUsed">Tri: Dernier usage</option>
      </select>
    </div>

    <!-- Agent Cards Grid -->
    {#if members.length === 0}
      <EmptyState
        icon={'\u{1F465}'}
        title="Aucun nakama detecte"
        subtitle="Verifie que registry.yaml est present et correctement configure."
      />
    {:else}
      <div class="crew-grid">
        {#each members as member (member.name)}
          <AgentCard {member} on:select={handleSelectMember} />
        {/each}
      </div>
    {/if}
  {/if}
</div>

<!-- Detail Drawer -->
<Drawer
  open={selectedMember !== null}
  title="Detail Agent"
  width="520px"
  on:close={() => { selectedMember = null; }}
>
  {#if selectedMember}
    <div class="drawer-content">
      <div class="detail-header">
        <span class="detail-name manga">{selectedMember.name}</span>
        <Badge variant={selectedMember.elevated ? 'pass' : 'warning'} small>
          {selectedMember.type}
        </Badge>
      </div>

      <p class="detail-desc">{selectedMember.description}</p>

      <div class="detail-meta">
        <div class="meta-row">
          <span class="meta-label">Categorie</span>
          <span class="meta-value">{selectedMember.category}</span>
        </div>
        <div class="meta-row">
          <span class="meta-label">Version</span>
          <span class="meta-value mono">{selectedMember.version}</span>
        </div>
        {#if selectedMember.aliasOf}
          <div class="meta-row">
            <span class="meta-label">Alias de</span>
            <span class="meta-value">{selectedMember.aliasOf}</span>
          </div>
        {/if}
      </div>

      <div class="detail-stats">
        <h4 class="detail-section-title manga">STATISTIQUES</h4>
        <div class="stats-grid">
          <div class="stat-block">
            <span class="stat-number">{selectedMember.stats.totalInvocations}</span>
            <span class="stat-text">Invocations totales</span>
          </div>
          <div class="stat-block">
            <span class="stat-number">{selectedMember.stats.last7d}</span>
            <span class="stat-text">7 derniers jours</span>
          </div>
          <div class="stat-block">
            <span class="stat-number">{selectedMember.stats.lastUsed ? formatRelativeTime(selectedMember.stats.lastUsed) : '--'}</span>
            <span class="stat-text">Dernier usage</span>
          </div>
        </div>
      </div>

      {#if selectedMember.stats.topProjects.length > 0}
        <div class="detail-projects">
          <h4 class="detail-section-title manga">TOP PROJETS</h4>
          <div class="project-list">
            {#each selectedMember.stats.topProjects as proj}
              <span class="project-chip">{proj}</span>
            {/each}
          </div>
        </div>
      {/if}
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
    margin-bottom: var(--space-5);
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
    transition: border-color var(--transition-fast);
  }

  .filter-select:focus {
    outline: none;
    border-color: var(--color-gold);
    box-shadow: 0 0 0 3px rgba(201,168,76,0.15);
  }

  .crew-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  /* ── Drawer Content ─────────────────────────────────────── */

  .drawer-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .detail-name {
    font-size: 24px;
    color: var(--color-text-primary);
    letter-spacing: 1px;
  }

  .detail-desc {
    font-size: 13px;
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0;
  }

  .detail-meta {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3) 0;
    border-top: 1px solid var(--glass-border);
    border-bottom: 1px solid var(--glass-border);
  }

  .meta-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
  }

  .meta-label {
    color: var(--color-text-tertiary);
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.05em;
  }

  .meta-value {
    color: var(--color-text-primary);
  }

  .detail-section-title {
    font-size: 14px;
    color: var(--color-gold);
    letter-spacing: 0.06em;
    margin-bottom: var(--space-2);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-3);
  }

  .stat-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-3);
    background: rgba(255,255,255,0.04);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
  }

  .stat-number {
    font-family: var(--font-mono);
    font-size: 18px;
    font-weight: 700;
    color: var(--color-text-primary);
  }

  .stat-text {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
    text-align: center;
  }

  .project-list {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .project-chip {
    display: inline-block;
    padding: 2px 10px;
    font-family: var(--font-mono);
    font-size: 12px;
    color: var(--color-accent);
    background: rgba(52,211,153,0.08);
    border: 1px solid rgba(52,211,153,0.2);
    border-radius: var(--radius-sm);
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
    .crew-grid { grid-template-columns: 1fr; }
    .kpi-row { grid-template-columns: repeat(2, 1fr); }
  }
</style>
