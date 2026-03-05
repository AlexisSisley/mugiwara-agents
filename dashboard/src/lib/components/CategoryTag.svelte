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
    padding: 2px 10px;
    border-radius: var(--radius-md);
    font-family: var(--font-ui);
    font-weight: 700;
    font-size: 11px;
    letter-spacing: 0.04em;
    line-height: 1.3;
    white-space: nowrap;
    color: var(--tag-color);
    background-color: color-mix(in srgb, var(--tag-color) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--tag-color) 30%, transparent);
    box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.2);
  }
</style>
