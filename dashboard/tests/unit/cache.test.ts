import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryCache } from '../../server/cache';

describe('MemoryCache', () => {
  let cache: MemoryCache;

  beforeEach(() => {
    cache = new MemoryCache(1000); // 1s TTL for tests
  });

  it('should store and retrieve values', () => {
    cache.set('key1', { value: 42 });
    expect(cache.get('key1')).toEqual({ value: 42 });
  });

  it('should return undefined for missing keys', () => {
    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('should expire entries after TTL', () => {
    vi.useFakeTimers();
    cache.set('key1', 'value');
    expect(cache.get('key1')).toBe('value');

    vi.advanceTimersByTime(1001);
    expect(cache.get('key1')).toBeUndefined();
    vi.useRealTimers();
  });

  it('should not expire entries before TTL', () => {
    vi.useFakeTimers();
    cache.set('key1', 'value');

    vi.advanceTimersByTime(500);
    expect(cache.get('key1')).toBe('value');
    vi.useRealTimers();
  });

  it('should invalidate specific keys', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.invalidate('key1');
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBe('value2');
  });

  it('should clear all entries', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
    expect(cache.size).toBe(0);
  });

  it('should report correct size', () => {
    expect(cache.size).toBe(0);
    cache.set('a', 1);
    expect(cache.size).toBe(1);
    cache.set('b', 2);
    expect(cache.size).toBe(2);
    cache.invalidate('a');
    expect(cache.size).toBe(1);
  });

  it('should overwrite existing keys', () => {
    cache.set('key', 'old');
    cache.set('key', 'new');
    expect(cache.get('key')).toBe('new');
    expect(cache.size).toBe(1);
  });

  it('should handle different value types', () => {
    cache.set('string', 'hello');
    cache.set('number', 42);
    cache.set('array', [1, 2, 3]);
    cache.set('object', { nested: true });
    cache.set('null', null);

    expect(cache.get('string')).toBe('hello');
    expect(cache.get('number')).toBe(42);
    expect(cache.get('array')).toEqual([1, 2, 3]);
    expect(cache.get('object')).toEqual({ nested: true });
    expect(cache.get('null')).toBeNull();
  });

  it('should use default 30s TTL when not specified', () => {
    const defaultCache = new MemoryCache();
    vi.useFakeTimers();
    defaultCache.set('key', 'value');

    vi.advanceTimersByTime(29_000);
    expect(defaultCache.get('key')).toBe('value');

    vi.advanceTimersByTime(2_000);
    expect(defaultCache.get('key')).toBeUndefined();
    vi.useRealTimers();
  });
});
