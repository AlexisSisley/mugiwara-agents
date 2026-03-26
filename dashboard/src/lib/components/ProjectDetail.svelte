<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import type { ProjectInfo, ProjectFile, ProjectFileContent, ProjectSession, ClaudeSessionInfo, DocFileCategory } from '../../../shared/types';
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

  // File viewer state
  let selectedFile: ProjectFile | null = null;
  let fileContent: ProjectFileContent | null = null;
  let fileLoading = false;
  let fileError: string | null = null;

  const CATEGORY_ICONS: Record<DocFileCategory, string> = {
    doc: '\u{1F4C4}',
    sql: '\u{1F5C3}',
    config: '\u2699\uFE0F',
    schema: '\u{1F9E9}',
    ci: '\u{1F680}',
    other: '\u{1F4CE}',
  };

  const CATEGORY_DOC_LABELS: Record<DocFileCategory, string> = {
    doc: 'Documentation',
    sql: 'SQL',
    config: 'Configuration',
    schema: 'Schemas',
    ci: 'CI/CD',
    other: 'Autres',
  };

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getDocFileCategories(files: ProjectFile[]): DocFileCategory[] {
    const cats = new Set(files.map(f => f.category));
    const order: DocFileCategory[] = ['doc', 'sql', 'schema', 'config', 'ci', 'other'];
    return order.filter(c => cats.has(c));
  }

  async function openFile(file: ProjectFile) {
    selectedFile = file;
    fileContent = null;
    fileError = null;
    fileLoading = true;
    try {
      fileContent = await api.getProjectFile(project.name, file.relativePath);
    } catch (err) {
      fileError = err instanceof Error ? err.message : 'Erreur de chargement';
    } finally {
      fileLoading = false;
    }
  }

  function closeViewer() {
    selectedFile = null;
    fileContent = null;
    fileError = null;
  }

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

      <!-- Documentation & Files Section -->
      {#if project.docFiles && project.docFiles.length > 0}
        <section class="detail-section">
          <h4 class="section-title manga">DOCUMENTATION & FICHIERS</h4>
          <span class="doc-count">{project.docFiles.length} fichier{project.docFiles.length > 1 ? 's' : ''}</span>
          {#each getDocFileCategories(project.docFiles) as cat}
            <div class="doc-category">
              <span class="doc-category-label">{CATEGORY_ICONS[cat]} {CATEGORY_DOC_LABELS[cat]}</span>
              <div class="doc-files-list">
                {#each project.docFiles.filter(f => f.category === cat) as file}
                  <button
                    class="doc-file-btn"
                    class:active={selectedFile?.relativePath === file.relativePath}
                    on:click={() => openFile(file)}
                    title={file.relativePath}
                  >
                    <span class="doc-file-name mono">{file.relativePath}</span>
                    <span class="doc-file-size">{formatSize(file.sizeBytes)}</span>
                  </button>
                {/each}
              </div>
            </div>
          {/each}
        </section>
      {:else if project.keyFiles.length > 0}
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

  <!-- File Viewer Overlay -->
  {#if selectedFile}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="file-viewer-overlay" on:click|self={closeViewer} role="dialog" aria-label="File viewer">
      <div class="file-viewer">
        <div class="file-viewer-header">
          <div class="file-viewer-info">
            <span class="file-viewer-icon">{CATEGORY_ICONS[selectedFile.category]}</span>
            <span class="file-viewer-name mono">{selectedFile.relativePath}</span>
            {#if fileContent}
              <span class="file-viewer-lang">{fileContent.language}</span>
            {/if}
          </div>
          <button class="file-viewer-close" on:click={closeViewer}>&times;</button>
        </div>
        <div class="file-viewer-body">
          {#if fileLoading}
            <div class="file-viewer-loading">Chargement...</div>
          {:else if fileError}
            <div class="file-viewer-error">{fileError}</div>
          {:else if fileContent}
            <pre class="file-viewer-content"><code>{fileContent.content}</code></pre>
          {/if}
        </div>
      </div>
    </div>
  {/if}
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

  /* ── Key Files (fallback) ────────────────────────────── */

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

  /* ── Documentation & Files ─────────────────────────── */

  .doc-count {
    font-size: 11px;
    color: var(--color-text-tertiary);
  }

  .doc-category {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .doc-category-label {
    font-size: 11px;
    font-weight: 700;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .doc-files-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .doc-file-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    padding: var(--space-1) var(--space-3);
    background: rgba(255,255,255,0.02);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
    font-family: inherit;
  }

  .doc-file-btn:hover {
    background: rgba(255,255,255,0.06);
    border-color: var(--glass-border);
  }

  .doc-file-btn.active {
    background: color-mix(in srgb, var(--color-gold) 12%, transparent);
    border-color: color-mix(in srgb, var(--color-gold) 30%, transparent);
  }

  .doc-file-name {
    font-size: 12px;
    color: var(--color-accent);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
  }

  .doc-file-size {
    font-size: 10px;
    color: var(--color-text-tertiary);
    font-family: var(--font-mono);
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* ── File Viewer Overlay ───────────────────────────── */

  .file-viewer-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
  }

  .file-viewer {
    width: 100%;
    max-width: 900px;
    max-height: 85vh;
    background: var(--color-surface);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 24px 80px rgba(0,0,0,0.5);
  }

  .file-viewer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-3) var(--space-5);
    border-bottom: 1px solid var(--glass-border);
    background: rgba(255,255,255,0.03);
    flex-shrink: 0;
  }

  .file-viewer-info {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
  }

  .file-viewer-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .file-viewer-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--color-text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .file-viewer-lang {
    padding: 1px 8px;
    border-radius: var(--radius-sm);
    font-size: 10px;
    font-weight: 700;
    color: var(--color-secondary);
    background: color-mix(in srgb, var(--color-secondary) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-secondary) 25%, transparent);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }

  .file-viewer-close {
    background: transparent;
    border: 1px solid var(--glass-border);
    color: var(--color-text-secondary);
    font-size: 20px;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .file-viewer-close:hover {
    border-color: #F87171;
    color: #F87171;
    background: rgba(248,113,113,0.1);
  }

  .file-viewer-body {
    flex: 1;
    overflow: auto;
    min-height: 0;
  }

  .file-viewer-content {
    margin: 0;
    padding: var(--space-4) var(--space-5);
    font-family: var(--font-mono);
    font-size: 12px;
    line-height: 1.6;
    color: var(--color-text-primary);
    white-space: pre-wrap;
    word-wrap: break-word;
    tab-size: 2;
  }

  .file-viewer-content code {
    font-family: inherit;
  }

  .file-viewer-loading {
    padding: var(--space-8);
    text-align: center;
    font-size: 13px;
    color: var(--color-text-tertiary);
    font-style: italic;
  }

  .file-viewer-error {
    padding: var(--space-8);
    text-align: center;
    font-size: 13px;
    color: #F87171;
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
