<script lang="ts">
  export let variant: 'pass' | 'fail' | 'running' | 'warning' | 'idle' | 'info' = 'idle';
  export let small = false;

  const variantMap: Record<string, { bg: string; color: string; label: string }> = {
    pass: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', label: 'PASS' },
    fail: { bg: 'var(--color-error-bg)', color: 'var(--color-error)', label: 'FAIL' },
    running: { bg: 'var(--color-info-bg)', color: 'var(--color-info)', label: 'Running' },
    warning: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', label: 'Warning' },
    idle: { bg: 'var(--color-surface-active)', color: 'var(--color-text-tertiary)', label: 'Idle' },
    info: { bg: 'var(--color-info-bg)', color: 'var(--color-info)', label: 'Info' },
  };

  $: style = variantMap[variant] ?? variantMap['idle'];
</script>

<span
  class="badge"
  class:small
  style="background-color: {style?.bg}; color: {style?.color};"
>
  {#if variant === 'running'}
    <span class="dot anim-pulse" style="background-color: {style?.color};"></span>
  {/if}
  <slot>{style?.label}</slot>
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-family: var(--font-ui);
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.04em;
    line-height: 1;
    white-space: nowrap;
    text-transform: uppercase;
  }

  .badge.small {
    padding: 1px 6px;
    font-size: 10px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }
</style>
