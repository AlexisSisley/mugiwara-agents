<script lang="ts">
  import { stats, statsLoading } from '../stores';
  import { formatRelativeTime } from '../format';

  export let title: string;
</script>

<header class="header">
  <h1 class="header-title">{title}</h1>
  <div class="header-meta">
    {#if $statsLoading}
      <span class="header-status">
        <span class="dot anim-pulse" style="background: var(--color-primary);"></span>
        Chargement...
      </span>
    {:else if $stats}
      <span class="header-status">
        <span class="dot anim-pulse" style="background: var(--color-success);"></span>
        Derniere activite: {formatRelativeTime($stats.lastActivity)}
      </span>
    {/if}
  </div>
</header>

<style>
  .header {
    position: fixed;
    top: 0;
    left: var(--sidebar-width);
    right: 0;
    height: var(--header-height);
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-6);
    z-index: 40;
  }

  .header-title {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.2;
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .header-status {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
