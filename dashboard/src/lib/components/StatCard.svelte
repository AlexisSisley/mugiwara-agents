<script lang="ts">
  export let label: string;
  export let value: string | number;
  export let accent: string = 'var(--color-primary)';
  export let icon: string = '';
</script>

<div class="stat-card">
  <div class="stat-content">
    {#if icon}
      <div class="stat-icon-circle">{icon}</div>
    {/if}
    <div class="stat-label">{label}</div>
    <div class="stat-value">{value}</div>
  </div>
</div>

<style>
  .stat-card {
    position: relative;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.22, 1, 0.36, 1);
  }

  /* Glass shine */
  .stat-card::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 50%);
    border-radius: inherit;
    z-index: 1;
  }

  .stat-card:hover {
    border-color: rgba(201,168,76,0.2);
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  }

  .stat-content {
    padding: var(--space-5) var(--space-6);
    position: relative;
    z-index: 2;
  }

  .stat-icon-circle {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--color-gold-dim);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    margin-bottom: var(--space-3);
  }

  .stat-label {
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text-secondary);
    margin-bottom: var(--space-2);
  }

  .stat-value {
    font-family: var(--font-manga);
    font-size: 36px;
    font-weight: 700;
    line-height: 1;
    color: var(--color-gold);
  }
</style>
