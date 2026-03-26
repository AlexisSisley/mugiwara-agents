<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let open = false;
  export let width = '400px';
  export let title = '';

  const dispatch = createEventDispatcher<{ close: void }>();

  function close() {
    dispatch('close');
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') close();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="drawer-overlay" on:click={close}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div
      class="drawer anim-slide-in"
      style="width: {width};"
      on:click|stopPropagation
    >
      <div class="drawer-header">
        <div class="drawer-title-group">
          <h3 class="drawer-title manga">{title}</h3>
          <div class="drawer-accent-line"></div>
        </div>
        <button class="drawer-close" on:click={close}>&times;</button>
      </div>
      <div class="drawer-body">
        <slot />
      </div>
    </div>
  </div>
{/if}

<style>
  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 100;
    display: flex;
    justify-content: flex-end;
  }

  .drawer {
    height: 100%;
    background: var(--color-bg);
    border-left: 1px solid var(--glass-border);
    border-radius: var(--radius-xl) 0 0 var(--radius-xl);
    display: flex;
    flex-direction: column;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5) var(--space-6);
    border-bottom: 1px solid var(--glass-border);
  }

  .drawer-title-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .drawer-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--color-text-primary);
    letter-spacing: 0.02em;
  }

  .drawer-accent-line {
    height: 1px;
    width: 40px;
    background: linear-gradient(90deg, var(--color-gold), transparent);
  }

  .drawer-close {
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--glass-border);
    color: var(--color-text-secondary);
    font-size: 18px;
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    line-height: 1;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .drawer-close:hover {
    color: var(--color-gold);
    border-color: rgba(201,168,76,0.3);
    background: var(--color-gold-dim);
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6);
    background: var(--color-bg);
    color: var(--color-text-primary);
  }
</style>
