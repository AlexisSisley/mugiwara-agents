// ============================================================
// YAML Parser - Registry parser for registry.yaml
// ============================================================

import { readFileSync, existsSync } from 'fs';
import yaml from 'js-yaml';
import type { AgentDefinition, AgentCategory, AgentRole } from '../../shared/types.js';

interface RegistryAgentEntry {
  version: string;
  description: string;
  category: string;
  role?: string;
  elevated?: boolean;
  alias_of?: string;
}

interface RegistryYaml {
  version?: number;
  updated?: string;
  base_url?: string;
  agents?: Record<string, RegistryAgentEntry>;
}

/**
 * Parse registry.yaml and return an array of AgentDefinition.
 */
export function parseRegistryFile(filePath: string): AgentDefinition[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, 'utf-8');
  return parseRegistryContent(content);
}

/**
 * Parse registry YAML content string.
 */
export function parseRegistryContent(content: string): AgentDefinition[] {
  try {
    const data = yaml.load(content) as RegistryYaml;

    if (!data?.agents || typeof data.agents !== 'object') {
      return [];
    }

    return Object.entries(data.agents).map(([name, info]) => ({
      name,
      version: info.version ?? '0.0.0',
      description: info.description ?? '',
      category: (info.category ?? 'meta') as AgentCategory,
      role: (info.role ?? 'agent') as AgentRole,
      elevated: info.elevated ?? false,
      aliasOf: info.alias_of ?? null,
    }));
  } catch {
    return [];
  }
}
