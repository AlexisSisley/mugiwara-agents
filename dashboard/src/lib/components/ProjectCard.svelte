<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { ProjectInfo } from '../../../shared/types';
  import { formatRelativeTime } from '../format';

  export let project: ProjectInfo;

  const dispatch = createEventDispatcher<{
    open: ProjectInfo;
    'open-yolo': ProjectInfo;
    'run-agent': ProjectInfo;
    select: ProjectInfo;
    explore: ProjectInfo;
  }>();

  const CATEGORY_COLORS: Record<string, string> = {
    pro: '#3B82F6',
    poc: '#F59E0B',
    perso: '#10B981',
  };

  const CATEGORY_LABELS: Record<string, string> = {
    pro: 'PRO',
    poc: 'POC',
    perso: 'PERSO',
  };

  $: accentColor = CATEGORY_COLORS[project.category] ?? '#6B7280';
  $: categoryLabel = CATEGORY_LABELS[project.category] ?? project.category.toUpperCase();
  $: gitStatus = project.git
    ? project.git.isDirty ? 'dirty' : 'clean'
    : null;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="project-card" style="--accent: {accentColor};" on:click={() => dispatch('select', project)}>
  <div class="card-accent"></div>

  <div class="card-body">
    <div class="card-header">
      <div class="card-title-row">
        <span class="card-name">{project.name}</span>
        <span class="category-badge" style="--badge-color: {accentColor};">{categoryLabel}</span>
      </div>
      <span class="card-path mono">{project.path}</span>
    </div>

    {#if project.stack.length > 0}
      <div class="stack-tags">
        {#each project.stack as tag}
          <span class="stack-tag">{tag}</span>
        {/each}
      </div>
    {/if}

    {#if project.git}
      <div class="git-row">
        <span class="git-branch mono">{project.git.branch}</span>
        <span class="git-sep">-</span>
        <span class="git-time">{formatRelativeTime(project.git.lastCommitDate)}</span>
        <span class="git-sep">-</span>
        <span class="git-status" class:clean={gitStatus === 'clean'} class:dirty={gitStatus === 'dirty'}>
          {gitStatus === 'clean' ? 'clean' : 'dirty'}
        </span>
      </div>
    {/if}

    <div class="stats-row">
      {#if project.claudeSessionCount > 0}
        <span class="stat-item claude-stat">{project.claudeSessionCount} session{project.claudeSessionCount > 1 ? 's' : ''} Claude</span>
      {/if}
      {#if project.mugiwaraStats}
        {#if project.claudeSessionCount > 0}<span class="stat-sep">|</span>{/if}
        <span class="stat-item">{project.mugiwaraStats.invocationCount} invocations</span>
      {/if}
    </div>

    <div class="card-actions">
      <button class="btn btn-primary" on:click|stopPropagation={() => dispatch('open', project)}>
        Claude
      </button>
      <button class="btn btn-yolo" on:click|stopPropagation={() => dispatch('open-yolo', project)} title="--dangerously-skip-permissions">
        YOLO
      </button>
      <button class="btn btn-agent" on:click|stopPropagation={() => dispatch('run-agent', project)}>
        Agent
      </button>
      <button class="btn btn-explore" on:click|stopPropagation={() => dispatch('explore', project)}>
        Explorer
      </button>
    </div>
  </div>
</div>

<style>
  .project-card {
    position: relative;
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    overflow: hidden;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .project-card:hover {
    border-color: var(--color-gold);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  }

  .card-accent {
    height: 3px;
    background: var(--accent);
  }

  .card-body {
    padding: var(--space-4) var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
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
    color: var(--color-text-primary);
    letter-spacing: 0.01em;
  }

  .category-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: var(--radius-md);
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: var(--badge-color);
    background: color-mix(in srgb, var(--badge-color) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--badge-color) 30%, transparent);
    white-space: nowrap;
  }

  .card-path {
    font-size: 11px;
    color: var(--color-text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .stack-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .stack-tag {
    display: inline-flex;
    align-items: center;
    padding: 1px 8px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-text-secondary);
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
  }

  .git-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 12px;
    color: var(--color-text-secondary);
  }

  .git-branch {
    color: var(--color-accent);
    font-weight: 600;
  }

  .git-sep {
    color: var(--color-text-tertiary);
    opacity: 0.5;
  }

  .git-status.clean {
    color: #34D399;
  }

  .git-status.dirty {
    color: #FBBF24;
  }

  .stats-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 11px;
    color: var(--color-text-tertiary);
  }

  .claude-stat {
    color: var(--color-gold);
    font-weight: 600;
  }

  .stat-sep {
    opacity: 0.4;
  }

  .card-actions {
    display: flex;
    gap: var(--space-2);
    margin-top: var(--space-1);
  }

  .btn {
    flex: 1;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: center;
  }

  .btn-primary {
    background: var(--color-gold);
    color: #09090B;
    border-color: var(--color-gold);
  }

  .btn-primary:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .btn-yolo {
    background: transparent;
    color: #F87171;
    border-color: rgba(248,113,113,0.3);
  }

  .btn-yolo:hover {
    background: rgba(248,113,113,0.1);
    border-color: #F87171;
    transform: translateY(-1px);
  }

  .btn-agent {
    background: transparent;
    color: var(--color-text-secondary);
    border-color: var(--glass-border);
  }

  .btn-agent:hover {
    border-color: var(--color-gold);
    color: var(--color-gold);
    transform: translateY(-1px);
  }

  .btn-explore {
    background: transparent;
    color: var(--color-text-secondary);
    border-color: var(--glass-border);
  }

  .btn-explore:hover {
    border-color: var(--color-gold);
    color: var(--color-gold);
    transform: translateY(-1px);
  }
</style>
