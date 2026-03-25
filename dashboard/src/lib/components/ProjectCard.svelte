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
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
    cursor: pointer;
    transition: all var(--transition-fast);
  }

  .project-card:hover {
    border-color: var(--accent);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    transform: translateY(-1px);
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
    color: var(--color-secondary);
    background: color-mix(in srgb, var(--color-secondary) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent);
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
    color: #4ade80;
  }

  .git-status.dirty {
    color: #f59e0b;
  }

  .stats-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 11px;
    color: var(--color-text-tertiary);
  }

  .claude-stat {
    color: var(--color-primary);
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
    border: 2px solid var(--color-border);
    border-radius: var(--radius-md);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: center;
  }

  .btn-primary {
    background: var(--color-primary);
    color: var(--color-bg);
    border-color: var(--color-primary);
  }

  .btn-primary:hover {
    background: var(--color-primary-light);
    border-color: var(--color-primary-light);
    box-shadow: 0 0 8px color-mix(in srgb, var(--color-primary) 50%, transparent);
  }

  .btn-yolo {
    background: transparent;
    color: #ef4444;
    border-color: #ef4444;
  }

  .btn-yolo:hover {
    background: color-mix(in srgb, #ef4444 12%, transparent);
    box-shadow: 0 0 8px color-mix(in srgb, #ef4444 30%, transparent);
  }

  .btn-agent {
    background: transparent;
    color: var(--color-secondary);
    border-color: var(--color-secondary);
  }

  .btn-agent:hover {
    background: color-mix(in srgb, var(--color-secondary) 12%, transparent);
    box-shadow: 0 0 8px color-mix(in srgb, var(--color-secondary) 30%, transparent);
  }

  .btn-explore {
    background: transparent;
    color: var(--color-accent);
    border-color: var(--color-accent);
  }

  .btn-explore:hover {
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    box-shadow: 0 0 8px color-mix(in srgb, var(--color-accent) 30%, transparent);
  }
</style>
