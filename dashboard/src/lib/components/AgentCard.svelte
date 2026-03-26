<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { CrewMember } from '../../../shared/types';
  import { formatRelativeTime } from '../format';
  import Badge from './Badge.svelte';

  export let member: CrewMember;

  const dispatch = createEventDispatcher<{ select: CrewMember }>();

  const TYPE_COLORS: Record<string, string> = {
    subagent: '#3B82F6',
    skill: '#C49B30',
    pipeline: '#818CF8',
  };

  const TYPE_LABELS: Record<string, string> = {
    subagent: 'SUBAGENT',
    skill: 'SKILL',
    pipeline: 'PIPELINE',
  };

  $: typeColor = TYPE_COLORS[member.type] ?? '#6B7280';
  $: typeLabel = TYPE_LABELS[member.type] ?? member.type.toUpperCase();
  $: isAlias = member.aliasOf !== null;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="agent-card" style="--type-color: {typeColor};" on:click={() => dispatch('select', member)}>
  <div class="card-accent"></div>
  <div class="card-body">
    <div class="card-header">
      <div class="card-title-row">
        <span class="card-name">{member.name}</span>
        <span class="type-badge" style="--badge-color: {typeColor};">{typeLabel}</span>
      </div>
      {#if isAlias}
        <span class="alias-tag">alias de {member.aliasOf}</span>
      {/if}
    </div>

    <p class="card-desc">{member.description}</p>

    <div class="card-stats">
      <div class="stat">
        <span class="stat-value">{member.stats.totalInvocations}</span>
        <span class="stat-label">total</span>
      </div>
      <div class="stat">
        <span class="stat-value">{member.stats.last7d}</span>
        <span class="stat-label">7j</span>
      </div>
      <div class="stat">
        <span class="stat-value">{member.stats.lastUsed ? formatRelativeTime(member.stats.lastUsed) : '--'}</span>
        <span class="stat-label">dernier</span>
      </div>
    </div>

    {#if member.stats.topProjects.length > 0}
      <div class="card-projects">
        {#each member.stats.topProjects.slice(0, 3) as proj}
          <span class="project-tag">{proj}</span>
        {/each}
      </div>
    {/if}

    {#if member.elevated}
      <div class="elevated-marker">
        <Badge variant="pass" small>Elevated</Badge>
      </div>
    {/if}
  </div>
</div>

<style>
  .agent-card {
    position: relative;
    background: var(--glass-bg, rgba(255,255,255,0.03));
    backdrop-filter: var(--glass-blur, blur(12px));
    -webkit-backdrop-filter: var(--glass-blur, blur(12px));
    border: 1px solid var(--glass-border, rgba(255,255,255,0.06));
    border-radius: var(--radius-xl, 16px);
    overflow: hidden;
    cursor: pointer;
    transition: all var(--transition-fast, 0.15s ease);
    box-shadow: 0 4px 24px rgba(0,0,0,0.2);
  }

  .agent-card:hover {
    border-color: rgba(201,168,76,0.2);
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    transform: translateY(-2px);
  }

  .card-accent {
    height: 3px;
    background: var(--type-color);
    border-radius: var(--radius-xl, 16px) var(--radius-xl, 16px) 0 0;
  }

  .card-body {
    padding: var(--space-4) var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .card-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .card-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .card-name {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-text-primary, #fafafa);
    font-family: var(--font-manga);
    letter-spacing: 0.5px;
  }

  .type-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: var(--badge-color);
    background: color-mix(in srgb, var(--badge-color) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--badge-color) 25%, transparent);
    white-space: nowrap;
  }

  .alias-tag {
    font-size: 10px;
    color: var(--color-text-tertiary, #71717a);
    font-style: italic;
  }

  .card-desc {
    font-size: 12px;
    color: var(--color-text-secondary, #a1a1aa);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin: 0;
  }

  .card-stats {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-2) 0;
    border-top: 1px solid rgba(255,255,255,0.06);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0;
  }

  .stat-value {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text-primary, #fafafa);
  }

  .stat-label {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--color-text-tertiary, #71717a);
  }

  .card-projects {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .project-tag {
    display: inline-flex;
    padding: 1px 6px;
    font-size: 10px;
    font-family: var(--font-mono);
    color: var(--color-accent, #34d399);
    background: rgba(52,211,153,0.08);
    border: 1px solid rgba(52,211,153,0.2);
    border-radius: 6px;
  }

  .elevated-marker {
    position: absolute;
    top: var(--space-3);
    right: var(--space-3);
  }
</style>
