<script lang="ts">
  export let label: string;
  export let value: string | number;
  export let accent: string = 'var(--color-primary)';
  export let icon: string = '';
</script>

<div class="stat-card" style="--card-accent: {accent};">
  <div class="stat-accent-bar"></div>
  <div class="stat-content">
    <div class="stat-header">
      {#if icon}
        <span class="stat-icon">{icon}</span>
      {/if}
      <span class="stat-label manga">{label}</span>
    </div>
    <div class="stat-value mono">{value}</div>
  </div>
</div>

<style>
  .stat-card {
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    position: relative;
    box-shadow: var(--shadow-md);
    transition: all var(--transition-fast);
  }

  .stat-card:hover {
    border-color: var(--card-accent);
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }

  .stat-accent-bar {
    height: 4px;
    background: var(--card-accent);
  }

  .stat-content {
    padding: var(--space-4) var(--space-5);
  }

  .stat-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .stat-icon {
    font-size: 18px;
  }

  .stat-label {
    font-size: 14px;
    color: var(--color-text-secondary);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: 34px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: var(--color-text-primary);
    text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.3);
  }
</style>
