// ============================================================
// JSONL Parser - Tolerant line-by-line parser
// Ignores invalid lines silently (as per CONSTRAINTS)
// ============================================================

import { readFileSync, existsSync } from 'fs';

/**
 * Parse a JSONL file, skipping invalid lines.
 * Returns an array of parsed objects.
 */
export function parseJsonlFile<T>(filePath: string): T[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  return parseJsonlContent<T>(content);
}

/**
 * Parse JSONL content string, skipping invalid lines.
 */
export function parseJsonlContent<T>(content: string): T[] {
  const results: T[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === '') continue;

    try {
      const parsed = JSON.parse(trimmed) as T;
      if (parsed !== null && typeof parsed === 'object') {
        results.push(parsed);
      }
    } catch {
      // Tolerant parser: skip invalid lines silently
      continue;
    }
  }

  return results;
}
