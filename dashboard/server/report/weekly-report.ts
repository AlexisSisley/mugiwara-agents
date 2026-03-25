// ============================================================
// Weekly Report Generator - Queries SQLite and builds report data
// ============================================================

import { getWeeklyStats, getGlobalWeeklyStats, type WeeklyCategoryStats } from '../db/queries.js';
import type { Category } from '../db/category-detector.js';

export interface CategorySection {
  readonly invocationCount: number;
  readonly sessionCount: number;
  readonly topAgents: { name: string; count: number }[];
  readonly subjects: string[];
  readonly projects: string[];
}

export interface WeeklyReportData {
  readonly weekStart: string;
  readonly weekEnd: string;
  readonly generatedAt: string;
  readonly summary: {
    readonly totalSessions: number;
    readonly totalInvocations: number;
    readonly uniqueAgents: number;
    readonly successRate: number;
  };
  readonly sections: Record<Category, CategorySection>;
}

/**
 * Returns the Monday of the previous week (ISO date string YYYY-MM-DD).
 */
export function getPreviousMonday(from: Date = new Date()): string {
  const d = new Date(from);
  const day = d.getDay();
  // Go back to last Monday
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff - 7);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the Sunday ending a week that starts on the given Monday.
 */
export function getSundayFromMonday(monday: string): string {
  const d = new Date(monday);
  d.setDate(d.getDate() + 6);
  return d.toISOString().slice(0, 10);
}

/**
 * Returns the Monday after the given Sunday (for exclusive range queries).
 */
export function getNextMonday(monday: string): string {
  const d = new Date(monday);
  d.setDate(d.getDate() + 7);
  return d.toISOString().slice(0, 10);
}

function statsToCategorySection(stats: WeeklyCategoryStats): CategorySection {
  return {
    invocationCount: stats.invocationCount,
    sessionCount: stats.sessionCount,
    topAgents: stats.topAgents,
    subjects: stats.subjects,
    projects: stats.projects,
  };
}

/**
 * Generates the weekly report data for a given week.
 * @param weekStart - ISO date of the Monday (YYYY-MM-DD), defaults to previous week
 */
export function generateWeeklyReport(weekStart?: string): WeeklyReportData {
  const monday = weekStart ?? getPreviousMonday();
  const sunday = getSundayFromMonday(monday);
  const nextMonday = getNextMonday(monday);

  // Fetch per-category stats
  const categoryStats = getWeeklyStats(monday, nextMonday);
  const globalStats = getGlobalWeeklyStats(monday, nextMonday);

  // Build sections map
  const sections: Record<Category, CategorySection> = {
    pro: { invocationCount: 0, sessionCount: 0, topAgents: [], subjects: [], projects: [] },
    poc: { invocationCount: 0, sessionCount: 0, topAgents: [], subjects: [], projects: [] },
    perso: { invocationCount: 0, sessionCount: 0, topAgents: [], subjects: [], projects: [] },
  };

  for (const stats of categoryStats) {
    sections[stats.category] = statsToCategorySection(stats);
  }

  return {
    weekStart: monday,
    weekEnd: sunday,
    generatedAt: new Date().toISOString(),
    summary: globalStats,
    sections,
  };
}
