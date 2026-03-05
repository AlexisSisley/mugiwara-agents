<script lang="ts">
  import { stats, statsLoading } from '../stores';
  import { formatRelativeTime } from '../format';

  export let title: string;
</script>

<header class="header">
  <div class="header-left">
    <h1 class="header-title manga">{title}</h1>
    <div class="title-accent"></div>
  </div>
  <div class="header-meta">
    {#if $statsLoading}
      <span class="header-status">
        <span class="dot anim-pulse" style="background: var(--color-secondary);"></span>
        Chargement...
      </span>
    {:else if $stats}
      <span class="header-status">
        <span class="live-badge">
          <span class="dot anim-pulse" style="background: var(--color-success);"></span>
          LIVE
        </span>
        <span class="last-update">Derniere activite: {formatRelativeTime($stats.lastActivity)}</span>
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
    border-bottom: 3px solid var(--color-border-strong);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 var(--space-6);
    z-index: 40;
    /* Subtle speed-line pattern in header */
    background-image:
      repeating-linear-gradient(
        90deg,
        transparent,
        transparent 60px,
        rgba(56, 189, 248, 0.02) 60px,
        rgba(56, 189, 248, 0.02) 61px
      );
    background-color: var(--color-bg);
  }

  .header-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .header-title {
    font-size: 32px;
    font-weight: 400;
    letter-spacing: 0.06em;
    line-height: 1;
    color: var(--color-text-primary);
    text-shadow: 2px 2px 0px rgba(0, 0, 0, 0.4);
  }

  .title-accent {
    height: 3px;
    width: 60px;
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
    border-radius: 2px;
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .header-status {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  .live-badge {
    display: flex;
    align-items: center;
    gap: var(--space-1);
    background: var(--color-success-bg);
    color: var(--color-success);
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.08em;
    border: 1px solid rgba(46, 204, 113, 0.3);
  }

  .last-update {
    color: var(--color-text-tertiary);
    font-size: 12px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
