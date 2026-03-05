<script lang="ts">
  import { capitalize, getCategoryColor } from '../format';

  export let category: string;

  $: color = getCategoryColor(category);
</script>

<span class="category-tag" style="--tag-color: {color};">
  {capitalize(category)}
</span>

<style>
  .category-tag {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-family: var(--font-ui);
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.04em;
    line-height: 1;
    white-space: nowrap;
    color: var(--tag-color);
    background-color: color-mix(in srgb, var(--tag-color) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--tag-color) 25%, transparent);
  }
</style>
