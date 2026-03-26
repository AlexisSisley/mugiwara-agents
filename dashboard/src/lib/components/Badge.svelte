<script lang="ts">
  export let variant: 'pass' | 'fail' | 'running' | 'warning' | 'idle' | 'info' = 'idle';
  export let small = false;

  const variantMap: Record<string, { bg: string; color: string; label: string; border: string }> = {
    pass: { bg: 'rgba(52, 211, 153, 0.12)', color: '#34D399', label: 'PASS', border: 'rgba(52, 211, 153, 0.3)' },
    fail: { bg: 'rgba(248, 113, 113, 0.12)', color: '#F87171', label: 'FAIL', border: 'rgba(248, 113, 113, 0.3)' },
    running: { bg: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6', label: 'Running', border: 'rgba(139, 92, 246, 0.3)' },
    warning: { bg: 'rgba(251, 191, 36, 0.12)', color: '#FBBF24', label: 'Warning', border: 'rgba(251, 191, 36, 0.3)' },
    idle: { bg: 'rgba(255, 255, 255, 0.06)', color: '#A1A1AA', label: 'Idle', border: 'rgba(255, 255, 255, 0.1)' },
    info: { bg: 'rgba(96, 165, 250, 0.12)', color: '#60A5FA', label: 'Info', border: 'rgba(96, 165, 250, 0.3)' },
  };

  $: style = variantMap[variant] ?? variantMap['idle'];
</script>

<span
  class="badge"
  class:small
  style="background-color: {style?.bg}; color: {style?.color}; border-color: {style?.border};"
>
  {#if variant === 'running'}
    <span class="dot anim-pulse" style="background-color: {style?.color};"></span>
  {:else if variant === 'pass'}
    <span class="status-icon">{'\u2705'}</span>
  {:else if variant === 'fail'}
    <span class="status-icon">{'\u274C'}</span>
  {/if}
  <slot>{style?.label}</slot>
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 12px;
    border-radius: var(--radius-full);
    border: 1px solid;
    font-family: var(--font-ui);
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.04em;
    line-height: 1;
    white-space: nowrap;
    text-transform: uppercase;
    backdrop-filter: blur(8px);
  }

  .badge.small {
    padding: 2px 8px;
    font-size: 10px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .status-icon {
    font-size: 9px;
    line-height: 1;
  }
</style>
