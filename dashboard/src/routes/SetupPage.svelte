<script lang="ts">
  import { onMount } from 'svelte';
  import {
    setup,
    setupLoading,
    setupError,
    fetchSetup,
    togglePlugin,
  } from '$lib/stores';
  import Header from '$lib/components/Header.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import { truncate } from '$lib/format';

  onMount(() => {
    fetchSetup();
  });

  $: enabledCount = $setup?.plugins.filter((p) => p.enabled).length ?? 0;
  $: totalPlugins = $setup?.plugins.length ?? 0;

  let togglingPlugins = new Set<string>();

  async function handleToggle(name: string, currentEnabled: boolean) {
    if (togglingPlugins.has(name)) return;
    togglingPlugins.add(name);
    togglingPlugins = togglingPlugins; // trigger reactivity
    await togglePlugin(name, !currentEnabled);
    togglingPlugins.delete(name);
    togglingPlugins = togglingPlugins;
  }
</script>

<Header title="SETUP" />

<div class="page">
  {#if $setupLoading && !$setup}
    <div class="loading">
      <span class="loading-icon anim-spin">{'\u{1F300}'}</span>
      Chargement de la configuration...
    </div>
  {:else if $setupError}
    <div class="error">{$setupError}</div>
  {:else if $setup}
    <!-- KPI Cards -->
    <div class="kpi-row">
      <StatCard label="SubAgents" value={$setup.subAgents.length} icon={'\u{1F916}'} accent="var(--color-accent)" />
      <StatCard label="MCP Servers" value={$setup.mcpServers.length} icon={'\u{1F50C}'} accent="var(--color-secondary)" />
      <StatCard label="Plugins" value="{enabledCount} / {totalPlugins}" icon={'\u{1F9E9}'} accent="var(--cat-pipeline)" />
    </div>

    <!-- SubAgents Section -->
    <section class="section">
      <h2 class="section-title manga">SUBAGENTS</h2>
      <p class="section-sub">Custom agents definis dans ~/.claude/agents/</p>
      {#if $setup.subAgents.length === 0}
        <div class="empty">Aucun subagent installe.</div>
      {:else}
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Description</th>
                <th>Model</th>
                <th>Color</th>
              </tr>
            </thead>
            <tbody>
              {#each $setup.subAgents as agent}
                <tr class="data-row">
                  <td>
                    <span class="name-tag">{agent.name}</span>
                  </td>
                  <td class="desc-cell">{truncate(agent.description, 120)}</td>
                  <td>
                    <span class="model-badge">{agent.model}</span>
                  </td>
                  <td>
                    <span class="color-dot" style="background: {getAgentColor(agent.color)};"></span>
                    {agent.color}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>

    <!-- MCP Servers Section -->
    <section class="section">
      <h2 class="section-title manga">MCP SERVERS</h2>
      <p class="section-sub">Serveurs Model Context Protocol dans ~/.claude/.mcp.json</p>
      {#if $setup.mcpServers.length === 0}
        <div class="empty">Aucun serveur MCP configure.</div>
      {:else}
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Command</th>
                <th>Args</th>
                <th>Env</th>
              </tr>
            </thead>
            <tbody>
              {#each $setup.mcpServers as server}
                <tr class="data-row">
                  <td>
                    <span class="name-tag">{server.name}</span>
                  </td>
                  <td class="mono">{server.command}</td>
                  <td class="mono args-cell">{server.args.join(' ')}</td>
                  <td>
                    {#if Object.keys(server.env).length > 0}
                      {#each Object.keys(server.env) as key}
                        <span class="env-badge">{key}</span>
                      {/each}
                    {:else}
                      <span class="no-env">--</span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>

    <!-- Plugins Section -->
    <section class="section">
      <h2 class="section-title manga">PLUGINS</h2>
      <p class="section-sub">Plugins du marketplace Claude Code</p>
      {#if $setup.plugins.length === 0}
        <div class="empty">Aucun plugin disponible.</div>
      {:else}
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Statut</th>
                <th>Nom</th>
                <th>Description</th>
                <th>Auteur</th>
              </tr>
            </thead>
            <tbody>
              {#each $setup.plugins as plugin}
                <tr class="data-row" class:plugin-disabled={!plugin.enabled}>
                  <td class="col-status">
                    <button
                      class="toggle-switch"
                      class:toggle-on={plugin.enabled}
                      class:toggle-loading={togglingPlugins.has(plugin.name)}
                      disabled={togglingPlugins.has(plugin.name)}
                      on:click={() => handleToggle(plugin.name, plugin.enabled)}
                      title={plugin.enabled ? 'Désactiver' : 'Activer'}
                    >
                      <span class="toggle-knob"></span>
                    </button>
                  </td>
                  <td>
                    <span class="name-tag">{plugin.name}</span>
                  </td>
                  <td class="desc-cell">{truncate(plugin.description, 100)}</td>
                  <td>{plugin.author || '--'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    </section>
  {/if}
</div>

<script context="module" lang="ts">
  function getAgentColor(color: string): string {
    const map: Record<string, string> = {
      yellow: '#FACC15',
      blue: '#38BDF8',
      red: '#E63946',
      green: '#4ADE80',
      purple: '#A78BFA',
      orange: '#FB923C',
      pink: '#F472B6',
      gray: '#94A3B8',
    };
    return map[color] ?? '#94A3B8';
  }
</script>

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

  .section {
    margin-bottom: var(--space-8);
  }

  .section-title {
    font-size: 18px;
    color: var(--color-primary);
    letter-spacing: 0.06em;
    margin-bottom: var(--space-1);
  }

  .section-sub {
    font-size: 12px;
    color: var(--color-text-tertiary);
    margin-bottom: var(--space-4);
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
    transition: all var(--transition-fast);
  }

  .data-row:hover {
    background: var(--color-surface-hover);
  }

  .plugin-disabled {
    opacity: 0.6;
  }

  .name-tag {
    display: inline-block;
    padding: 2px 10px;
    background: var(--color-surface-active);
    border: 1px solid var(--color-border-light);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 700;
    color: var(--color-secondary);
  }

  .model-badge {
    display: inline-block;
    padding: 2px 8px;
    background: var(--color-info-bg);
    border: 1px solid rgba(52, 152, 219, 0.4);
    border-radius: var(--radius-md);
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    color: var(--color-info);
    text-transform: uppercase;
  }

  .color-dot {
    display: inline-block;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-right: 4px;
    vertical-align: middle;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .desc-cell {
    color: var(--color-text-secondary);
    max-width: 400px;
  }

  .args-cell {
    font-size: 11px;
    max-width: 300px;
    word-break: break-all;
    color: var(--color-text-secondary);
  }

  .env-badge {
    display: inline-block;
    padding: 1px 6px;
    background: var(--color-warning-bg);
    border: 1px solid rgba(241, 196, 15, 0.4);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    color: var(--color-warning);
    margin: 1px 2px;
  }

  .no-env {
    color: var(--color-text-tertiary);
  }

  .col-status {
    width: 100px;
    text-align: center;
  }

  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 40px;
    height: 22px;
    background: var(--color-text-tertiary);
    border: none;
    border-radius: 11px;
    cursor: pointer;
    transition: background 200ms ease;
    padding: 0;
    vertical-align: middle;
  }

  .toggle-switch:hover {
    opacity: 0.85;
  }

  .toggle-switch.toggle-on {
    background: var(--color-success, #4ADE80);
  }

  .toggle-switch.toggle-loading {
    opacity: 0.5;
    cursor: wait;
  }

  .toggle-knob {
    position: absolute;
    top: 3px;
    left: 3px;
    width: 16px;
    height: 16px;
    background: #fff;
    border-radius: 50%;
    transition: transform 200ms ease;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  .toggle-on .toggle-knob {
    transform: translateX(18px);
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
</style>
