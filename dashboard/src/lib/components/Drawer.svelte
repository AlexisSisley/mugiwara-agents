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
    background: rgba(0, 0, 0, 0.6);
    z-index: 100;
    display: flex;
    justify-content: flex-end;
  }

  .drawer {
    height: 100%;
    background: var(--color-surface);
    border-left: 3px solid var(--color-primary);
    display: flex;
    flex-direction: column;
    box-shadow: -6px 0 24px rgba(0, 0, 0, 0.5);
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-6);
    border-bottom: 2px solid var(--color-border);
    min-height: var(--header-height);
  }

  .drawer-title-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .drawer-title {
    font-size: 22px;
    font-weight: 400;
    color: var(--color-text-primary);
    letter-spacing: 0.04em;
    text-shadow: 1px 1px 0px rgba(0, 0, 0, 0.3);
  }

  .drawer-accent-line {
    height: 2px;
    width: 40px;
    background: linear-gradient(90deg, var(--color-primary), var(--color-secondary));
    border-radius: 1px;
  }

  .drawer-close {
    background: none;
    border: 2px solid var(--color-border);
    color: var(--color-text-secondary);
    font-size: 20px;
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    line-height: 1;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .drawer-close:hover {
    color: var(--color-primary);
    border-color: var(--color-primary);
    background: var(--color-surface-hover);
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-6);
  }
</style>
