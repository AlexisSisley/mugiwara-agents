// ============================================================
// Setup Parser - Reads Claude Code configuration from ~/.claude/
// SubAgents, MCP Servers, Plugins
// ============================================================

import { readFileSync, readdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import type { SubAgentInfo, McpServerInfo, PluginInfo, SetupResponse } from '../../shared/types.js';

const CLAUDE_DIR = path.join(homedir(), '.claude');
const AGENTS_DIR = path.join(CLAUDE_DIR, 'agents');
const MCP_FILE = path.join(CLAUDE_DIR, '.mcp.json');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');
const PLUGINS_DIR = path.join(CLAUDE_DIR, 'plugins', 'marketplaces', 'claude-plugins-official', 'external_plugins');

function parseSubAgents(): SubAgentInfo[] {
  if (!existsSync(AGENTS_DIR)) return [];

  const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'));
  const agents: SubAgentInfo[] = [];

  for (const file of files) {
    const content = readFileSync(path.join(AGENTS_DIR, file), 'utf-8');
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!fmMatch) continue;

    const fm = fmMatch[1]!;
    const name = fm.match(/^name:\s*(.+)/m)?.[1]?.trim() ?? file.replace('.md', '');
    const descMatch = fm.match(/^description:\s*(?:"([\s\S]*?)"|'([\s\S]*?)'|>\n([\s\S]*?)(?=\n\w|\n---|\Z)|(.*$))/m);
    let description = '';
    if (descMatch) {
      description = (descMatch[1] ?? descMatch[2] ?? descMatch[3] ?? descMatch[4] ?? '').trim();
      // Clean multiline descriptions
      description = description.split('\n').map((l) => l.trim()).filter(Boolean).join(' ');
      // Truncate long descriptions
      if (description.length > 200) description = description.slice(0, 200) + '...';
    }
    const model = fm.match(/^model:\s*(.+)/m)?.[1]?.trim() ?? 'default';
    const color = fm.match(/^color:\s*(.+)/m)?.[1]?.trim() ?? 'gray';

    agents.push({ name, description, model, color, fileName: file });
  }

  return agents.sort((a, b) => a.name.localeCompare(b.name));
}

function parseMcpServers(): McpServerInfo[] {
  if (!existsSync(MCP_FILE)) return [];

  const raw = JSON.parse(readFileSync(MCP_FILE, 'utf-8'));
  const servers = raw.mcpServers ?? {};
  const result: McpServerInfo[] = [];

  for (const [name, config] of Object.entries(servers)) {
    const cfg = config as { command?: string; args?: string[]; env?: Record<string, string> };
    result.push({
      name,
      command: cfg.command ?? '',
      args: cfg.args ?? [],
      env: cfg.env ?? {},
    });
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
}

function parsePlugins(): PluginInfo[] {
  // Read enabled plugins from settings
  let enabledPlugins: Record<string, boolean> = {};
  if (existsSync(SETTINGS_FILE)) {
    const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'));
    enabledPlugins = settings.enabledPlugins ?? {};
  }

  if (!existsSync(PLUGINS_DIR)) return [];

  const dirs = readdirSync(PLUGINS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const plugins: PluginInfo[] = [];

  for (const dir of dirs) {
    const pluginJson = path.join(PLUGINS_DIR, dir, '.claude-plugin', 'plugin.json');
    let name = dir;
    let description = '';
    let author = '';

    if (existsSync(pluginJson)) {
      const meta = JSON.parse(readFileSync(pluginJson, 'utf-8'));
      name = meta.name ?? dir;
      description = meta.description ?? '';
      author = meta.author?.name ?? '';
    }

    // Check if enabled (key format: "name@marketplace")
    const enabled = Object.entries(enabledPlugins).some(
      ([key, val]) => val && key.startsWith(`${name}@`)
    );

    plugins.push({ name, description, author, enabled });
  }

  // Enabled first, then alphabetical
  return plugins.sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

export function getSetupInfo(): SetupResponse {
  return {
    subAgents: parseSubAgents(),
    mcpServers: parseMcpServers(),
    plugins: parsePlugins(),
  };
}
