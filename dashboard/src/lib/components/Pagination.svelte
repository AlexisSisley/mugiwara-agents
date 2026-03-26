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
      \u25C0 Prev
    </button>

    <span class="page-info">
      <span class="page-current manga">{pagination.page}</span>
      <span class="page-sep">/</span>
      <span class="page-total-num mono">{pagination.totalPages}</span>
      <span class="page-total">({pagination.total} items)</span>
    </span>

    <button
      class="page-btn"
      disabled={pagination.page >= pagination.totalPages}
      on:click={() => goTo(pagination.page + 1)}
    >
      Next \u25B6
    </button>
  </div>
{/if}

<style>
  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-4);
    padding: var(--space-5) 0;
  }

  .page-btn {
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 700;
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    background: var(--glass-bg);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .page-btn:hover:not(:disabled) {
    border-color: var(--color-gold);
    color: var(--color-gold);
  }

  .page-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .page-info {
    display: flex;
    align-items: baseline;
    gap: var(--space-1);
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  .page-current {
    font-size: 22px;
    color: var(--color-gold);
  }

  .page-sep {
    color: var(--color-text-tertiary);
  }

  .page-total-num {
    font-size: 14px;
    color: var(--color-text-primary);
  }

  .page-total {
    color: var(--color-text-tertiary);
    font-size: 11px;
    margin-left: var(--space-1);
  }
</style>
