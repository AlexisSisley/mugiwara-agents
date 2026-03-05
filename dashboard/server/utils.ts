// ============================================================
// Server Utilities - Pagination, param parsing
// ============================================================

import type { Pagination, PaginatedResponse } from '../shared/types.js';

/**
 * Paginate an array of items.
 */
export function paginate<T>(items: readonly T[], page: number, limit: number): PaginatedResponse<T> {
  const safePage = Math.max(1, page);
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / safeLimit));
  const offset = (safePage - 1) * safeLimit;
  const data = items.slice(offset, offset + safeLimit);

  const pagination: Pagination = {
    page: safePage,
    limit: safeLimit,
    total,
    totalPages,
  };

  return { data, pagination };
}

/**
 * Parse a query string parameter as an integer with a default.
 */
export function parseIntParam(value: unknown, defaultValue: number): number {
  if (value === undefined || value === null) return defaultValue;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? defaultValue : parsed;
}
