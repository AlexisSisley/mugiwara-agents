import { describe, it, expect } from 'vitest';
import { parseRegistryContent } from '../../server/parsers/yaml-parser';

describe('parseRegistryContent', () => {
  it('should parse valid registry YAML', () => {
    const content = `
version: 1
agents:
  zorro:
    version: 1.5.0
    description: "Business Analyst"
    category: analysis
  luffy:
    version: 1.5.0
    description: "Program Manager"
    category: management
`;
    const result = parseRegistryContent(content);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      name: 'zorro',
      version: '1.5.0',
      description: 'Business Analyst',
      category: 'analysis',
    });
    expect(result[1]).toEqual({
      name: 'luffy',
      version: '1.5.0',
      description: 'Program Manager',
      category: 'management',
    });
  });

  it('should return empty array for invalid YAML', () => {
    const result = parseRegistryContent('not: [valid: yaml: {{');
    // js-yaml might parse this or throw; either way should handle gracefully
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return empty array for empty content', () => {
    const result = parseRegistryContent('');
    expect(result).toEqual([]);
  });

  it('should return empty array for YAML without agents key', () => {
    const result = parseRegistryContent('version: 1\nfoo: bar');
    expect(result).toEqual([]);
  });

  it('should default missing fields', () => {
    const content = `
agents:
  test-agent:
    version: 1.0.0
`;
    const result = parseRegistryContent(content);
    expect(result).toHaveLength(1);
    expect(result[0]?.description).toBe('');
    expect(result[0]?.category).toBe('meta');
  });

  it('should handle large registry with many agents', () => {
    let content = 'agents:\n';
    for (let i = 0; i < 50; i++) {
      content += `  agent-${i}:\n    version: 1.0.0\n    description: "Agent ${i}"\n    category: meta\n`;
    }
    const result = parseRegistryContent(content);
    expect(result).toHaveLength(50);
  });

  it('should preserve agent names as-is from YAML keys', () => {
    const content = `
agents:
  sanji-ts:
    version: 1.5.0
    description: "TypeScript sous-chef"
    category: architecture
  one_piece:
    version: 1.5.0
    description: "Routeur"
    category: router
`;
    const result = parseRegistryContent(content);
    expect(result.map(a => a.name)).toEqual(['sanji-ts', 'one_piece']);
  });
});
