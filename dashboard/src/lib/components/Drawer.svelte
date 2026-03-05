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
        <h3 class="drawer-title">{title}</h3>
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
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
    display: flex;
    justify-content: flex-end;
  }

  .drawer {
    height: 100%;
    background: var(--color-surface);
    border-left: 1px solid var(--color-border);
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-xl);
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--color-border);
    min-height: var(--header-height);
  }

  .drawer-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .drawer-close {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    font-size: 24px;
    cursor: pointer;
    padding: var(--space-1);
    line-height: 1;
    border-radius: var(--radius-sm);
    transition: all var(--transition-fast);
  }

  .drawer-close:hover {
    color: var(--color-text-primary);
    background: var(--color-surface-hover);
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6);
  }
</style>
