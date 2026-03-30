<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { activeRoute, crew, projects } from '$lib/stores';

  const dispatch = createEventDispatcher();

  let open = false;
  let query = '';
  let selectedIndex = 0;
  let inputEl: HTMLInputElement;

  interface PaletteItem {
    id: string;
    label: string;
    subtitle: string;
    icon: string;
    action: () => void;
  }

  // Static pages
  const pages: PaletteItem[] = [
    { id: 'page-overview', label: 'Overview', subtitle: 'Tableau de Bord', icon: '\u{1F9ED}', action: () => navigate('/') },
    { id: 'page-crew', label: 'Crew', subtitle: "L'Equipage", icon: '\u{1F465}', action: () => navigate('/crew') },
    { id: 'page-orchestrator', label: 'Orchestrator', subtitle: 'One Piece', icon: '\u{1F9E0}', action: () => navigate('/orchestrator') },
    { id: 'page-pipelines', label: 'Pipelines', subtitle: 'Expeditions', icon: '\u{1F680}', action: () => navigate('/pipelines') },
    { id: 'page-projects', label: 'Projects', subtitle: 'Iles Visitees', icon: '\u{1F4C1}', action: () => navigate('/projects') },
    { id: 'page-reports', label: 'Reports', subtitle: 'Journal de Bord', icon: '\u{1F4DC}', action: () => navigate('/reports') },
    { id: 'page-mcp', label: 'MCP & Plugins', subtitle: 'Den Den Mushi', icon: '\u{1F50C}', action: () => navigate('/mcp') },
  ];

  function navigate(path: string) {
    window.location.hash = `#${path}`;
    activeRoute.set(path);
    close();
  }

  $: crewItems = ($crew?.members ?? []).slice(0, 20).map((m) => ({
    id: `crew-${m.name}`,
    label: m.name,
    subtitle: `${m.type} - ${m.description?.slice(0, 50) ?? ''}`,
    icon: m.type === 'subagent' ? '\u{2B50}' : m.type === 'pipeline' ? '\u{1F680}' : '\u{2699}',
    action: () => { navigate('/crew'); },
  }));

  $: projectItems = ($projects?.projects ?? []).slice(0, 15).map((p) => ({
    id: `project-${p.name}`,
    label: p.name,
    subtitle: `${p.stack?.join(', ') ?? 'Unknown stack'}`,
    icon: '\u{1F4C2}',
    action: () => { navigate('/projects'); },
  }));

  $: allItems = [...pages, ...crewItems, ...projectItems];

  $: filtered = query.trim() === ''
    ? pages
    : allItems.filter((item) => {
        const q = query.toLowerCase();
        return item.label.toLowerCase().includes(q)
          || item.subtitle.toLowerCase().includes(q);
      }).slice(0, 12);

  $: if (selectedIndex >= filtered.length) {
    selectedIndex = Math.max(0, filtered.length - 1);
  }

  function handleKeydown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      open = !open;
      if (open) {
        query = '';
        selectedIndex = 0;
        requestAnimationFrame(() => inputEl?.focus());
      }
      return;
    }

    if (!open) return;

    if (e.key === 'Escape') {
      close();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      const item = filtered[selectedIndex];
      if (item) item.action();
      return;
    }
  }

  function close() {
    open = false;
    query = '';
    selectedIndex = 0;
  }

  function handleBackdropClick() {
    close();
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
  });

  onDestroy(() => {
    window.removeEventListener('keydown', handleKeydown);
  });
</script>

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="palette-backdrop" on:click={handleBackdropClick} role="presentation">
    <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-noninteractive-element-interactions -->
    <div class="palette" on:click|stopPropagation role="dialog" aria-label="Palette de commandes">
      <div class="palette-input-wrapper">
        <span class="palette-search-icon">{'\u{1F50D}'}</span>
        <input
          bind:this={inputEl}
          bind:value={query}
          class="palette-input"
          type="text"
          placeholder="Rechercher une page, un agent, un projet..."
          autocomplete="off"
          spellcheck="false"
        />
        <kbd class="palette-kbd">ESC</kbd>
      </div>

      <div class="palette-results">
        {#each filtered as item, i}
          <!-- svelte-ignore a11y-click-events-have-key-events a11y-interactive-supports-focus -->
          <div
            class="palette-item"
            class:selected={i === selectedIndex}
            on:click={() => item.action()}
            on:mouseenter={() => { selectedIndex = i; }}
            role="option"
            tabindex="-1"
            aria-selected={i === selectedIndex}
          >
            <span class="palette-item-icon">{item.icon}</span>
            <div class="palette-item-text">
              <span class="palette-item-label">{item.label}</span>
              <span class="palette-item-subtitle">{item.subtitle}</span>
            </div>
          </div>
        {/each}
        {#if filtered.length === 0}
          <div class="palette-empty">Aucun resultat pour "{query}"</div>
        {/if}
      </div>

      <div class="palette-footer">
        <span><kbd>{'\u2191'}</kbd><kbd>{'\u2193'}</kbd> naviguer</span>
        <span><kbd>{'\u23CE'}</kbd> selectionner</span>
        <span><kbd>esc</kbd> fermer</span>
      </div>
    </div>
  </div>
{/if}

<style>
  .palette-backdrop {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 15vh;
    animation: fade-in 150ms ease;
  }

  .palette {
    width: 560px;
    max-width: 90vw;
    background: var(--color-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
    overflow: hidden;
    animation: palette-pop 200ms ease;
  }

  @keyframes palette-pop {
    from { transform: scale(0.95) translateY(-10px); opacity: 0; }
    to { transform: scale(1) translateY(0); opacity: 1; }
  }

  .palette-input-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-4);
    border-bottom: 1px solid var(--glass-border);
  }

  .palette-search-icon {
    font-size: 18px;
    flex-shrink: 0;
  }

  .palette-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-family: var(--font-ui);
    font-size: 16px;
    color: var(--color-text-primary);
  }

  .palette-input::placeholder {
    color: var(--color-text-tertiary);
  }

  .palette-kbd {
    padding: 2px 6px;
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-text-tertiary);
  }

  .palette-results {
    max-height: 360px;
    overflow-y: auto;
  }

  .palette-item {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    cursor: pointer;
    transition: background 100ms ease;
    color: var(--color-text-secondary);
  }

  .palette-item:hover,
  .palette-item.selected {
    background: var(--color-gold-dim);
    color: var(--color-gold);
  }

  .palette-item.selected {
    border-left: 3px solid var(--color-gold);
    padding-left: calc(var(--space-4) - 3px);
  }

  .palette-item-icon {
    font-size: 20px;
    width: 28px;
    text-align: center;
    flex-shrink: 0;
  }

  .palette-item-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .palette-item-label {
    font-family: var(--font-ui, sans-serif);
    font-size: 15px;
    color: inherit;
    letter-spacing: 0.5px;
  }

  .palette-item-subtitle {
    font-size: 11px;
    color: var(--color-text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .palette-empty {
    padding: var(--space-6);
    text-align: center;
    color: var(--color-text-tertiary);
    font-size: 13px;
  }

  .palette-footer {
    display: flex;
    align-items: center;
    gap: var(--space-4);
    padding: var(--space-2) var(--space-4);
    border-top: 1px solid var(--glass-border);
    font-size: 11px;
    color: var(--color-text-tertiary);
  }

  .palette-footer kbd {
    padding: 1px 4px;
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 10px;
    color: var(--color-text-tertiary);
  }
</style>
