<script lang="ts">
  export let variant: 'pass' | 'fail' | 'running' | 'warning' | 'idle' | 'info' = 'idle';
  export let small = false;

  const variantMap: Record<string, { bg: string; color: string; label: string; border: string }> = {
    pass: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', label: 'PASS', border: 'rgba(46, 204, 113, 0.4)' },
    fail: { bg: 'var(--color-error-bg)', color: 'var(--color-error)', label: 'FAIL', border: 'rgba(231, 76, 60, 0.4)' },
    running: { bg: 'var(--color-info-bg)', color: 'var(--color-info)', label: 'Running', border: 'rgba(52, 152, 219, 0.4)' },
    warning: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', label: 'Warning', border: 'rgba(241, 196, 15, 0.4)' },
    idle: { bg: 'var(--color-surface-active)', color: 'var(--color-text-tertiary)', label: 'Idle', border: 'transparent' },
    info: { bg: 'var(--color-info-bg)', color: 'var(--color-info)', label: 'Info', border: 'rgba(52, 152, 219, 0.4)' },
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
    padding: 3px 10px;
    border-radius: var(--radius-md);
    border: 1px solid;
    font-family: var(--font-ui);
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.06em;
    line-height: 1;
    white-space: nowrap;
    text-transform: uppercase;
    box-shadow: var(--shadow-sm);
  }

  .badge.small {
    padding: 2px 7px;
    font-size: 10px;
    box-shadow: none;
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
