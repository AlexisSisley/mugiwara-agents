// ============================================================
// Weekly Report HTML Template
// Inline CSS only (Gmail/Outlook compatible)
// Table-based layout, max-width 600px
// ============================================================

import type { WeeklyReportData, CategorySection } from './weekly-report.js';
import type { Category } from '../db/category-detector.js';

const COLORS: Record<Category, { bg: string; text: string; light: string; label: string }> = {
  pro:   { bg: '#3B82F6', text: '#1E3A5F', light: '#EFF6FF', label: 'Pro (Sisley)' },
  poc:   { bg: '#F59E0B', text: '#78350F', light: '#FFFBEB', label: 'POC' },
  perso: { bg: '#10B981', text: '#064E3B', light: '#ECFDF5', label: 'Perso' },
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function kpiCard(label: string, value: string | number, color: string): string {
  return `
    <td style="width:25%;padding:8px;">
      <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#1E293B;border-radius:8px;border:2px solid ${color};">
        <tr>
          <td style="padding:16px;text-align:center;">
            <div style="font-size:28px;font-weight:bold;color:${color};font-family:'Segoe UI',Arial,sans-serif;">${value}</div>
            <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;letter-spacing:1px;margin-top:4px;font-family:'Segoe UI',Arial,sans-serif;">${label}</div>
          </td>
        </tr>
      </table>
    </td>`;
}

function agentBar(name: string, count: number, maxCount: number, color: string): string {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return `
    <tr>
      <td style="padding:4px 8px;font-size:13px;color:#CBD5E1;font-family:'Segoe UI',Arial,sans-serif;width:120px;">${name}</td>
      <td style="padding:4px 8px;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
          <tr>
            <td style="background:#334155;border-radius:4px;height:20px;width:100%;">
              <div style="background:${color};border-radius:4px;height:20px;width:${pct}%;min-width:${pct > 0 ? '20px' : '0'};"></div>
            </td>
            <td style="padding-left:8px;font-size:12px;color:#94A3B8;white-space:nowrap;font-family:'Segoe UI',Arial,sans-serif;">${count}</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function tagList(items: string[], color: string): string {
  if (items.length === 0) return '<span style="color:#64748B;font-size:12px;font-style:italic;">Aucun</span>';
  return items.map((item) =>
    `<span style="display:inline-block;background:${color};color:white;border-radius:12px;padding:2px 10px;font-size:12px;margin:2px 4px 2px 0;font-family:'Segoe UI',Arial,sans-serif;">${item}</span>`
  ).join('');
}

function categorySection(cat: Category, section: CategorySection): string {
  const c = COLORS[cat];
  const isEmpty = section.invocationCount === 0 && section.sessionCount === 0;
  const maxAgent = section.topAgents.length > 0 ? section.topAgents[0]!.count : 0;

  return `
    <table cellpadding="0" cellspacing="0" border="0" style="width:100%;margin-bottom:24px;background:${c.light};border-radius:8px;border:2px solid ${c.bg};">
      <tr>
        <td style="background:${c.bg};padding:12px 20px;border-radius:6px 6px 0 0;">
          <span style="font-size:18px;font-weight:bold;color:white;font-family:'Segoe UI',Arial,sans-serif;">${c.label}</span>
          <span style="float:right;font-size:13px;color:rgba(255,255,255,0.8);font-family:'Segoe UI',Arial,sans-serif;">${section.invocationCount} invocations &bull; ${section.sessionCount} sessions</span>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 20px;">
          ${isEmpty ? `
            <p style="color:#64748B;font-style:italic;text-align:center;font-family:'Segoe UI',Arial,sans-serif;">Aucune activite cette semaine</p>
          ` : `
            ${section.topAgents.length > 0 ? `
              <div style="margin-bottom:12px;">
                <div style="font-size:13px;font-weight:bold;color:${c.text};margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;font-family:'Segoe UI',Arial,sans-serif;">Top Agents</div>
                <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                  ${section.topAgents.slice(0, 5).map((a) => agentBar(a.name, a.count, maxAgent, c.bg)).join('')}
                </table>
              </div>
            ` : ''}
            ${section.projects.length > 0 ? `
              <div style="margin-bottom:8px;">
                <div style="font-size:13px;font-weight:bold;color:${c.text};margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;font-family:'Segoe UI',Arial,sans-serif;">Projets</div>
                ${tagList(section.projects, c.bg)}
              </div>
            ` : ''}
            ${section.subjects.length > 0 ? `
              <div>
                <div style="font-size:13px;font-weight:bold;color:${c.text};margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px;font-family:'Segoe UI',Arial,sans-serif;">Sujets</div>
                ${tagList(section.subjects, c.bg)}
              </div>
            ` : ''}
          `}
        </td>
      </tr>
    </table>`;
}

/**
 * Renders the full weekly report as an HTML email string.
 * Uses only inline CSS and table layout for Gmail/Outlook compatibility.
 */
export function renderWeeklyReportHtml(data: WeeklyReportData): string {
  const weekLabel = `${formatDate(data.weekStart)} — ${formatDate(data.weekEnd)}`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mugiwara Weekly - ${weekLabel}</title>
</head>
<body style="margin:0;padding:0;background:#0F172A;font-family:'Segoe UI',Arial,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" style="width:100%;background:#0F172A;">
    <tr>
      <td align="center" style="padding:20px 10px;">
        <table cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#E63946,#38BDF8);padding:24px 30px;border-radius:12px 12px 0 0;text-align:center;">
              <div style="font-size:28px;font-weight:bold;color:white;font-family:'Segoe UI',Arial,sans-serif;">&#9781; Mugiwara Weekly</div>
              <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:6px;font-family:'Segoe UI',Arial,sans-serif;">Semaine du ${weekLabel}</div>
            </td>
          </tr>

          <!-- KPI Summary -->
          <tr>
            <td style="background:#1E293B;padding:16px 12px;">
              <table cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                <tr>
                  ${kpiCard('Sessions', data.summary.totalSessions, '#38BDF8')}
                  ${kpiCard('Invocations', data.summary.totalInvocations, '#FB923C')}
                  ${kpiCard('Agents', data.summary.uniqueAgents, '#A78BFA')}
                  ${kpiCard('Succes', `${data.summary.successRate}%`, '#10B981')}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Category Sections -->
          <tr>
            <td style="background:#0F172A;padding:20px 16px;">
              ${categorySection('pro', data.sections.pro)}
              ${categorySection('poc', data.sections.poc)}
              ${categorySection('perso', data.sections.perso)}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1E293B;padding:16px 30px;border-radius:0 0 12px 12px;text-align:center;">
              <div style="font-size:11px;color:#64748B;font-family:'Segoe UI',Arial,sans-serif;">
                Genere par <strong style="color:#94A3B8;">Mugiwara Dashboard</strong> le ${new Date(data.generatedAt).toLocaleDateString('fr-FR')}
                &bull; <a href="http://localhost:3000" style="color:#38BDF8;text-decoration:none;">Ouvrir le Dashboard</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
