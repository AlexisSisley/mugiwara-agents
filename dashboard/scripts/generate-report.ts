#!/usr/bin/env tsx
// ============================================================
// CLI: Generate Weekly Report
// Usage: npx tsx scripts/generate-report.ts [--week YYYY-MM-DD] [--auto]
// ============================================================

import { mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { openDb, closeDb } from '../server/db/index.js';
import { getReportByWeek, saveReport } from '../server/db/queries.js';
import { generateWeeklyReport, getPreviousMonday } from '../server/report/weekly-report.js';
import { renderWeeklyReportHtml } from '../server/report/html-template.js';

function parseArgs(): { week: string; auto: boolean } {
  const args = process.argv.slice(2);
  let week = getPreviousMonday();
  let auto = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--week' && args[i + 1]) {
      week = args[i + 1]!;
      i++;
    }
    if (args[i] === '--auto') {
      auto = true;
    }
  }

  return { week, auto };
}

async function main(): Promise<void> {
  const { week, auto } = parseArgs();

  console.log(`[mugiwara-report] Generating weekly report for week of ${week}...`);

  // Initialize DB (async for sql.js)
  await openDb();

  // Check if already generated (auto mode)
  if (auto) {
    const existing = getReportByWeek(week);
    if (existing) {
      console.log(`[mugiwara-report] Report already exists for ${week}. Skipping (--auto mode).`);
      closeDb();
      return;
    }
  }

  // Generate report data
  const data = generateWeeklyReport(week);

  // Render HTML
  const html = renderWeeklyReportHtml(data);

  // Save HTML file
  const reportsDir = path.join(homedir(), '.mugiwara', 'reports');
  mkdirSync(reportsDir, { recursive: true });
  const htmlPath = path.join(reportsDir, `weekly-${week}.html`);
  writeFileSync(htmlPath, html, 'utf-8');
  console.log(`[mugiwara-report] HTML saved to: ${htmlPath}`);

  // Save to database
  saveReport({
    weekStart: week,
    weekEnd: data.weekEnd,
    htmlPath,
    status: 'generated',
  });

  console.log(`[mugiwara-report] Report registered in database.`);
  console.log(`[mugiwara-report] Summary: ${data.summary.totalSessions} sessions, ${data.summary.totalInvocations} invocations, ${data.summary.uniqueAgents} agents, ${data.summary.successRate}% success rate`);
  console.log(`[mugiwara-report]   Pro: ${data.sections.pro.invocationCount} inv | POC: ${data.sections.poc.invocationCount} inv | Perso: ${data.sections.perso.invocationCount} inv`);

  closeDb();
}

main().catch((err) => {
  console.error('[mugiwara-report] Failed:', err);
  closeDb();
  process.exit(1);
});
