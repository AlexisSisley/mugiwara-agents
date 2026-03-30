<script lang="ts">
  import { onMount } from 'svelte';
  import {
    reports,
    reportsLoading,
    reportsError,
    selectedReport,
    fetchReports,
    generateReport,
    regenerateReport,
    fetchReport,
  } from '$lib/stores';
  import Header from '$lib/components/Header.svelte';
  import StatCard from '$lib/components/StatCard.svelte';
  import Badge from '$lib/components/Badge.svelte';
  import { formatRelativeTime } from '$lib/format';
  import type { WeeklyReport } from '../../shared/types';
  import Skeleton from '$lib/components/Skeleton.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { addToast } from '$lib/toast-store';

  let generating = false;
  let regenerating = false;

  // Modal state
  let showHtmlModal = false;
  let copied = false;
  let htmlSourceEl: HTMLTextAreaElement;

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

  async function handleRegenerate() {
    const weekStart = $selectedReport?.week_start;
    regenerating = true;
    const result = await regenerateReport(weekStart);
    regenerating = false;
    if (result) {
      addToast('Rapport regenere avec les dernieres donnees !', 'success');
      selectedReport.set(result);
    } else {
      addToast('Erreur lors de la regeneration.', 'error');
    }
  }

  async function selectReport(report: WeeklyReport) {
    await fetchReport(report.week_start);
  }

  function openHtmlModal() {
    showHtmlModal = true;
    copied = false;
  }

  function closeHtmlModal() {
    showHtmlModal = false;
    copied = false;
  }

  async function copyHtml() {
    const html = $selectedReport?.html;
    if (!html) return;

    try {
      // Copy as rich HTML (for pasting in Gmail)
      const blob = new Blob([html], { type: 'text/html' });
      const clipboardItem = new ClipboardItem({
        'text/html': blob,
        'text/plain': new Blob([html], { type: 'text/plain' }),
      });
      await navigator.clipboard.write([clipboardItem]);
      copied = true;
      addToast('HTML copie ! Colle-le dans Gmail avec Ctrl+V.', 'success');
      setTimeout(() => { copied = false; }, 3000);
    } catch {
      // Fallback: copy as plain text
      try {
        await navigator.clipboard.writeText(html);
        copied = true;
        addToast('HTML copie en texte brut (fallback).', 'success');
        setTimeout(() => { copied = false; }, 3000);
      } catch {
        addToast('Impossible de copier dans le presse-papier.', 'error');
      }
    }
  }

  function handleModalKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') closeHtmlModal();
  }
</script>

<svelte:window on:keydown={handleModalKeydown} />

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
{#if $selectedReport}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="drawer-overlay" on:click={() => selectedReport.set(null)}>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="drawer anim-slide-in" on:click|stopPropagation>
      <div class="drawer-header">
        <div class="drawer-title-group">
          <h3 class="drawer-title manga">Rapport Hebdomadaire</h3>
          <span class="drawer-subtitle">{$selectedReport.week_start} - {$selectedReport.week_end}</span>
        </div>
        <div class="drawer-actions">
          <button
            class="btn-regen"
            on:click={handleRegenerate}
            disabled={regenerating}
            title="Regenerer avec les dernieres donnees"
          >
            {#if regenerating}
              <span class="anim-spin">{'\u{2699}'}</span>
            {:else}
              {'\u{1F504}'}
            {/if}
            Regenerer
          </button>
          <button
            class="btn-gmail"
            on:click={openHtmlModal}
            title="Copier le HTML pour Gmail"
          >
            {'\u{1F4E7}'} Copier pour Gmail
          </button>
          <button class="drawer-close" on:click={() => selectedReport.set(null)}>&times;</button>
        </div>
      </div>
      <div class="drawer-body">
        <div class="report-html-container">
          {@html $selectedReport.html}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- HTML Copy Modal for Gmail -->
{#if showHtmlModal && $selectedReport}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-overlay" on:click|self={closeHtmlModal}>
    <div class="modal">
      <div class="modal-header">
        <div class="modal-title-group">
          <h3 class="modal-title manga">Exporter pour Gmail</h3>
          <span class="modal-subtitle">Copie le HTML et colle-le dans un brouillon Gmail</span>
        </div>
        <button class="modal-close" on:click={closeHtmlModal}>&times;</button>
      </div>

      <div class="modal-body">
        <!-- Preview -->
        <div class="modal-section">
          <div class="modal-section-header">
            <span class="modal-section-title">{'\u{1F441}'} Apercu</span>
          </div>
          <div class="modal-preview">
            <iframe
              title="Apercu du rapport"
              srcdoc={$selectedReport.html}
              class="preview-iframe"
            ></iframe>
          </div>
        </div>

        <!-- Instructions -->
        <div class="modal-instructions">
          <div class="step">
            <span class="step-num">1</span>
            <span>Clique sur <strong>"Copier le HTML"</strong> ci-dessous</span>
          </div>
          <div class="step">
            <span class="step-num">2</span>
            <span>Ouvre Gmail et cree un <strong>nouveau brouillon</strong></span>
          </div>
          <div class="step">
            <span class="step-num">3</span>
            <span>Colle avec <strong>Ctrl+V</strong> dans le corps du mail</span>
          </div>
        </div>

        <!-- Source (collapsible) -->
        <details class="modal-source-details">
          <summary class="modal-source-summary mono">Voir le code source HTML</summary>
          <textarea
            bind:this={htmlSourceEl}
            class="modal-source mono"
            readonly
            rows="12"
          >{$selectedReport.html}</textarea>
        </details>
      </div>

      <div class="modal-footer">
        <button class="btn-cancel" on:click={closeHtmlModal}>Fermer</button>
        <button
          class="btn-copy"
          class:copied
          on:click={copyHtml}
        >
          {#if copied}
            {'\u{2705}'} Copie !
          {:else}
            {'\u{1F4CB}'} Copier le HTML
          {/if}
        </button>
      </div>
    </div>
  </div>
{/if}

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

  /* ── Drawer ──────────────────────────────────────── */

  .drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    z-index: 100;
    display: flex;
    justify-content: flex-end;
  }

  .drawer {
    height: 100%;
    width: 760px;
    max-width: 90vw;
    background: var(--color-bg);
    border-left: 1px solid var(--glass-border);
    border-radius: var(--radius-xl) 0 0 var(--radius-xl);
    display: flex;
    flex-direction: column;
    box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-4) var(--space-6);
    border-bottom: 1px solid var(--glass-border);
    gap: var(--space-3);
    flex-shrink: 0;
  }

  .drawer-title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .drawer-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text-primary);
    letter-spacing: 0.02em;
  }

  .drawer-subtitle {
    font-size: 12px;
    color: var(--color-text-tertiary);
    font-family: var(--font-mono);
  }

  .drawer-actions {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-shrink: 0;
  }

  .btn-regen {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-3);
    background: transparent;
    color: var(--color-text-secondary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
    font-family: var(--font-ui);
    white-space: nowrap;
  }

  .btn-regen:hover:not(:disabled) {
    border-color: var(--color-gold);
    color: var(--color-gold);
    background: var(--color-gold-dim);
  }

  .btn-regen:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-gmail {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: var(--space-1) var(--space-3);
    background: var(--color-gold);
    color: #09090B;
    border: none;
    border-radius: var(--radius-md);
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-fast);
    font-family: var(--font-ui);
    white-space: nowrap;
  }

  .btn-gmail:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .drawer-close {
    background: rgba(255,255,255,0.06);
    border: 1px solid var(--glass-border);
    color: var(--color-text-secondary);
    font-size: 18px;
    cursor: pointer;
    padding: var(--space-1) var(--space-2);
    line-height: 1;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);
  }

  .drawer-close:hover {
    color: #F87171;
    border-color: rgba(248,113,113,0.3);
    background: rgba(248,113,113,0.1);
  }

  .drawer-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-5);
    background: var(--color-bg);
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
  }

  /* ── Modal ──────────────────────────────────────── */

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(8px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-6);
  }

  .modal {
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    background: var(--color-surface, #1a1a2e);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 32px 80px rgba(0, 0, 0, 0.6);
    animation: modal-in 200ms ease;
  }

  @keyframes modal-in {
    from { opacity: 0; transform: scale(0.96) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--space-5) var(--space-6);
    border-bottom: 1px solid var(--glass-border);
    background: rgba(255,255,255,0.02);
    flex-shrink: 0;
  }

  .modal-title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .modal-title {
    font-size: 20px;
    color: var(--color-gold);
    letter-spacing: 0.04em;
  }

  .modal-subtitle {
    font-size: 12px;
    color: var(--color-text-tertiary);
  }

  .modal-close {
    background: transparent;
    border: 1px solid var(--glass-border);
    color: var(--color-text-secondary);
    font-size: 22px;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
    flex-shrink: 0;
  }

  .modal-close:hover {
    border-color: #F87171;
    color: #F87171;
    background: rgba(248,113,113,0.1);
  }

  .modal-body {
    flex: 1;
    overflow-y: auto;
    padding: var(--space-5) var(--space-6);
    display: flex;
    flex-direction: column;
    gap: var(--space-5);
    min-height: 0;
  }

  .modal-section-header {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .modal-section-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .modal-preview {
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    overflow: hidden;
    background: #fff;
  }

  .preview-iframe {
    width: 100%;
    height: 350px;
    border: none;
    display: block;
  }

  /* Instructions */
  .modal-instructions {
    display: flex;
    gap: var(--space-4);
    padding: var(--space-4);
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
  }

  .step {
    flex: 1;
    display: flex;
    align-items: flex-start;
    gap: var(--space-2);
    font-size: 12px;
    color: var(--color-text-secondary);
    line-height: 1.5;
  }

  .step-num {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--color-gold);
    color: #09090B;
    font-size: 11px;
    font-weight: 800;
    flex-shrink: 0;
  }

  /* Source details */
  .modal-source-details {
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .modal-source-summary {
    padding: var(--space-3) var(--space-4);
    font-size: 11px;
    color: var(--color-text-tertiary);
    cursor: pointer;
    background: rgba(255,255,255,0.02);
    transition: all var(--transition-fast);
    user-select: none;
  }

  .modal-source-summary:hover {
    color: var(--color-text-secondary);
    background: rgba(255,255,255,0.04);
  }

  .modal-source {
    width: 100%;
    padding: var(--space-3) var(--space-4);
    background: rgba(0,0,0,0.3);
    color: var(--color-text-tertiary);
    border: none;
    border-top: 1px solid var(--glass-border);
    font-size: 11px;
    line-height: 1.5;
    resize: vertical;
    outline: none;
    box-sizing: border-box;
  }

  /* Footer */
  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: var(--space-3);
    padding: var(--space-4) var(--space-6);
    border-top: 1px solid var(--glass-border);
    background: rgba(255,255,255,0.02);
    flex-shrink: 0;
  }

  .btn-cancel {
    padding: var(--space-2) var(--space-5);
    background: transparent;
    color: var(--color-text-secondary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
    font-family: var(--font-ui);
  }

  .btn-cancel:hover {
    border-color: var(--color-text-tertiary);
    color: var(--color-text-primary);
  }

  .btn-copy {
    padding: var(--space-2) var(--space-5);
    background: var(--color-gold);
    color: #09090B;
    border: none;
    border-radius: var(--radius-md);
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all var(--transition-fast);
    font-family: var(--font-ui);
    min-width: 160px;
  }

  .btn-copy:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  .btn-copy.copied {
    background: #34D399;
    color: #09090B;
  }

  @media (max-width: 768px) {
    .kpi-row { grid-template-columns: 1fr; }
    .reports-grid { grid-template-columns: 1fr; }
    .modal-instructions { flex-direction: column; }
    .drawer { width: 100%; max-width: none; border-radius: 0; }
  }
</style>
