import { describe, it, expect } from 'vitest';
import { paginate, parseIntParam } from '../../server/utils';

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1);

  it('should return first page correctly', () => {
    const result = paginate(items, 1, 10);
    expect(result.data).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it('should return second page', () => {
    const result = paginate(items, 2, 10);
    expect(result.data).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
  });

  it('should return partial last page', () => {
    const result = paginate(items, 3, 10);
    expect(result.data).toEqual([21, 22, 23, 24, 25]);
  });

  it('should handle page beyond total', () => {
    const result = paginate(items, 10, 10);
    expect(result.data).toEqual([]);
    expect(result.pagination.page).toBe(10);
  });

  it('should clamp page to minimum 1', () => {
    const result = paginate(items, -5, 10);
    expect(result.pagination.page).toBe(1);
    expect(result.data).toHaveLength(10);
  });

  it('should clamp limit to minimum 1', () => {
    const result = paginate(items, 1, 0);
    expect(result.pagination.limit).toBe(1);
  });

  it('should cap limit at 100', () => {
    const result = paginate(items, 1, 500);
    expect(result.pagination.limit).toBe(100);
  });

  it('should handle empty array', () => {
    const result = paginate([], 1, 10);
    expect(result.data).toEqual([]);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    });
  });

  it('should handle single item', () => {
    const result = paginate(['only'], 1, 10);
    expect(result.data).toEqual(['only']);
    expect(result.pagination.totalPages).toBe(1);
  });
});

describe('parseIntParam', () => {
  it('should parse valid string numbers', () => {
    expect(parseIntParam('42', 0)).toBe(42);
    expect(parseIntParam('1', 0)).toBe(1);
    expect(parseIntParam('100', 0)).toBe(100);
  });

  it('should return default for undefined', () => {
    expect(parseIntParam(undefined, 10)).toBe(10);
  });

  it('should return default for null', () => {
    expect(parseIntParam(null, 5)).toBe(5);
  });

  it('should return default for non-numeric strings', () => {
    expect(parseIntParam('abc', 20)).toBe(20);
    expect(parseIntParam('', 20)).toBe(20);
  });

  it('should parse string with leading number', () => {
    expect(parseIntParam('10abc', 0)).toBe(10);
  });

  it('should handle negative numbers', () => {
    expect(parseIntParam('-5', 0)).toBe(-5);
  });
});
