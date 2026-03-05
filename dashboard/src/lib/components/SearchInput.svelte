<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let value = '';
  export let placeholder = 'Rechercher...';

  const dispatch = createEventDispatcher<{ input: string }>();

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement;
    value = target.value;
    dispatch('input', value);
  }
</script>

<div class="search-input">
  <span class="search-icon">&#128269;</span>
  <input
    type="text"
    {placeholder}
    {value}
    on:input={handleInput}
  />
  {#if value}
    <button class="clear-btn" on:click={() => { value = ''; dispatch('input', ''); }}>
      &times;
    </button>
  {/if}
</div>

<style>
  .search-input {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: 0 var(--space-3);
    height: 38px;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-sm);
  }

  .search-input:focus-within {
    border-color: var(--color-secondary);
    box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.15), var(--shadow-sm);
  }

  .search-icon {
    font-size: 14px;
    color: var(--color-text-tertiary);
    flex-shrink: 0;
  }

  input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: 13px;
    min-width: 0;
  }

  input::placeholder {
    color: var(--color-text-tertiary);
  }

  .clear-btn {
    background: none;
    border: none;
    color: var(--color-text-tertiary);
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
    padding: 2px;
    transition: color var(--transition-fast);
  }

  .clear-btn:hover {
    color: var(--color-primary);
  }
</style>
