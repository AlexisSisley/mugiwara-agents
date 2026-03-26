<script lang="ts">
  export let haute: number = 0;
  export let moyenne: number = 0;
  export let basse: number = 0;
  export let size: number = 160;

  const COLORS = {
    haute: '#34D399',
    moyenne: '#FBBF24',
    basse: '#F87171',
  };

  $: total = haute + moyenne + basse;
  $: segments = total > 0 ? [
    { label: 'Haute', value: haute, color: COLORS.haute, pct: Math.round((haute / total) * 100) },
    { label: 'Moyenne', value: moyenne, color: COLORS.moyenne, pct: Math.round((moyenne / total) * 100) },
    { label: 'Basse', value: basse, color: COLORS.basse, pct: Math.round((basse / total) * 100) },
  ] : [];

  // SVG donut using stroke-dasharray
  const radius = 60;
  const circumference = 2 * Math.PI * radius;

  $: offsets = (() => {
    const result: { offset: number; length: number; color: string }[] = [];
    let cumulative = 0;
    for (const seg of segments) {
      if (seg.value === 0) continue;
      const length = (seg.value / total) * circumference;
      result.push({ offset: cumulative, length, color: seg.color });
      cumulative += length;
    }
    return result;
  })();
</script>

<div class="donut-wrapper">
  <svg width={size} height={size} viewBox="0 0 {size} {size}">
    <g transform="translate({size / 2}, {size / 2}) rotate(-90)">
      <!-- Background ring -->
      <circle
        r={radius}
        fill="none"
        stroke="var(--color-border)"
        stroke-width="20"
        opacity="0.3"
      />
      <!-- Segments -->
      {#each offsets as seg}
        <circle
          r={radius}
          fill="none"
          stroke={seg.color}
          stroke-width="20"
          stroke-dasharray="{seg.length} {circumference - seg.length}"
          stroke-dashoffset="-{seg.offset}"
          stroke-linecap="butt"
        />
      {/each}
    </g>
    <!-- Center text -->
    <text
      x={size / 2}
      y={size / 2 - 6}
      text-anchor="middle"
      class="donut-total"
    >{total}</text>
    <text
      x={size / 2}
      y={size / 2 + 12}
      text-anchor="middle"
      class="donut-label"
    >decisions</text>
  </svg>

  <div class="donut-legend">
    {#each segments as seg}
      {#if seg.value > 0}
        <div class="legend-item">
          <span class="legend-dot" style="background: {seg.color};"></span>
          <span class="legend-label">{seg.label}</span>
          <span class="legend-value">{seg.value} ({seg.pct}%)</span>
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .donut-wrapper {
    display: flex;
    align-items: center;
    gap: var(--space-6);
  }

  .donut-total {
    font-family: var(--font-manga);
    font-size: 28px;
    fill: var(--color-text-primary);
  }

  .donut-label {
    font-family: var(--font-ui);
    font-size: 11px;
    fill: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .donut-legend {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 13px;
  }

  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 2px;
    flex-shrink: 0;
    border: 1px solid rgba(255,255,255,0.1);
  }

  .legend-label {
    font-weight: 600;
    color: var(--color-text-secondary);
    min-width: 70px;
  }

  .legend-value {
    color: var(--color-text-secondary);
    font-family: var(--font-mono);
    font-size: 12px;
  }
</style>
