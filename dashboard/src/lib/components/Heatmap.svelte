<!-- svelte-ignore unused-export-let -->
<script lang="ts">
  import type { HeatmapCell } from '../../../shared/types';

  export let data: HeatmapCell[] = [];
  export let color: string = 'var(--color-primary)';

  const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const HOURS = Array.from({ length: 24 }, (_, i) => i);

  // Build lookup map
  $: cellMap = new Map(data.map((c) => [`${c.day}-${c.hour}`, c.count]));
  $: maxCount = Math.max(...data.map((c) => c.count), 1);

  function getIntensityLevel(day: number, hour: number): number {
    const count = cellMap.get(`${day}-${hour}`) ?? 0;
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio <= 0.2) return 1;
    if (ratio <= 0.4) return 2;
    if (ratio <= 0.6) return 3;
    if (ratio <= 0.8) return 4;
    if (ratio <= 0.9) return 5;
    return 6;
  }

  const INTENSITY_COLORS: Record<number, string> = {
    0: 'rgba(139,92,246,0.04)',
    1: 'rgba(139,92,246,0.10)',
    2: 'rgba(139,92,246,0.22)',
    3: 'rgba(139,92,246,0.38)',
    4: 'rgba(139,92,246,0.55)',
    5: 'rgba(139,92,246,0.72)',
    6: 'rgba(139,92,246,0.90)',
  };

  function getCount(day: number, hour: number): number {
    return cellMap.get(`${day}-${hour}`) ?? 0;
  }
</script>

<div class="heatmap-wrapper">
  <div class="heatmap-hours">
    <div class="heatmap-corner"></div>
    {#each HOURS as hour}
      <div class="heatmap-hour-label">{hour.toString().padStart(2, '0')}</div>
    {/each}
  </div>
  {#each DAYS as dayLabel, dayIdx}
    <div class="heatmap-row">
      <div class="heatmap-day-label">{dayLabel}</div>
      {#each HOURS as hour}
        <div
          class="heatmap-cell"
          style="background-color: {INTENSITY_COLORS[getIntensityLevel(dayIdx, hour)]};"
          title="{dayLabel} {hour}h — {getCount(dayIdx, hour)} invocations"
        ></div>
      {/each}
    </div>
  {/each}
</div>

<style>
  .heatmap-wrapper {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .heatmap-hours {
    display: flex;
    gap: 2px;
  }

  .heatmap-corner {
    width: 36px;
    flex-shrink: 0;
  }

  .heatmap-hour-label {
    flex: 1;
    min-width: 0;
    text-align: center;
    font-size: 9px;
    font-family: var(--font-mono);
    color: var(--color-text-tertiary, #71717a);
  }

  .heatmap-row {
    display: flex;
    gap: 2px;
    align-items: center;
  }

  .heatmap-day-label {
    width: 36px;
    flex-shrink: 0;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-text-tertiary, #71717a);
    text-align: right;
    padding-right: 4px;
  }

  .heatmap-cell {
    flex: 1;
    min-width: 0;
    aspect-ratio: 1;
    border-radius: 4px;
    cursor: default;
    transition: transform 0.15s ease, outline 0.15s ease, box-shadow 0.15s ease;
  }

  .heatmap-cell:hover {
    transform: scale(1.4);
    z-index: 1;
    outline: 1px solid rgba(201,168,76,0.4);
    box-shadow: 0 0 6px rgba(201,168,76,0.15);
  }
</style>
