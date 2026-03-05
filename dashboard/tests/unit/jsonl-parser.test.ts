import { describe, it, expect } from 'vitest';
import { parseJsonlContent } from '../../server/parsers/jsonl-parser';

describe('parseJsonlContent', () => {
  it('should parse valid JSONL lines', () => {
    const content = '{"a":1}\n{"b":2}\n{"c":3}';
    const result = parseJsonlContent<Record<string, number>>(content);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ a: 1 });
    expect(result[1]).toEqual({ b: 2 });
    expect(result[2]).toEqual({ c: 3 });
  });

  it('should skip empty lines', () => {
    const content = '{"a":1}\n\n\n{"b":2}\n';
    const result = parseJsonlContent(content);
    expect(result).toHaveLength(2);
  });

  it('should skip invalid JSON lines (tolerant)', () => {
    const content = '{"valid":true}\nnot json\n{"also":true}\n{broken';
    const result = parseJsonlContent(content);
    expect(result).toHaveLength(2);
  });

  it('should return empty array for empty string', () => {
    expect(parseJsonlContent('')).toEqual([]);
  });

  it('should skip null/primitive JSON values', () => {
    const content = '{"obj":true}\n42\n"string"\nnull\n{"obj2":true}';
    const result = parseJsonlContent(content);
    // 42, "string", null are not objects so they get skipped
    expect(result).toHaveLength(2);
  });

  it('should handle Windows-style line endings', () => {
    const content = '{"a":1}\r\n{"b":2}\r\n';
    const result = parseJsonlContent(content);
    expect(result).toHaveLength(2);
  });

  it('should handle single line', () => {
    const content = '{"single":true}';
    const result = parseJsonlContent(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ single: true });
  });

  it('should handle lines with leading/trailing whitespace', () => {
    const content = '  {"a":1}  \n  {"b":2}  ';
    const result = parseJsonlContent(content);
    expect(result).toHaveLength(2);
  });

  it('should parse real agent event structure', () => {
    const content = '{"timestamp":"2026-03-04T22:30:22Z","event":"agent_invocation","agent":"zorro","tool":"Skill","session_id":"abc-123","is_pipeline":false}';
    const result = parseJsonlContent(content);
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveProperty('timestamp');
    expect(result[0]).toHaveProperty('event', 'agent_invocation');
    expect(result[0]).toHaveProperty('agent', 'zorro');
  });

  it('should handle a broken line followed by a closing brace on next line', () => {
    // This simulates the actual data pattern found in agents.jsonl (line 12)
    const content = '{"a":1}\n}\n{"b":2}';
    const result = parseJsonlContent(content);
    // The stray "}" is invalid JSON, should be skipped
    expect(result).toHaveLength(2);
  });
});
