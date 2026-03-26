<script lang="ts">
  export let width: string = '100%';
  export let height: string = '20px';
  export let variant: 'text' | 'card' | 'circle' | 'table-row' | 'stat-card' = 'text';
  export let count: number = 1;
</script>

{#each Array(count) as _, i}
  {#if variant === 'text'}
    <div class="skeleton skeleton-text" style="width: {width}; height: {height};" />
  {:else if variant === 'card'}
    <div class="skeleton skeleton-card" style="width: {width}; height: {height};" />
  {:else if variant === 'circle'}
    <div class="skeleton skeleton-circle" style="width: {height}; height: {height};" />
  {:else if variant === 'table-row'}
    <div class="skeleton skeleton-table-row">
      <div class="skeleton-cell" style="width: 100px;" />
      <div class="skeleton-cell" style="width: 60px;" />
      <div class="skeleton-cell" style="flex: 1;" />
      <div class="skeleton-cell" style="width: 80px;" />
      <div class="skeleton-cell" style="width: 80px;" />
    </div>
  {:else if variant === 'stat-card'}
    <div class="skeleton skeleton-stat-card" />
  {/if}
{/each}

<style>
  .skeleton {
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.04) 0%,
      rgba(255,255,255,0.08) 50%,
      rgba(255,255,255,0.04) 100%
    );
    background-size: 200% 100%;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
    border: 1px solid rgba(255,255,255,0.06);
  }

  .skeleton-text {
    border-radius: var(--radius-md);
    margin-bottom: var(--space-2);
  }

  .skeleton-card {
    min-height: 160px;
    border-radius: var(--radius-xl);
  }

  .skeleton-circle {
    border-radius: 50%;
  }

  .skeleton-stat-card {
    height: 100px;
    border-radius: var(--radius-xl);
  }

  .skeleton-table-row {
    display: flex;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .skeleton-cell {
    height: 16px;
    background: linear-gradient(
      90deg,
      rgba(255,255,255,0.04) 0%,
      rgba(255,255,255,0.08) 50%,
      rgba(255,255,255,0.04) 100%
    );
    background-size: 200% 100%;
    animation: skeleton-pulse 1.5s ease-in-out infinite;
    border-radius: var(--radius-md);
  }

  @keyframes skeleton-pulse {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
</style>
