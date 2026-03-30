// ============================================================
// Reports API Routes
// GET  /api/reports               - List all generated reports
// GET  /api/reports/:weekStart    - Get specific report HTML
// POST /api/reports/generate      - Trigger report generation
// ============================================================

import { Router } from 'express';
import { getAllReports, getReportByWeek, saveReport } from '../db/queries.js';
import { generateWeeklyReport, getPreviousMonday } from '../report/weekly-report.js';
import { renderWeeklyReportHtml } from '../report/html-template.js';
import { getReportHtml } from '../report/send-report.js';
import { mkdirSync, writeFileSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

const router = Router();

// List all reports
router.get('/reports', (_req, res) => {
  try {
    const reports = getAllReports();
    res.json({ data: reports, total: reports.length });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to load reports' });
  }
});

// Get specific report HTML
router.get('/reports/:weekStart', (req, res) => {
  try {
    const { weekStart } = req.params;
    if (!weekStart) {
      res.status(400).json({ error: 'bad_request', message: 'weekStart parameter required' });
      return;
    }

    const html = getReportHtml(weekStart);
    if (!html) {
      res.status(404).json({ error: 'not_found', message: `No report found for week ${weekStart}` });
      return;
    }

    // Return HTML directly for preview
    const format = req.query['format'];
    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      return;
    }

    // Return JSON metadata + html content
    const report = getReportByWeek(weekStart);
    res.json({ ...report, html });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to load report' });
  }
});

// Generate report for a given week
router.post('/reports/generate', (req, res) => {
  try {
    const weekStart = (req.body as { weekStart?: string })?.weekStart ?? getPreviousMonday();

    // Check if already generated
    const existing = getReportByWeek(weekStart);
    if (existing) {
      const html = getReportHtml(weekStart);
      res.json({ ...existing, html, alreadyExisted: true });
      return;
    }

    // Generate
    const data = generateWeeklyReport(weekStart);
    const html = renderWeeklyReportHtml(data);

    // Save HTML file
    const reportsDir = path.join(homedir(), '.mugiwara', 'reports');
    mkdirSync(reportsDir, { recursive: true });
    const htmlPath = path.join(reportsDir, `weekly-${weekStart}.html`);
    writeFileSync(htmlPath, html, 'utf-8');

    // Save to DB
    saveReport({
      weekStart,
      weekEnd: data.weekEnd,
      htmlPath,
      status: 'generated',
    });

    res.json({
      week_start: weekStart,
      week_end: data.weekEnd,
      html_path: htmlPath,
      status: 'generated',
      summary: data.summary,
      html,
    });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to generate report' });
  }
});

// Regenerate report (force re-creation even if exists)
router.post('/reports/regenerate', (req, res) => {
  try {
    const weekStart = (req.body as { weekStart?: string })?.weekStart ?? getPreviousMonday();

    // Generate fresh data
    const data = generateWeeklyReport(weekStart);
    const html = renderWeeklyReportHtml(data);

    // Save HTML file (overwrite if exists)
    const reportsDir = path.join(homedir(), '.mugiwara', 'reports');
    mkdirSync(reportsDir, { recursive: true });
    const htmlPath = path.join(reportsDir, `weekly-${weekStart}.html`);
    writeFileSync(htmlPath, html, 'utf-8');

    // Upsert to DB (saveReport uses INSERT OR REPLACE)
    saveReport({
      weekStart,
      weekEnd: data.weekEnd,
      htmlPath,
      status: 'generated',
    });

    res.json({
      week_start: weekStart,
      week_end: data.weekEnd,
      html_path: htmlPath,
      status: 'generated',
      summary: data.summary,
      html,
    });
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to regenerate report' });
  }
});

export default router;
