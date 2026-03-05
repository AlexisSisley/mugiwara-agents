<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import {
    sessions,
    sessionsLoading,
    sessionsError,
    fetchSessions,
    fetchStats,
    stats,
    startPolling,
    stopPolling,
  } from '$lib/stores';
  import Header from '$lib/components/Header.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import SearchInput from '$lib/components/SearchInput.svelte';
  import Pagination from '$lib/components/Pagination.svelte';
  import Drawer from '$lib/components/Drawer.svelte';
  import { formatDuration, formatDateTime, formatNumber, formatRelativeTime } from '$lib/format';
  import type { Session, AgentEvent } from '../../shared/types';

  let search = '';
  let pipelineFilter = '';
  let dateFrom = '';
  let dateTo = '';
  let currentPage = 1;
  let selectedSession: Session | null = null;

  function buildParams(): Record<string, string> {
    const params: Record<string, string> = {
      page: String(currentPage),
      limit: '20',
    };
    if (search) params['search'] = search;
    if (pipelineFilter) params['pipeline'] = pipelineFilter;
    if (dateFrom) params['dateFrom'] = dateFrom;
    if (dateTo) params['dateTo'] = dateTo;
    return params;
  }

  async function reload() {
    await Promise.all([fetchSessions(buildParams()), fetchStats()]);
  }

  function handleSearch(e: CustomEvent<string>) {
    search = e.detail;
    currentPage = 1;
    reload();
  }

  function handlePipelineChange(e: Event) {
    pipelineFilter = (e.target as HTMLInputElement).value;
    currentPage = 1;
    reload();
  }

  function handlePage(e: CustomEvent<number>) {
    currentPage = e.detail;
    reload();
  }

  function selectSession(session: Session) {
    selectedSession = session;
  }

  function getSessionStatus(session: Session): 'pass' | 'running' | 'idle' {
    if (!session.endTime) return 'running';
    if (session.pipelineDetected) return 'pass';
    return 'idle';
  }

  function getEventIcon(event: AgentEvent): string {
    switch (event.event) {
      case 'agent_invocation': return '\u{1F916}';
      case 'smoke_tests': return '\u{1F9EA}';
      case 'session_start': return '\u{25B6}';
      case 'session_stop': return '\u{23F9}';
      default: return '\u{2022}';
    }
  }

  onMount(() => {
    startPolling(reload);
  });

  onDestroy(() => {
    stopPolling();
  });
</script>

<Header title="Sessions" />

<div class="page">
  <!-- KPI Cards -->
  {#if $stats}
    <div class="kpi-row">
      <StatCard label="Sessions" value={formatNumber($stats.totalSessions)} icon="&#128203;" accent="var(--color-info)" />
      <StatCard label="Pipelines" value={formatNumber($stats.totalPipelines)} icon="&#128256;" accent="var(--cat-pipeline)" />
      <StatCard label="Invocations" value={formatNumber($stats.totalInvocations)} accent="var(--color-primary)" icon="&#9889;" />
      <StatCard label="Agents" value={formatNumber($stats.totalAgents)} icon="&#129302;" />
    </div>
  {/if}

  <!-- Toolbar -->
  <div class="toolbar">
    <SearchInput placeholder="Rechercher par session ID..." on:input={handleSearch} />
    <input
      class="filter-input"
      type="text"
      placeholder="Pipeline..."
      value={pipelineFilter}
      on:input={handlePipelineChange}
    />
    <input
      class="filter-input"
      type="date"
      bind:value={dateFrom}
      on:change={reload}
    />
    <input
      class="filter-input"
      type="date"
      bind:value={dateTo}
      on:change={reload}
    />
  </div>

  <!-- Table -->
  {#if $sessionsLoading && !$sessions}
    <div class="loading">Chargement des sessions...</div>
  {:else if $sessionsError}
    <div class="error">{$sessionsError}</div>
  {:else if $sessions}
    <div class="table-wrapper">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-status">Statut</th>
            <th class="col-id">Session ID</th>
            <th class="col-pipeline">Pipeline</th>
            <th class="col-date">Date</th>
            <th class="col-duration">Duree</th>
            <th class="col-agents">Agents</th>
            <th class="col-events">Events</th>
          </tr>
        </thead>
        <tbody>
          {#each $sessions.data as session (session.id)}
            <tr
              class="data-row"
              class:selected={selectedSession?.id === session.id}
              on:click={() => selectSession(session)}
            >
              <td class="col-status">
                <Badge variant={getSessionStatus(session)} small />
              </td>
              <td class="col-id mono">{session.id.slice(0, 12)}...</td>
              <td class="col-pipeline mono">{session.pipelineDetected ?? '--'}</td>
              <td class="col-date">{formatDateTime(session.startTime)}</td>
              <td class="col-duration mono">{formatDuration(session.durationMs)}</td>
              <td class="col-agents mono">{session.agentCount}</td>
              <td class="col-events mono">{session.events.length}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    {#if $sessions.data.length === 0}
      <div class="empty">Aucune session trouvee.</div>
    {/if}

    <Pagination pagination={$sessions.pagination} on:page={handlePage} />
  {/if}
</div>

<!-- Session Detail Drawer with Events Timeline -->
<Drawer
  open={selectedSession !== null}
  title="Session {selectedSession?.id?.slice(0, 12) ?? ''}..."
  width="480px"
  on:close={() => { selectedSession = null; }}
>
  {#if selectedSession}
    <div class="drawer-content">
      <div class="detail-row">
        <span class="detail-label">Session ID</span>
        <span class="mono" style="font-size: 11px; word-break: break-all;">{selectedSession.id}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Pipeline</span>
        <span class="mono">{selectedSession.pipelineDetected ?? 'Aucun'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Debut</span>
        <span>{formatDateTime(selectedSession.startTime)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Fin</span>
        <span>{selectedSession.endTime ? formatDateTime(selectedSession.endTime) : 'En cours'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Duree</span>
        <span class="mono">{formatDuration(selectedSession.durationMs)}</span>
      </div>

      <h4 class="events-title">Events Timeline ({selectedSession.events.length})</h4>
      <div class="events-timeline">
        {#each selectedSession.events as event, idx}
          <div class="timeline-item">
            <div class="timeline-left">
              <div class="timeline-dot">{getEventIcon(event)}</div>
              {#if idx < selectedSession.events.length - 1}
                <div class="timeline-line"></div>
              {/if}
            </div>
            <div class="timeline-content">
              <div class="timeline-event-type">{event.event}</div>
              {#if event.agent}
                <span class="timeline-agent mono">{event.agent}</span>
              {/if}
              <span class="timeline-time">{formatRelativeTime(event.timestamp)}</span>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</Drawer>

<style>
  .page {
    padding: var(--space-6);
    animation: fade-in 200ms ease;
  }

  .kpi-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .toolbar {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
  }

  .filter-input {
    height: 36px;
    padding: 0 var(--space-3);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: 13px;
  }

  .filter-input:focus {
    border-color: var(--color-primary);
    outline: none;
    box-shadow: 0 0 0 2px rgba(232, 163, 23, 0.15);
  }

  .table-wrapper {
    overflow-x: auto;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .data-table thead {
    background: var(--color-bg-alt);
  }

  .data-table th {
    padding: var(--space-3) var(--space-4);
    text-align: left;
    font-weight: 600;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-secondary);
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }

  .data-table td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--color-border);
    vertical-align: middle;
  }

  .data-row {
    cursor: pointer;
    transition: background var(--transition-fast);
  }

  .data-row:hover {
    background: var(--color-surface-hover);
  }

  .data-row.selected {
    background: var(--color-surface-active);
    border-left: 3px solid var(--color-primary);
  }

  .col-status { width: 70px; text-align: center; }
  .col-id { width: 140px; }
  .col-pipeline { width: 120px; }
  .col-date { width: 160px; }
  .col-duration { width: 90px; }
  .col-agents { width: 70px; text-align: right; }
  .col-events { width: 70px; text-align: right; }

  .loading, .error, .empty {
    padding: var(--space-10);
    text-align: center;
    color: var(--color-text-secondary);
    font-size: 14px;
  }

  .error { color: var(--color-error); }

  .drawer-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .detail-row {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  .detail-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-text-tertiary);
  }

  .events-title {
    font-size: 15px;
    font-weight: 600;
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--color-border);
  }

  .events-timeline {
    display: flex;
    flex-direction: column;
  }

  .timeline-item {
    display: flex;
    gap: var(--space-3);
  }

  .timeline-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 24px;
    flex-shrink: 0;
  }

  .timeline-dot {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    flex-shrink: 0;
  }

  .timeline-line {
    width: 2px;
    flex: 1;
    min-height: 16px;
    background: var(--color-border);
  }

  .timeline-content {
    flex: 1;
    padding-bottom: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .timeline-event-type {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .timeline-agent {
    font-size: 11px;
    color: var(--color-primary);
  }

  .timeline-time {
    font-size: 10px;
    color: var(--color-text-tertiary);
  }
</style>
