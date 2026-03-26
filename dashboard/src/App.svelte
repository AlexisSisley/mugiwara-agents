<script lang="ts">
  import { onMount } from 'svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import OverviewPage from './routes/OverviewPage.svelte';
  import CrewPage from './routes/CrewPage.svelte';
  import OrchestratorPage from './routes/OrchestratorPage.svelte';
  import PipelinesPage from './routes/PipelinesPage.svelte';
  import ProjectsPage from './routes/ProjectsPage.svelte';
  import ReportsPage from './routes/ReportsPage.svelte';
  import { activeRoute } from '$lib/stores';

  function parseHash(): string {
    const hash = window.location.hash.replace('#', '') || '/';
    return hash;
  }

  function handleHashChange() {
    activeRoute.set(parseHash());
  }

  onMount(() => {
    activeRoute.set(parseHash());
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  });
</script>

<div class="app-layout">
  <Sidebar />
  <main class="main-content">
    {#if $activeRoute === '/'}
      <OverviewPage />
    {:else if $activeRoute === '/crew'}
      <CrewPage />
    {:else if $activeRoute === '/orchestrator'}
      <OrchestratorPage />
    {:else if $activeRoute === '/pipelines'}
      <PipelinesPage />
    {:else if $activeRoute === '/projects'}
      <ProjectsPage />
    {:else if $activeRoute === '/reports'}
      <ReportsPage />
    {:else}
      <OverviewPage />
    {/if}
  </main>
</div>

<ToastContainer />
<CommandPalette />

<style>
  .app-layout {
    display: flex;
    min-height: 100vh;
    background: var(--color-bg);
    position: relative;
  }

  .main-content {
    margin-left: var(--sidebar-width);
    margin-top: var(--header-height);
    flex: 1;
    max-width: var(--content-max-width);
    width: calc(100% - var(--sidebar-width));
    position: relative;
    z-index: 1;
  }
</style>
