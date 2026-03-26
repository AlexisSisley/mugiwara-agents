<script lang="ts">
  import { overview, overviewLoading } from '../stores';
  import { formatRelativeTime } from '../format';

  export let title: string;

  // Derive last activity from overview feed
  $: lastActivity = $overview?.activityFeed?.[0]?.timestamp ?? null;
</script>

<header class="header">
  <h2 class="header-title manga">{title}</h2>
  <div class="header-status">
    {#if $overviewLoading && !$overview}
      <span class="status-dot loading"></span>
      <span class="status-text">Chargement...</span>
    {:else}
      <span class="status-dot online"></span>
      <span class="status-text gold">Operationnel</span>
      {#if lastActivity}
        <span class="status-time">{formatRelativeTime(lastActivity)}</span>
      {/if}
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
    background: rgba(9,9,11,0.8);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(255,255,255,0.06);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-8);
    z-index: 40;
  }

  .header-title {
    font-size: 24px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .header-status {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 500;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-dot.online {
    background: var(--color-success);
    box-shadow: 0 0 8px rgba(52,211,153,0.5);
  }

  .status-dot.loading {
    background: var(--color-gold);
    animation: pulse-live 2s ease-in-out infinite;
  }

  .status-text {
    color: var(--color-text-secondary);
  }

  .status-text.gold {
    color: var(--color-gold);
  }

  .status-time {
    color: var(--color-text-tertiary);
    font-size: 12px;
    margin-left: 4px;
  }
</style>
