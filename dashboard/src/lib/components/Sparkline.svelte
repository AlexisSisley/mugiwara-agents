<script lang="ts">
  export let data: number[] = [];
  export let color: string = 'var(--color-primary)';
  export let width: number = 200;
  export let height: number = 40;
  export let fillOpacity: number = 0.15;

  $: maxVal = Math.max(...data, 1);
  $: points = data.map((v, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * width;
    const y = height - (v / maxVal) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(' ');
  $: fillPoints = `0,${height} ${points} ${width},${height}`;
</script>

<svg {width} {height} class="sparkline" viewBox="0 0 {width} {height}">
  {#if data.length > 1}
    <polygon points={fillPoints} fill={color} opacity={fillOpacity} />
    <polyline
      {points}
      fill="none"
      stroke={color}
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <!-- Latest value dot -->
    {#if data.length > 0}
      {@const lastX = width}
      {@const lastY = height - (data[data.length - 1] / maxVal) * (height - 4) - 2}
      <circle cx={lastX} cy={lastY} r="3" fill={color} />
    {/if}
  {:else if data.length === 1}
    <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke={color} stroke-width="2" stroke-dasharray="4,4" />
  {/if}
</svg>

<style>
  .sparkline {
    display: block;
  }
</style>
