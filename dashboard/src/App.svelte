<script lang="ts">
  import { onMount } from 'svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import AgentsPage from './routes/AgentsPage.svelte';
  import PipelinesPage from './routes/PipelinesPage.svelte';
  import SessionsPage from './routes/SessionsPage.svelte';
  import MemoryPage from './routes/MemoryPage.svelte';
  import SetupPage from './routes/SetupPage.svelte';
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
      <AgentsPage />
    {:else if $activeRoute === '/pipelines'}
      <PipelinesPage />
    {:else if $activeRoute === '/sessions'}
      <SessionsPage />
    {:else if $activeRoute === '/memory'}
      <MemoryPage />
    {:else if $activeRoute === '/setup'}
      <SetupPage />
    {:else}
      <AgentsPage />
    {/if}
  </main>
</div>

<style>
  .app-layout {
    display: flex;
    min-height: 100vh;
    background-image:
      radial-gradient(circle at 15% 80%, rgba(230, 57, 70, 0.02) 0%, transparent 40%),
      radial-gradient(circle at 85% 20%, rgba(56, 189, 248, 0.02) 0%, transparent 40%);
  }

  .main-content {
    margin-left: var(--sidebar-width);
    margin-top: var(--header-height);
    flex: 1;
    max-width: var(--content-max-width);
    width: calc(100% - var(--sidebar-width));
    position: relative;
  }
</style>
