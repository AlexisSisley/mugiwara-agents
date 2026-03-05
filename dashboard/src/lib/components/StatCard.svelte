<script lang="ts">
  export let label: string;
  export let value: string | number;
  export let accent: string = 'var(--color-primary)';
  export let icon: string = '';
</script>

<div class="stat-card" style="border-left-color: {accent};">
  <div class="stat-header">
    {#if icon}
      <span class="stat-icon">{icon}</span>
    {/if}
    <span class="stat-label">{label}</span>
  </div>
  <div class="stat-value mono">{value}</div>
</div>

<style>
  .stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-left: 3px solid var(--color-primary);
    border-radius: var(--radius-lg);
    padding: var(--space-4) var(--space-5);
    min-width: 180px;
  }

  .stat-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .stat-icon {
    font-size: 16px;
    opacity: 0.7;
  }

  .stat-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--color-text-secondary);
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: 32px;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: -0.02em;
    color: var(--color-text-primary);
  }
</style>
