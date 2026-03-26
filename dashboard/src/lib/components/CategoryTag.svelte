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
    padding: 3px 10px;
    border-radius: var(--radius-md);
    font-family: var(--font-ui);
    font-weight: 600;
    font-size: 11px;
    letter-spacing: 0.08em;
    line-height: 1.3;
    white-space: nowrap;
    text-transform: uppercase;
    color: var(--tag-color);
    background-color: color-mix(in srgb, var(--tag-color) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--tag-color) 25%, transparent);
  }
</style>
