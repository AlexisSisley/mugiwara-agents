<script lang="ts">
  import { onMount } from 'svelte';
  import {
    reports,
    reportsLoading,
    reportsError,
    selectedReport,
    fetchReports,
    generateReport,
    fetchReport,
  } from '$lib/stores';
  import Header from '$lib/components/Header.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import Drawer from '$lib/components/Drawer.svelte';
  import { formatRelativeTime } from '$lib/format';
  import type { WeeklyReport } from '../../shared/types';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { addToast } from '$lib/toast-store';

  let generating = false;

  onMount(() => {
    fetchReports();
  });

  $: reportList = $reports?.data ?? [];
  $: totalReports = $reports?.total ?? 0;
  $: lastGenerated = reportList.length > 0
    ? reportList[0]
    : null;

  function getStatusVariant(status: string): 'pass' | 'warning' | 'running' {
    if (status === 'generated') return 'pass';
    if (status === 'sent') return 'pass';
    return 'running';
  }

  function formatWeekRange(report: WeeklyReport): string {
    const start = new Date(report.week_start);
    const end = new Date(report.week_end);
    const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return `${start.toLocaleDateString('fr-FR', opts)} - ${end.toLocaleDateString('fr-FR', opts)}`;
  }

  async function handleGenerate() {
    generating = true;
    const result = await generateReport();
    generating = false;
    if (result) {
      addToast(
        result.alreadyExisted
          ? 'Rapport deja existant — affichage en cours.'
          : 'Rapport genere avec succes !',
        'success'
      );
      selectedReport.set(result);
    } else {
      addToast('Erreur lors de la generation.', 'error');
    }
  }

  async function selectReport(report: WeeklyReport) {
    await fetchReport(report.week_start);
  }
</script>

<Header title="REPORTS" />

<div class="page">
  {#if $reportsLoading && !$reports}
    <div class="kpi-row">
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
      <Skeleton variant="stat-card" />
    </div>
    <div class="reports-grid" style="margin-top: var(--space-4);">
      <Skeleton variant="card" height="100px" />
      <Skeleton variant="card" height="100px" />
      <Skeleton variant="card" height="100px" />
    </div>
  {:else if $reportsError}
    <div class="error">{$reportsError}</div>
  {:else}
    <!-- KPI Row -->
    <div class="kpi-row">
      <StatCard
        label="Total Rapports"
        value={totalReports}
        icon="&#x1F4DC;"
        accent="var(--color-primary)"
      />
      <StatCard
        label="Dernier Rapport"
        value={lastGenerated ? formatWeekRange(lastGenerated) : '--'}
        icon="&#x1F4C5;"
        accent="var(--color-secondary)"
      />
      <StatCard
        label="Statut"
        value={lastGenerated?.status ?? '--'}
        icon="&#x2705;"
        accent="var(--color-accent)"
      />
    </div>

    <!-- Toolbar -->
    <div class="toolbar">
      <h3 class="section-title manga">JOURNAL DE BORD</h3>
      <div class="toolbar-actions">
        <button
          class="generate-btn manga"
          on:click={handleGenerate}
          disabled={generating}
        >
          {#if generating}
            <span class="anim-spin">{'\u{2699}'}</span> Generation...
          {:else}
            {'\u{1F4DD}'} Generer un Rapport
          {/if}
        </button>
      </div>
    </div>

    <!-- Reports Grid -->
    {#if reportList.length === 0}
      <EmptyState
        icon={'\u{1F4DC}'}
        title="Aucun rapport genere"
        subtitle="Clique sur 'Generer un Rapport' pour creer ton premier Journal de Bord !"
        actionLabel="Generer un Rapport"
        on:action={handleGenerate}
      />
    {:else}
      <div class="reports-grid">
        {#each reportList as report}
          <button
            class="report-card"
            class:active={$selectedReport?.week_start === report.week_start}
            on:click={() => selectReport(report)}
          >
            <div class="report-week manga">{formatWeekRange(report)}</div>
            <div class="report-meta">
              <Badge variant={getStatusVariant(report.status)} small>
                {report.status}
              </Badge>
              <span class="report-date mono">{formatRelativeTime(report.generated_at)}</span>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<!-- Report Viewer Drawer -->
<Drawer
  open={$selectedReport !== null}
  title="Rapport Hebdomadaire"
  width="720px"
  on:close={() => { selectedReport.set(null); }}
>
  {#if $selectedReport}
    <div class="report-viewer">
      <div class="report-header-info">
        <span class="detail-label">Semaine</span>
        <span class="detail-value manga">{$selectedReport.week_start} - {$selectedReport.week_end}</span>
      </div>
      <div class="report-html-container">
        {@html $selectedReport.html}
      </div>
    </div>
  {/if}
</Drawer>

<style>
  .page {
    padding: var(--space-6);
    animation: fade-in 250ms ease;
  }

  .kpi-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: var(--space-4);
  }

  .section-title {
    font-size: 16px;
    color: var(--color-text-secondary);
    letter-spacing: 0.06em;
    text-shadow: none;
  }

  .generate-btn {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-4);
    background: var(--color-gold);
    color: #09090B;
    border: none;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    transition: all var(--transition-fast);
    box-shadow: var(--shadow-md);
  }

  .generate-btn:hover:not(:disabled) {
    background: var(--color-gold-light);
    transform: translateY(-1px);
    box-shadow: var(--shadow-lg);
  }

  .generate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .reports-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: var(--space-4);
  }

  .report-card {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-5);
    background: var(--glass-bg);
    backdrop-filter: var(--glass-blur);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
    width: 100%;
    font-family: var(--font-ui);
    color: var(--color-text-primary);
  }

  .report-card:hover {
    border-color: rgba(201, 168, 76, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  }

  .report-card.active {
    border-color: var(--color-gold);
    box-shadow: var(--shadow-glow-gold);
  }

  .report-week {
    font-size: 18px;
    color: var(--color-gold);
    letter-spacing: 1px;
  }

  .report-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .report-date {
    font-size: 11px;
    color: var(--color-text-tertiary);
  }

  /* Report Viewer */
  .report-viewer {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .report-header-info {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    padding-bottom: var(--space-4);
    border-bottom: 1px solid var(--glass-border);
  }

  .detail-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-tertiary);
  }

  .detail-value {
    font-size: 16px;
    color: var(--color-gold);
  }

  .report-html-container {
    padding: var(--space-4);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    color: var(--color-text-primary);
    font-size: 13px;
    line-height: 1.6;
    overflow-x: auto;
    max-height: 70vh;
    overflow-y: auto;
  }

  .error {
    padding: var(--space-10);
    text-align: center;
    background: rgba(248, 113, 113, 0.1);
    border: 1px solid rgba(248, 113, 113, 0.3);
    color: #F87171;
    border-radius: var(--radius-md);
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-3);
  }

  @media (max-width: 768px) {
    .kpi-row { grid-template-columns: 1fr; }
    .reports-grid { grid-template-columns: 1fr; }
  }
</style>
