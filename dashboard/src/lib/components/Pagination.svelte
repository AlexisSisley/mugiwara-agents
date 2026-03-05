<script lang="ts">
  import type { Pagination } from '../../../shared/types';
  import { createEventDispatcher } from 'svelte';

  export let pagination: Pagination;

  const dispatch = createEventDispatcher<{ page: number }>();

  function goTo(page: number) {
    if (page >= 1 && page <= pagination.totalPages) {
      dispatch('page', page);
    }
  }
</script>

{#if pagination.totalPages > 1}
  <div class="pagination">
    <button
      class="page-btn"
      disabled={pagination.page <= 1}
      on:click={() => goTo(pagination.page - 1)}
    >
      &laquo; Prev
    </button>

    <span class="page-info mono">
      {pagination.page} / {pagination.totalPages}
      <span class="page-total">({pagination.total} items)</span>
    </span>

    <button
      class="page-btn"
      disabled={pagination.page >= pagination.totalPages}
      on:click={() => goTo(pagination.page + 1)}
    >
      Next &raquo;
    </button>
  </div>
{/if}

<style>
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    padding: var(--space-4) 0;
  }

  .page-btn {
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 600;
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .page-btn:hover:not(:disabled) {
    background: var(--color-surface-hover);
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-info {
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  .page-total {
    color: var(--color-text-tertiary);
    font-size: 11px;
  }
</style>
