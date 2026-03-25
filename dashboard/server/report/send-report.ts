// ============================================================
// Send Report - Reads generated HTML and returns it for
// Gmail draft creation via Claude MCP
// ============================================================

import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { getReportByWeek, saveReport } from '../db/queries.js';

const REPORTS_DIR = path.join(homedir(), '.mugiwara', 'reports');

/**
 * Gets the HTML content of a weekly report for Gmail draft creation.
 * Returns null if the report doesn't exist.
 */
export function getReportHtml(weekStart: string): string | null {
  const htmlPath = path.join(REPORTS_DIR, `weekly-${weekStart}.html`);
  if (!existsSync(htmlPath)) return null;
  return readFileSync(htmlPath, 'utf-8');
}

/**
 * Marks a report as having a Gmail draft created.
 */
export function markReportAsDraft(weekStart: string, draftId: string): void {
  const existing = getReportByWeek(weekStart);
  if (existing) {
    saveReport({
      weekStart,
      weekEnd: existing.week_end,
      htmlPath: existing.html_path ?? undefined,
      draftId,
      status: 'draft_created',
    });
  }
}

/**
 * Returns the path to the latest pending report (generated but no draft yet).
 * Useful for the Monday auto-trigger hook.
 */
export function getLatestPendingReport(): { weekStart: string; htmlPath: string } | null {
  const report = getReportByWeek(getPreviousMonday());
  if (report && report.status === 'generated' && report.html_path) {
    return { weekStart: report.week_start, htmlPath: report.html_path };
  }
  return null;
}

// Re-export for convenience
import { getPreviousMonday } from './weekly-report.js';
