<script lang="ts">
  import { toasts, removeToast } from '$lib/toast-store';
</script>

{#if $toasts.length > 0}
  <div class="toast-container">
    {#each $toasts as toast (toast.id)}
      <div class="toast toast-{toast.variant}" role="alert">
        <span class="toast-icon">
          {#if toast.variant === 'success'}
            {'\u2705'}
          {:else if toast.variant === 'error'}
            {'\u274C'}
          {:else}
            {'\u2139\uFE0F'}
          {/if}
        </span>
        <span class="toast-message">{toast.message}</span>
        <button class="toast-close" on:click={() => removeToast(toast.id)} aria-label="Fermer">
          {'\u2715'}
        </button>
      </div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: var(--space-6);
    right: var(--space-6);
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-width: 400px;
  }

  .toast {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background: var(--color-bg);
    backdrop-filter: blur(16px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    font-size: 13px;
    font-family: var(--font-ui);
    color: var(--color-text-primary);
    box-shadow: var(--shadow-lg);
    animation: toast-slide-in 300ms ease;
  }

  .toast-success {
    border-left: 3px solid #34D399;
  }

  .toast-error {
    border-left: 3px solid #F87171;
  }

  .toast-info {
    border-left: 3px solid var(--color-gold);
  }

  .toast-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .toast-message {
    flex: 1;
    line-height: 1.4;
  }

  .toast-close {
    background: none;
    border: none;
    color: var(--color-text-tertiary);
    font-size: 14px;
    cursor: pointer;
    padding: 2px;
    flex-shrink: 0;
    transition: color var(--transition-fast);
  }

  .toast-close:hover {
    color: var(--color-text-primary);
  }

  @keyframes toast-slide-in {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
</style>
