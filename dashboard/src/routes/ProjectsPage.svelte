<script lang="ts">
  import { onMount } from 'svelte';
  import {
    projects,
    projectsLoading,
    projectsError,
    fetchProjects,
    scanProjects,
    openClaude,
    openExplorer,
    runAgent,
  } from '$lib/stores';
  import Header from '$lib/components/Header.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import ProjectCard from '$lib/components/ProjectCard.svelte';
  import ProjectDetail from '$lib/components/ProjectDetail.svelte';
  import AgentPickerModal from '$lib/components/AgentPickerModal.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import type { ProjectInfo, Category } from '../../shared/types';
  import { formatRelativeTime } from '$lib/format';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { addToast } from '$lib/toast-store';

  // ── State ─────────────────────────────────────────────────────

  let search = '';
  let categoryFilter: Category | '' = '';
  let stackFilter = '';
  let sortBy: 'name' | 'lastModified' | 'category' = 'name';
  let scanning = false;

  // Detail view (replaces drawer)
  let detailProject: ProjectInfo | null = null;

  // Agent Picker Modal
  let agentModalOpen = false;
  let agentModalProject: ProjectInfo | null = null;

  // Feedback (uses global toast store)

  // ── Lifecycle ──────────────────────────────────────────────────

  onMount(() => {
    fetchProjects();
  });

  // ── Computed ───────────────────────────────────────────────────

  $: allProjects = $projects?.data ?? [];
  $: proCount = allProjects.filter((p) => p.category === 'pro').length;
  $: pocCount = allProjects.filter((p) => p.category === 'poc').length;
  $: persoCount = allProjects.filter((p) => p.category === 'perso').length;
  $: allStacks = [...new Set(allProjects.flatMap((p) => p.stack))].sort();

  // Category groups
  $: categoryGroups = [
    { key: 'pro', label: 'PRO (Sisley)', icon: '\u{1F3E2}', color: '#3B82F6', projects: allProjects.filter((p) => p.category === 'pro') },
    { key: 'poc', label: 'POC', icon: '\u{1F9EA}', color: '#F59E0B', projects: allProjects.filter((p) => p.category === 'poc') },
    { key: 'perso', label: 'PERSO', icon: '\u{1F3E0}', color: '#10B981', projects: allProjects.filter((p) => p.category === 'perso') },
  ];

  // When a category filter is active, only show that group
  $: visibleGroups = categoryFilter
    ? categoryGroups.filter((g) => g.key === categoryFilter)
    : categoryGroups;

  // ── Actions ────────────────────────────────────────────────────

  function applyFilters() {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    if (categoryFilter) params['category'] = categoryFilter;
    if (stackFilter) params['stack'] = stackFilter;
    if (sortBy) params['sort'] = sortBy;
    fetchProjects(params);
  }

  function handleSearch(e: CustomEvent<string>) {
    search = e.detail;
    applyFilters();
  }

  function handleCategoryChange() {
    applyFilters();
  }

  function handleStackChange() {
    applyFilters();
  }

  function handleSortChange() {
    applyFilters();
  }

  async function handleRescan() {
    scanning = true;
    await scanProjects();
    scanning = false;
    showFeedback('Scan termine !');
  }

  function handleSelectProject(e: CustomEvent<ProjectInfo>) {
    detailProject = e.detail;
  }

  async function handleOpenClaude(e: CustomEvent<ProjectInfo>) {
    const ok = await openClaude(e.detail.name);
    showFeedback(ok ? `Claude ouvert dans ${e.detail.name}` : 'Erreur lors de l\'ouverture');
  }

  async function handleOpenYolo(e: CustomEvent<ProjectInfo>) {
    const ok = await openClaude(e.detail.name, true);
    showFeedback(ok ? `Claude YOLO ouvert dans ${e.detail.name}` : 'Erreur lors de l\'ouverture');
  }

  async function handleExplore(e: CustomEvent<ProjectInfo>) {
    const ok = await openExplorer(e.detail.name);
    showFeedback(ok ? `Explorateur ouvert pour ${e.detail.name}` : 'Erreur lors de l\'ouverture');
  }

  function handleRunAgent(e: CustomEvent<ProjectInfo>) {
    agentModalProject = e.detail;
    agentModalOpen = true;
  }

  async function handleAgentRun(e: CustomEvent<{ agent: string; message: string }>) {
    if (!agentModalProject) return;
    const ok = await runAgent(agentModalProject.name, e.detail.agent, e.detail.message);
    agentModalOpen = false;
    showFeedback(
      ok ? `Agent ${e.detail.agent} lance sur ${agentModalProject.name}` : 'Erreur lors du lancement'
    );
  }

  function handleDetailBack() {
    detailProject = null;
  }

  function showFeedback(msg: string) {
    const isError = msg.toLowerCase().includes('erreur');
    addToast(msg, isError ? 'error' : 'success');
  }
</script>

<Header title="PROJECTS" />

<div class="page">
  {#if $projectsLoading && !$projects}
    <div class="kpi-row">
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
    </div>
    <div class="projects-grid" style="margin-top: var(--space-4);">
      <Skeleton variant="card" height="180px" />
      <Skeleton variant="card" height="180px" />
      <Skeleton variant="card" height="180px" />
      <Skeleton variant="card" height="180px" />
      <Skeleton variant="card" height="180px" />
      <Skeleton variant="card" height="180px" />
    </div>
  {:else if $projectsError}
    <div class="error">{$projectsError}</div>
  {:else if detailProject}
    <!-- Project Detail View -->
    <ProjectDetail
      project={detailProject}
      on:back={handleDetailBack}
      on:open-claude={handleOpenClaude}
      on:open-yolo={handleOpenYolo}
      on:run-agent={handleRunAgent}
      on:explore={handleExplore}
    />
  {:else}
    <!-- KPI Row -->
    <div class="kpi-row">
      <StatCard label="Total Projets" value={allProjects.length} icon="&#x1F4C1;" accent="var(--color-accent)" />
      <StatCard label="Pro (Sisley)" value={proCount} icon="&#x1F3E2;" accent="#3B82F6" />
      <StatCard label="POC" value={pocCount} icon="&#x1F9EA;" accent="#F59E0B" />
      <StatCard label="Perso" value={persoCount} icon="&#x1F3E0;" accent="#10B981" />
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <SearchInput
        placeholder="Rechercher un projet..."
        on:search={handleSearch}
      />

      <select class="filter-select" bind:value={categoryFilter} on:change={handleCategoryChange}>
        <option value="">Toutes categories</option>
        <option value="pro">Pro</option>
        <option value="poc">POC</option>
        <option value="perso">Perso</option>
      </select>

      <select class="filter-select" bind:value={stackFilter} on:change={handleStackChange}>
        <option value="">Toutes stacks</option>
        {#each allStacks as stack}
          <option value={stack}>{stack}</option>
        {/each}
      </select>

      <select class="filter-select" bind:value={sortBy} on:change={handleSortChange}>
        <option value="name">Tri: Nom</option>
        <option value="lastModified">Tri: Derniere modif</option>
        <option value="category">Tri: Categorie</option>
      </select>

      <button class="btn-rescan" on:click={handleRescan} disabled={scanning}>
        {scanning ? 'Scan...' : 'Re-scan'}
      </button>
    </div>

    <!-- Scan info -->
    {#if $projects}
      <div class="scan-info">
        <span class="scan-dirs mono">{$projects.scanDirs.join(' | ')}</span>
        {#if $projects.lastScan}
          <span class="scan-time">Dernier scan: {formatRelativeTime($projects.lastScan)}</span>
        {/if}
      </div>
    {/if}

    <!-- Projects grouped by category -->
    {#if allProjects.length === 0}
      <EmptyState
        icon={'\u{1F4C1}'}
        title="Aucun projet detecte"
        subtitle="Verifiez la configuration des dossiers de scan ou ajoutez un projet manuellement."
        actionLabel="Re-scan"
        on:action={handleRescan}
      />
    {:else}
      {#each visibleGroups as group (group.key)}
        {#if group.projects.length > 0}
          <div class="category-group">
            <div class="category-header" style="--cat-color: {group.color};">
              <div class="category-accent-bar"></div>
              <span class="category-icon">{group.icon}</span>
              <h3 class="category-title manga">{group.label}</h3>
              <span class="category-count">{group.projects.length}</span>
            </div>
            <div class="projects-grid">
              {#each group.projects as project (project.path)}
                <ProjectCard
                  {project}
                  on:open={handleOpenClaude}
                  on:open-yolo={handleOpenYolo}
                  on:run-agent={handleRunAgent}
                  on:select={handleSelectProject}
                  on:explore={handleExplore}
                />
              {/each}
            </div>
          </div>
        {/if}
      {/each}
    {/if}
  {/if}
</div>

<!-- Agent Picker Modal -->
<AgentPickerModal
  open={agentModalOpen}
  project={agentModalProject}
  on:close={() => { agentModalOpen = false; }}
  on:run={handleAgentRun}
/>

<style>
  .page {
    padding: var(--space-6);
    position: relative;
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
    box-shadow: 0 0 0 3px rgba(201, 168, 76, 0.15);
  }

  .btn-rescan {
    background: var(--color-gold);
    color: #09090B;
    border: none;
    border-radius: var(--radius-md);
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    padding: var(--space-2) var(--space-4);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .btn-rescan:hover:not(:disabled) {
    background: var(--color-gold-light);
    transform: translateY(-1px);
    box-shadow: var(--shadow-md);
  }

  .btn-rescan:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .scan-info {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: 11px;
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-5);
  }

  .scan-dirs {
    opacity: 0.7;
  }

  /* ── Category Groups ──────────────────────────────────────── */

  .category-group {
    margin-bottom: var(--space-6);
  }

  .category-header {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
    position: relative;
    padding-left: var(--space-4);
  }

  .category-accent-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    border-radius: 2px;
    background: var(--cat-color);
  }

  .category-icon {
    font-size: 20px;
  }

  .category-title {
    font-size: 18px;
    font-weight: 400;
    color: var(--color-text-primary);
    letter-spacing: 0.04em;
  }

  .category-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
    height: 24px;
    padding: 0 6px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 700;
    color: var(--cat-color);
    background: color-mix(in srgb, var(--cat-color) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--cat-color) 30%, transparent);
  }

  .projects-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--space-4);
  }

  @media (max-width: 1100px) {
    .projects-grid {
      grid-template-columns: 1fr;
    }
    .kpi-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .error {
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    color: #F87171;
    border-radius: var(--radius-md);
    padding: var(--space-4);
    text-align: center;
  }
</style>
