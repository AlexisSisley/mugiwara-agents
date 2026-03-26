<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let icon: string = '\u{1F9ED}';
  export let title: string = 'Rien a afficher';
  export let subtitle: string = '';
  export let actionLabel: string = '';

  const dispatch = createEventDispatcher();

  function handleAction() {
    dispatch('action');
  }
</script>

<div class="empty-state">
  <div class="empty-icon">{icon}</div>
  <div class="empty-title manga">{title}</div>
  {#if subtitle}
    <div class="empty-subtitle">{subtitle}</div>
  {/if}
  {#if actionLabel}
    <button class="empty-action manga" on:click={handleAction}>
      {actionLabel}
    </button>
  {/if}
</div>

<style>
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--space-10) var(--space-6);
    gap: var(--space-3);
    text-align: center;
  }

  .empty-icon {
    font-size: 72px;
    opacity: 0.4;
    filter: grayscale(40%);
  }

  .empty-title {
    font-size: 22px;
    color: var(--color-text-secondary);
    letter-spacing: 1px;
  }

  .empty-subtitle {
    font-size: 13px;
    color: var(--color-text-tertiary);
    max-width: 420px;
    line-height: 1.5;
  }

  .empty-action {
    margin-top: var(--space-3);
    padding: var(--space-2) var(--space-5);
    background: var(--color-gold);
    color: #09090B;
    border: none;
    border-radius: var(--radius-md);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1px;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .empty-action:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }
</style>
