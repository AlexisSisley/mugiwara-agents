<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { ProjectInfo, ProjectSession, ClaudeSessionInfo } from '../../../shared/types';
  import { formatRelativeTime, formatDateTime, formatDuration } from '../format';
  import { api } from '../api/client';

  export let project: ProjectInfo;

  const dispatch = createEventDispatcher<{
    back: void;
    'open-claude': ProjectInfo;
    'open-yolo': ProjectInfo;
    'run-agent': ProjectInfo;
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

  // Session state
  let claudeSessions: ClaudeSessionInfo[] = [];
  let claudeSessionsLoading = true;
  let projectSessions: ProjectSession[] = [];
  let sessionsLoading = true;

  $: accentColor = CATEGORY_COLORS[project.category] ?? '#6B7280';
  $: categoryLabel = CATEGORY_LABELS[project.category] ?? project.category.toUpperCase();
  $: gitStatus = project.git
    ? project.git.isDirty ? 'dirty' : 'clean'
    : null;

  onMount(async () => {
    const [claudeRes, mugiRes] = await Promise.allSettled([
      api.getClaudeSessions(project.name),
      api.getProjectSessions(project.name),
    ]);

    if (claudeRes.status === 'fulfilled') claudeSessions = claudeRes.value.sessions;
    claudeSessionsLoading = false;

    if (mugiRes.status === 'fulfilled') projectSessions = mugiRes.value.sessions;
    sessionsLoading = false;
  });
</script>

<div class="detail-page">
  <!-- Header -->
  <div class="detail-header" style="--accent: {accentColor};">
    <button class="btn-back" on:click={() => dispatch('back')}>
      &larr; Retour
    </button>
    <div class="header-info">
      <div class="header-title-row">
        <h2 class="detail-title manga">{project.name}</h2>
        <span class="category-badge" style="--badge-color: {accentColor};">{categoryLabel}</span>
      </div>
      <span class="detail-path mono">{project.path}</span>
    </div>
    <div class="header-actions">
      <button class="btn-action btn-claude" on:click={() => dispatch('open-claude', project)}>
        Claude
      </button>
      <button class="btn-action btn-yolo" on:click={() => dispatch('open-yolo', project)} title="--dangerously-skip-permissions">
        YOLO
      </button>
      <button class="btn-action btn-agent" on:click={() => dispatch('run-agent', project)}>
        Agent
      </button>
      <button class="btn-action btn-explore" on:click={() => dispatch('explore', project)}>
        Explorer
      </button>
    </div>
  </div>

  <!-- Content 2 columns -->
  <div class="detail-content">
    <!-- Left Column -->
    <div class="detail-col">
      <!-- Info Section -->
      <section class="detail-section">
        <h4 class="section-title manga">INFOS</h4>
        {#if project.stack.length > 0}
          <div class="field">
            <span class="field-label">Stack</span>
            <div class="field-tags">
              {#each project.stack as tag}
                <span class="tag">{tag}</span>
              {/each}
            </div>
          </div>
        {/if}
        {#if project.lastModified}
          <div class="field">
            <span class="field-label">Derniere modification</span>
            <span class="field-value">{formatDateTime(project.lastModified)}</span>
          </div>
        {/if}
        {#if project.claudeSessionCount > 0}
          <div class="field">
            <span class="field-label">Sessions Claude Code</span>
            <span class="field-value accent">{project.claudeSessionCount}</span>
          </div>
        {/if}
      </section>

      <!-- Git Section -->
      {#if project.git}
        <section class="detail-section">
          <h4 class="section-title manga">GIT</h4>
          <div class="field">
            <span class="field-label">Branche</span>
            <span class="field-value mono accent">{project.git.branch}</span>
          </div>
          <div class="field">
            <span class="field-label">Dernier commit</span>
            <span class="field-value">{project.git.lastCommit}</span>
          </div>
          <div class="field">
            <span class="field-label">Date</span>
            <span class="field-value">{formatRelativeTime(project.git.lastCommitDate)}</span>
          </div>
          <div class="field">
            <span class="field-label">Status</span>
            <span class="field-value" class:git-clean={gitStatus === 'clean'} class:git-dirty={gitStatus === 'dirty'}>
              {gitStatus === 'clean' ? 'Clean' : 'Dirty (fichiers modifies)'}
            </span>
          </div>
        </section>
      {/if}

      <!-- Mugiwara Stats Section -->
      {#if project.mugiwaraStats}
        <section class="detail-section">
          <h4 class="section-title manga">STATS MUGIWARA</h4>
          <div class="field">
            <span class="field-label">Sessions</span>
            <span class="field-value">{project.mugiwaraStats.sessionCount}</span>
          </div>
          <div class="field">
            <span class="field-label">Invocations</span>
            <span class="field-value">{project.mugiwaraStats.invocationCount}</span>
          </div>
          {#if project.mugiwaraStats.topAgents.length > 0}
            <div class="field">
              <span class="field-label">Top Agents</span>
              <div class="top-agents">
                {#each project.mugiwaraStats.topAgents as agent}
                  <div class="agent-bar">
                    <span class="agent-name">{agent.name}</span>
                    <div class="agent-bar-fill" style="width: {Math.min(100, (agent.count / project.mugiwaraStats.topAgents[0].count) * 100)}%;"></div>
                    <span class="agent-count">{agent.count}</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
          {#if project.mugiwaraStats.lastActivity}
            <div class="field">
              <span class="field-label">Derniere activite</span>
              <span class="field-value">{formatRelativeTime(project.mugiwaraStats.lastActivity)}</span>
            </div>
          {/if}
        </section>
      {/if}

      <!-- Key Files Section -->
      {#if project.keyFiles.length > 0}
        <section class="detail-section">
          <h4 class="section-title manga">FICHIERS CLES</h4>
          <div class="key-files">
            {#each project.keyFiles as file}
              <span class="key-file mono">{file}</span>
            {/each}
          </div>
        </section>
      {/if}
    </div>

    <!-- Right Column -->
    <div class="detail-col">
      <!-- Activite Claude -->
      <section class="detail-section">
        <h4 class="section-title manga">ACTIVITE CLAUDE</h4>
        {#if claudeSessionsLoading}
          <span class="sessions-loading">Chargement...</span>
        {:else if claudeSessions.length === 0}
          <span class="sessions-empty">Aucune session Claude Code detectee.</span>
        {:else}
          <div class="claude-summary">
            <span class="cs-total">{claudeSessions.length} session{claudeSessions.length > 1 ? 's' : ''}</span>
            <span class="cs-sep">-</span>
            <span class="cs-total">{claudeSessions.reduce((s, c) => s + c.userMessages, 0)} messages</span>
          </div>
          <div class="sessions-list">
            {#each claudeSessions.slice(0, 15) as cs}
              <div class="session-entry claude-entry">
                <div class="session-header">
                  <span class="session-date">{formatRelativeTime(cs.startTime)}</span>
                  <span class="session-duration">{formatDuration(cs.durationMs)}</span>
                </div>
                <div class="cs-details">
                  <span class="cs-messages">{cs.userMessages} msg user / {cs.assistantMessages} msg assistant</span>
                  {#if cs.gitBranch}
                    <span class="cs-branch mono">{cs.gitBranch}</span>
                  {/if}
                </div>
                {#if cs.toolsUsed.length > 0}
                  <div class="session-tools">
                    {#each cs.toolsUsed.slice(0, 8) as tool}
                      <span class="tool-tag">{tool}</span>
                    {/each}
                    {#if cs.toolsUsed.length > 8}
                      <span class="tool-tag more">+{cs.toolsUsed.length - 8}</span>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
            {#if claudeSessions.length > 15}
              <span class="sessions-more">+ {claudeSessions.length - 15} sessions anterieures</span>
            {/if}
          </div>
        {/if}
      </section>

      <!-- Sessions Mugiwara -->
      <section class="detail-section">
        <h4 class="section-title manga">SESSIONS MUGIWARA</h4>
        {#if sessionsLoading}
          <span class="sessions-loading">Chargement...</span>
        {:else if projectSessions.length === 0}
          <span class="sessions-empty">Aucune session enregistree pour ce projet.</span>
        {:else}
          <div class="sessions-list">
            {#each projectSessions as session}
              <div class="session-entry">
                <div class="session-header">
                  <span class="session-date">{formatRelativeTime(session.startTime)}</span>
                  <span class="session-count">{session.invocationCount} invocation{session.invocationCount > 1 ? 's' : ''}</span>
                </div>
                <div class="session-tools">
                  {#each session.agents as agent}
                    <span class="agent-tag">{agent}</span>
                  {/each}
                </div>
                {#if session.pipelineDetected}
                  <span class="session-pipeline">Pipeline: {session.pipelineDetected}</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </section>
    </div>
  </div>
</div>

<style>
  .detail-page {
    display: flex;
    flex-direction: column;
    gap: var(--space-6);
  }

  /* ── Header ──────────────────────────────────────────── */

  .detail-header {
    display: flex;
    align-items: center;
    gap: var(--space-5);
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: var(--space-4) var(--space-6);
    border-top: 3px solid var(--accent);
  }

  .btn-back {
    background: transparent;
    border: 1px solid var(--glass-border);
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: 13px;
    font-weight: 700;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .btn-back:hover {
    border-color: var(--color-gold);
    color: var(--color-gold);
  }

  .header-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .header-title-row {
    display: flex;
    align-items: center;
    gap: var(--space-3);
  }

  .detail-title {
    font-size: 22px;
    font-weight: 400;
    color: var(--color-text-primary);
    letter-spacing: 0.04em;
  }

  .category-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: var(--radius-md);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.08em;
    color: var(--badge-color);
    background: color-mix(in srgb, var(--badge-color) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--badge-color) 30%, transparent);
    white-space: nowrap;
  }

  .detail-path {
    font-size: 12px;
    color: var(--color-text-tertiary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .header-actions {
    display: flex;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .btn-action {
    padding: var(--space-2) var(--space-4);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    font-family: var(--font-ui);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-fast);
    white-space: nowrap;
  }

  .btn-claude {
    background: var(--color-gold);
    color: #09090B;
    border-color: var(--color-gold);
  }

  .btn-claude:hover {
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

  /* ── Content Layout ────────────────────────────────── */

  .detail-content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-6);
  }

  @media (max-width: 1100px) {
    .detail-content {
      grid-template-columns: 1fr;
    }
    .detail-header {
      flex-wrap: wrap;
    }
  }

  .detail-col {
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
  }

  /* ── Sections ──────────────────────────────────────── */

  .detail-section {
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .section-title {
    font-size: 14px;
    color: var(--color-gold);
    letter-spacing: 0.08em;
    padding-bottom: var(--space-1);
    border-bottom: 1px solid var(--glass-border);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .field-label {
    font-size: 10px;
    font-weight: 700;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .field-value {
    font-size: 13px;
    color: var(--color-text-primary);
  }

  .field-value.accent {
    color: var(--color-accent);
    font-weight: 600;
  }

  .field-value.git-clean { color: #34D399; }
  .field-value.git-dirty { color: #FBBF24; }

  .field-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
  }

  .tag {
    display: inline-flex;
    padding: 1px 8px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-secondary);
    background: color-mix(in srgb, var(--color-secondary) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent);
  }

  /* ── Top Agents bars ────────────────────────────────── */

  .top-agents {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-1);
  }

  .agent-bar {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }

  .agent-name {
    font-size: 12px;
    color: var(--color-text-secondary);
    min-width: 80px;
  }

  .agent-bar-fill {
    height: 6px;
    background: var(--color-gold);
    border-radius: 3px;
    min-width: 4px;
    flex: 1;
    max-width: 200px;
  }

  .agent-count {
    font-size: 11px;
    color: var(--color-text-tertiary);
    font-family: var(--font-mono);
  }

  /* ── Key Files ──────────────────────────────────────── */

  .key-files {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .key-file {
    display: inline-flex;
    padding: 2px 10px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 20%, transparent);
  }

  /* ── Sessions ────────────────────────────────────────── */

  .claude-summary {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    font-size: 12px;
    color: var(--color-gold);
    font-weight: 600;
  }

  .cs-sep { opacity: 0.4; }

  .sessions-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .session-entry {
    padding: var(--space-3);
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .claude-entry {
    border-left: 3px solid var(--color-gold);
  }

  .session-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .session-date {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-secondary);
  }

  .session-duration {
    font-size: 11px;
    color: var(--color-accent);
    font-family: var(--font-mono);
    font-weight: 600;
  }

  .session-count {
    font-size: 11px;
    color: var(--color-text-tertiary);
    font-family: var(--font-mono);
  }

  .cs-details {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    font-size: 11px;
    color: var(--color-text-tertiary);
  }

  .cs-branch {
    color: var(--color-accent);
    font-weight: 600;
  }

  .session-tools {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tool-tag {
    display: inline-flex;
    padding: 1px 7px;
    border-radius: var(--radius-sm);
    font-size: 10px;
    font-weight: 600;
    color: var(--color-secondary);
    background: color-mix(in srgb, var(--color-secondary) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent);
  }

  .tool-tag.more {
    color: var(--color-text-tertiary);
    background: color-mix(in srgb, var(--color-text-tertiary) 10%, transparent);
    border-color: color-mix(in srgb, var(--color-text-tertiary) 20%, transparent);
  }

  .agent-tag {
    display: inline-flex;
    padding: 1px 7px;
    border-radius: var(--radius-sm);
    font-size: 11px;
    font-weight: 600;
    color: var(--color-gold);
    background: color-mix(in srgb, var(--color-gold) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-gold) 25%, transparent);
  }

  .session-pipeline {
    font-size: 11px;
    color: var(--color-accent);
    font-weight: 600;
  }

  .sessions-loading,
  .sessions-empty {
    font-size: 12px;
    color: var(--color-text-tertiary);
    font-style: italic;
  }

  .sessions-more {
    font-size: 11px;
    color: var(--color-text-tertiary);
    font-style: italic;
    text-align: center;
    display: block;
  }
</style>
