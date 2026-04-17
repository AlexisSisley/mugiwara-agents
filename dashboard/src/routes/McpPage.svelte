<script lang="ts">
  import { onMount } from 'svelte';
  import { mcp, mcpLoading, mcpError, fetchMcp } from '$lib/stores';
  import Header from '$lib/components/Header.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import type { McpServer, McpPlugin } from '../../shared/types';

  // Emoji constants (avoid Svelte template unicode parse issues)
  const ICON_PLUG = '\u{1F50C}';
  const ICON_PUZZLE = '\u{1F9E9}';
  const ICON_CHECK = '\u2705';
  const ICON_CROSS = '\u274C';
  const ICON_LOCK = '\u{1F512}';
  const ICON_WRENCH = '\u{1F527}';
  const ICON_CLOUD = '\u2601\uFE0F';
  const ICON_REFRESH = '\u{1F504}';
  const ICON_HOURGLASS = '\u23F3';
  const ICON_WARN = '\u26A0\uFE0F';
  const ICON_X = '\u2715';

  let filter: 'all' | 'connected' | 'failed' | 'auth_required' = 'all';
  let selectedServer: McpServer | null = null;
  let selectedPlugin: McpPlugin | null = null;

  onMount(() => {
    fetchMcp();
  });

  $: servers = $mcp?.servers ?? [];
  $: plugins = $mcp?.plugins ?? [];
  $: stats = $mcp?.stats ?? { connected: 0, failed: 0, authRequired: 0, totalPlugins: 0, totalServers: 0 };

  $: filteredServers = filter === 'all'
    ? servers
    : servers.filter((s) => s.status === filter);

  function statusIcon(status: string): string {
    switch (status) {
      case 'connected': return ICON_CHECK;
      case 'auth_required': return ICON_LOCK;
      default: return ICON_CROSS;
    }
  }

  function statusLabel(status: string): string {
    switch (status) {
      case 'connected': return 'Connected';
      case 'auth_required': return 'Auth Required';
      default: return 'Failed';
    }
  }

  function statusVariant(status: string): 'success' | 'warning' | 'danger' {
    switch (status) {
      case 'connected': return 'success';
      case 'auth_required': return 'warning';
      default: return 'danger';
    }
  }

  function sourceIcon(source: string): string {
    switch (source) {
      case 'plugin': return ICON_PUZZLE;
      case 'cloud': return ICON_CLOUD;
      default: return ICON_WRENCH;
    }
  }

  function sourceLabel(source: string): string {
    switch (source) {
      case 'plugin': return 'Plugin';
      case 'cloud': return 'Cloud';
      default: return 'User';
    }
  }

  function transportLabel(transport: string): string {
    return transport === 'http' ? 'HTTP' : 'stdio';
  }
</script>

<Header title="MCP & PLUGINS" />

<div class="page">
  {#if $mcpLoading && !$mcp}
    <div class="kpi-row">
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
    </div>
    <div class="server-grid">
      {#each Array(6) as _}
        <Skeleton variant="card" />
      {/each}
    </div>
  {:else if $mcpError}
    <EmptyState
      icon={ICON_WARN}
      title="Erreur de chargement"
      description={$mcpError}
    />
  {:else}
    <!-- KPI Row -->
    <div class="kpi-row">
      <StatCard label="MCP Servers" value={stats.totalServers} icon={ICON_PLUG} />
      <StatCard label="Connected" value={stats.connected} icon={ICON_CHECK} />
      <StatCard label="Plugins" value={stats.totalPlugins} icon={ICON_PUZZLE} />
      <StatCard label="Failed" value={stats.failed} icon={ICON_CROSS} />
    </div>

    <!-- Filters -->
    <div class="filters-row">
      <div class="filter-group">
        <button class="filter-btn" class:active={filter === 'all'} on:click={() => filter = 'all'}>
          All ({servers.length})
        </button>
        <button class="filter-btn" class:active={filter === 'connected'} on:click={() => filter = 'connected'}>
          {ICON_CHECK} Connected ({stats.connected})
        </button>
        <button class="filter-btn" class:active={filter === 'failed'} on:click={() => filter = 'failed'}>
          {ICON_CROSS} Failed ({stats.failed})
        </button>
        <button class="filter-btn" class:active={filter === 'auth_required'} on:click={() => filter = 'auth_required'}>
          {ICON_LOCK} Auth ({stats.authRequired})
        </button>
      </div>
      <button class="refresh-btn" on:click={() => fetchMcp(true)} disabled={$mcpLoading}>
        {$mcpLoading ? ICON_HOURGLASS : ICON_REFRESH} Refresh
      </button>
    </div>

    <!-- MCP Servers Grid -->
    <section class="section">
      <h2 class="section-title">MCP Servers</h2>
      <div class="server-grid">
        {#each filteredServers as server}
          <button class="server-card" class:selected={selectedServer?.name === server.name} on:click={() => { selectedServer = server; selectedPlugin = null; }}>
            <div class="server-header">
              <span class="server-icon">{sourceIcon(server.source)}</span>
              <span class="server-name">{server.displayName}</span>
              <Badge variant={statusVariant(server.status)} size="sm">{statusLabel(server.status)}</Badge>
            </div>
            <div class="server-meta">
              <span class="meta-tag">{transportLabel(server.transport)}</span>
              <span class="meta-tag">{sourceLabel(server.source)}</span>
            </div>
            <div class="server-command">{server.command}</div>
          </button>
        {/each}
      </div>
    </section>

    <!-- Installed Plugins -->
    {#if plugins.length > 0}
      <section class="section">
        <h2 class="section-title">Installed Plugins</h2>
        <div class="plugins-grid">
          {#each plugins as plugin}
            <button class="plugin-card" class:selected={selectedPlugin?.name === plugin.name} on:click={() => { selectedPlugin = plugin; selectedServer = null; }}>
              <div class="plugin-header">
                <span class="plugin-icon">{ICON_PUZZLE}</span>
                <span class="plugin-name">{plugin.name}</span>
                <Badge variant="default" size="sm">v{plugin.version}</Badge>
              </div>
              <div class="plugin-meta">
                <span class="meta-tag">{plugin.marketplace}</span>
                <span class="meta-tag">{plugin.scope}</span>
              </div>
              <div class="plugin-servers">
                {#each plugin.mcpServers as s}
                  <span class="mini-status">{statusIcon(s.status)} {s.displayName}</span>
                {/each}
                {#if plugin.mcpServers.length === 0}
                  <span class="mini-status muted">No MCP servers</span>
                {/if}
              </div>
            </button>
          {/each}
        </div>
      </section>
    {/if}

    <!-- Detail Drawer -->
    {#if selectedServer}
      <aside class="detail-panel">
        <div class="detail-header">
          <h3>{selectedServer.displayName}</h3>
          <button class="close-btn" on:click={() => selectedServer = null} aria-label="Fermer">{ICON_X}</button>
        </div>
        <div class="detail-body">
          <div class="detail-row">
            <span class="detail-label">Status</span>
            <Badge variant={statusVariant(selectedServer.status)}>{statusLabel(selectedServer.status)}</Badge>
          </div>
          <div class="detail-row">
            <span class="detail-label">Internal Name</span>
            <span class="detail-value mono">{selectedServer.name}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Transport</span>
            <span class="detail-value">{transportLabel(selectedServer.transport)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Source</span>
            <span class="detail-value">{sourceIcon(selectedServer.source)} {sourceLabel(selectedServer.source)}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Command</span>
            <code class="detail-code">{selectedServer.command}</code>
          </div>
          {#if selectedServer.version}
            <div class="detail-row">
              <span class="detail-label">Version</span>
              <span class="detail-value">{selectedServer.version}</span>
            </div>
          {/if}
        </div>
      </aside>
    {/if}

    {#if selectedPlugin}
      <aside class="detail-panel">
        <div class="detail-header">
          <h3>{selectedPlugin.name}</h3>
          <button class="close-btn" on:click={() => selectedPlugin = null} aria-label="Fermer">{ICON_X}</button>
        </div>
        <div class="detail-body">
          <div class="detail-row">
            <span class="detail-label">Version</span>
            <span class="detail-value">{selectedPlugin.version}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Marketplace</span>
            <span class="detail-value">{selectedPlugin.marketplace}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Scope</span>
            <span class="detail-value">{selectedPlugin.scope}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Installed</span>
            <span class="detail-value">{new Date(selectedPlugin.installedAt).toLocaleDateString('fr-FR')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Last Updated</span>
            <span class="detail-value">{new Date(selectedPlugin.lastUpdated).toLocaleDateString('fr-FR')}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Install Path</span>
            <code class="detail-code">{selectedPlugin.installPath}</code>
          </div>
          {#if selectedPlugin.mcpServers.length > 0}
            <div class="detail-row">
              <span class="detail-label">MCP Servers</span>
              <div class="detail-servers-list">
                {#each selectedPlugin.mcpServers as s}
                  <div class="detail-server-item">
                    {statusIcon(s.status)} {s.displayName}
                    <Badge variant={statusVariant(s.status)} size="sm">{statusLabel(s.status)}</Badge>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </aside>
    {/if}
  {/if}
</div>

<style>
  .page {
    padding: var(--space-6);
  }

  .kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  @media (max-width: 900px) {
    .kpi-row {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .filters-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-5);
  }

  .filter-group {
    display: flex;
    gap: var(--space-2);
  }

  .filter-btn {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-3);
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: var(--font-sm);
    transition: all 0.15s ease;
  }

  .filter-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-text);
  }

  .filter-btn.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--color-bg);
  }

  .refresh-btn {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-2) var(--space-4);
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: var(--font-sm);
    transition: all 0.15s ease;
  }

  .refresh-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-text);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .section {
    margin-bottom: var(--space-8);
  }

  .section-title {
    font-family: var(--font-display);
    font-size: var(--font-lg);
    color: var(--color-text);
    margin-bottom: var(--space-4);
    letter-spacing: 0.05em;
  }

  .server-grid, .plugins-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-4);
  }

  .server-card, .plugin-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    width: 100%;
  }

  .server-card:hover, .plugin-card:hover {
    border-color: var(--color-primary);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .server-card.selected, .plugin-card.selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px var(--color-primary);
  }

  .server-header, .plugin-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .server-icon, .plugin-icon {
    font-size: 1.25rem;
  }

  .server-name, .plugin-name {
    font-weight: 600;
    color: var(--color-gold);
    flex: 1;
  }

  .server-meta, .plugin-meta {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .meta-tag {
    font-size: var(--font-xs);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: 1px var(--space-2);
    color: var(--color-text-secondary);
  }

  .server-command {
    font-family: var(--font-mono);
    font-size: var(--font-xs);
    color: var(--color-text-secondary);
    background: var(--color-bg);
    border-radius: var(--radius-sm);
    padding: var(--space-2);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .plugin-servers {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: var(--space-2);
  }

  .mini-status {
    font-size: var(--font-xs);
    color: var(--color-text-secondary);
  }

  .mini-status.muted {
    opacity: 0.5;
  }

  /* Detail Panel */
  .detail-panel {
    position: fixed;
    right: 0;
    top: var(--header-height);
    bottom: 0;
    width: 400px;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
    z-index: 50;
    overflow-y: auto;
    box-shadow: -4px 0 20px rgba(0, 0, 0, 0.2);
  }

  .detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-4) var(--space-5);
    border-bottom: 1px solid var(--color-border);
  }

  .detail-header h3 {
    font-family: var(--font-display);
    font-size: var(--font-lg);
    color: var(--color-text);
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-size: 1.25rem;
    padding: var(--space-1);
  }

  .close-btn:hover {
    color: var(--color-text);
  }

  .detail-body {
    padding: var(--space-4) var(--space-5);
  }

  .detail-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    margin-bottom: var(--space-4);
  }

  .detail-label {
    font-size: var(--font-xs);
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .detail-value {
    color: var(--color-text);
    font-size: var(--font-sm);
  }

  .detail-value.mono {
    font-family: var(--font-mono);
  }

  .detail-code {
    font-family: var(--font-mono);
    font-size: var(--font-xs);
    background: var(--color-bg);
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-sm);
    color: var(--color-primary);
    word-break: break-all;
    display: block;
  }

  .detail-servers-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .detail-server-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: var(--font-sm);
  }
</style>
