// ============================================================
// Setup Parser - Reads Claude Code configuration from ~/.claude/
// SubAgents, MCP Servers, Plugins
// ============================================================

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import type { SubAgentInfo, McpServerInfo, McpSource, PluginInfo, SetupResponse } from '../../shared/types.js';

const CLAUDE_DIR = path.join(homedir(), '.claude');
const AGENTS_DIR = path.join(CLAUDE_DIR, 'agents');
const MCP_FILE = path.join(CLAUDE_DIR, '.mcp.json');
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json');
const INSTALLED_PLUGINS_FILE = path.join(CLAUDE_DIR, 'plugins', 'installed_plugins.json');

// Project-level MCP config
const ROOT_DIR = path.resolve(import.meta.dirname, '..', '..', '..');
const PROJECT_MCP_FILE = path.join(ROOT_DIR, '.mcp.json');

// ── SubAgents ─────────────────────────────────────────────────

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
      description = description.split('\n').map((l) => l.trim()).filter(Boolean).join(' ');
      if (description.length > 200) description = description.slice(0, 200) + '...';
    }
    const model = fm.match(/^model:\s*(.+)/m)?.[1]?.trim() ?? 'default';
    const color = fm.match(/^color:\s*(.+)/m)?.[1]?.trim() ?? 'gray';

    agents.push({ name, description, model, color, fileName: file });
  }

  return agents.sort((a, b) => a.name.localeCompare(b.name));
}

// ── MCP Servers ───────────────────────────────────────────────

function parseMcpEntries(servers: Record<string, unknown>, source: McpSource): McpServerInfo[] {
  const result: McpServerInfo[] = [];
  for (const [name, config] of Object.entries(servers)) {
    if (!config || typeof config !== 'object') continue;
    const cfg = config as { command?: string; args?: string[]; env?: Record<string, string>; url?: string; type?: string };
    result.push({
      name,
      command: cfg.command ?? cfg.url ?? '',
      args: cfg.args ?? [],
      env: cfg.env ?? {},
      source,
    });
  }
  return result;
}

function parseMcpFromFile(filePath: string, source: McpSource): McpServerInfo[] {
  if (!existsSync(filePath)) return [];

  try {
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));

    // Standard format: { "mcpServers": { "name": { ... } } }
    if (raw.mcpServers && typeof raw.mcpServers === 'object') {
      return parseMcpEntries(raw.mcpServers, source);
    }

    // Plugin format: { "serverName": { "command": ... } } (keys are server names directly)
    // Filter out non-server entries (version, etc.)
    const entries: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        entries[key] = val;
      }
    }
    if (Object.keys(entries).length > 0) {
      return parseMcpEntries(entries, source);
    }

    return [];
  } catch {
    return [];
  }
}

function parseMcpServers(): McpServerInfo[] {
  const servers: McpServerInfo[] = [];
  const seen = new Set<string>();

  // 1. User-level MCP config
  for (const s of parseMcpFromFile(MCP_FILE, 'user')) {
    if (!seen.has(s.name)) { servers.push(s); seen.add(s.name); }
  }

  // 2. Project-level MCP config
  for (const s of parseMcpFromFile(PROJECT_MCP_FILE, 'project')) {
    if (!seen.has(s.name)) { servers.push(s); seen.add(s.name); }
  }

  // 3. Plugin-provided MCP servers
  const installedPlugins = readInstalledPlugins();
  for (const [, installs] of Object.entries(installedPlugins)) {
    const info = installs[0];
    if (!info?.installPath) continue;

    // Check for .mcp.json inside plugin
    const pluginMcp = path.join(info.installPath, '.mcp.json');
    for (const s of parseMcpFromFile(pluginMcp, 'plugin')) {
      if (!seen.has(s.name)) { servers.push(s); seen.add(s.name); }
    }

    // Also check plugin.json for mcp config
    const pluginJson = path.join(info.installPath, '.claude-plugin', 'plugin.json');
    if (existsSync(pluginJson)) {
      try {
        const meta = JSON.parse(readFileSync(pluginJson, 'utf-8'));
        if (meta.mcpServers && typeof meta.mcpServers === 'object' && !Array.isArray(meta.mcpServers) && typeof meta.mcpServers !== 'string') {
          for (const [name, config] of Object.entries(meta.mcpServers)) {
            if (seen.has(name)) continue;
            const cfg = config as { command?: string; args?: string[]; env?: Record<string, string> };
            servers.push({
              name,
              command: cfg.command ?? '',
              args: cfg.args ?? [],
              env: cfg.env ?? {},
              source: 'plugin',
            });
            seen.add(name);
          }
        }
      } catch { /* skip */ }
    }
  }

  return servers.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Plugins ───────────────────────────────────────────────────

interface InstalledPluginEntry {
  scope: string;
  installPath: string;
  version: string;
  installedAt: string;
  lastUpdated?: string;
}

function readInstalledPlugins(): Record<string, InstalledPluginEntry[]> {
  if (!existsSync(INSTALLED_PLUGINS_FILE)) return {};
  try {
    const data = JSON.parse(readFileSync(INSTALLED_PLUGINS_FILE, 'utf-8'));
    return data.plugins ?? {};
  } catch {
    return {};
  }
}

function parsePlugins(): PluginInfo[] {
  // Read enabled status from settings
  let enabledPlugins: Record<string, boolean> = {};
  if (existsSync(SETTINGS_FILE)) {
    try {
      const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'));
      enabledPlugins = settings.enabledPlugins ?? {};
    } catch { /* skip */ }
  }

  // Read installed plugins
  const installed = readInstalledPlugins();
  if (Object.keys(installed).length === 0) return [];

  const plugins: PluginInfo[] = [];

  for (const [key, installs] of Object.entries(installed)) {
    const info = installs[0];
    if (!info) continue;

    // Extract short name from key (e.g. "frontend-design@claude-plugins-official" -> "frontend-design")
    const shortName = key.split('@')[0] ?? key;

    // Try to read plugin metadata from installPath
    let name = shortName;
    let description = '';
    let author = '';

    if (info.installPath) {
      const pluginJson = path.join(info.installPath, '.claude-plugin', 'plugin.json');
      if (existsSync(pluginJson)) {
        try {
          const meta = JSON.parse(readFileSync(pluginJson, 'utf-8'));
          name = meta.name ?? shortName;
          description = meta.description ?? '';
          author = meta.author?.name ?? '';
        } catch { /* use fallback name */ }
      }
    }

    // Truncate long descriptions
    if (description.length > 200) description = description.slice(0, 200) + '...';

    const enabled = enabledPlugins[key] === true;

    plugins.push({
      name,
      description,
      author,
      enabled,
      version: info.version ?? '',
      scope: info.scope ?? 'user',
    });
  }

  // Enabled first, then alphabetical
  return plugins.sort((a, b) => {
    if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}

// ── Public API ────────────────────────────────────────────────

export function getSetupInfo(): SetupResponse {
  return {
    subAgents: parseSubAgents(),
    mcpServers: parseMcpServers(),
    plugins: parsePlugins(),
  };
}

const MARKETPLACE = 'claude-plugins-official';

export function togglePlugin(name: string, enabled: boolean): void {
  let settings: Record<string, unknown> = {};
  if (existsSync(SETTINGS_FILE)) {
    settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'));
  }

  const ep: Record<string, boolean> = (settings.enabledPlugins as Record<string, boolean>) ?? {};
  const key = `${name}@${MARKETPLACE}`;

  if (enabled) {
    ep[key] = true;
  } else {
    delete ep[key];
  }

  settings.enabledPlugins = ep;
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
}
