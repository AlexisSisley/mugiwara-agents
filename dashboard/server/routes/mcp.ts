// ============================================================
// MCP / Plugins API Routes
// GET  /api/mcp              - List all MCP servers & plugins
// ============================================================
// "Nothing happened." — Zoro (but your plugins did)

import { Router } from 'express';
import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';
import { execSync } from 'child_process';
import type { McpServer, McpPlugin, McpResponse, McpServerStatus, McpServerTransport, McpServerSource } from '../../shared/types.js';

const router = Router();

// ── Response cache (TTL 60s) ────────────────────────────────
// `claude mcp list` uses execSync which blocks the event loop.
// Caching avoids freezing other API calls on repeated requests.
let cachedResponse: McpResponse | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60_000; // 60 seconds

// Known plugin → MCP server mappings (plugins that bundle MCP servers)
const PLUGIN_MCP_MAP: Record<string, { command: string; transport: McpServerTransport }> = {
  firebase: { command: 'npx -y firebase-tools@latest mcp', transport: 'stdio' },
  github: { command: 'https://api.githubcopilot.com/mcp/', transport: 'http' },
  playwright: { command: 'npx @playwright/mcp@latest', transport: 'stdio' },
  supabase: { command: 'https://mcp.supabase.com/mcp', transport: 'http' },
  context7: { command: 'npx -y @upstash/context7-mcp', transport: 'stdio' },
  discord: { command: 'bun run discord mcp start', transport: 'stdio' },
};

// ── Parse `claude mcp list` output ──────────────────────────
function parseClaudeMcpList(): McpServer[] {
  const servers: McpServer[] = [];

  // Try both scopes
  for (const scope of ['', '--scope user']) {
    try {
      const cmd = `claude mcp list ${scope}`.trim();
      const raw = execSync(cmd, {
        encoding: 'utf-8',
        timeout: 20000,
        windowsHide: true,
        cwd: homedir(),
      });

      for (const line of raw.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('Checking')) continue;

        // Format: "name: command - status"
        const match = trimmed.match(/^(.+?):\s+(.+?)\s+-\s+(.+)$/);
        if (!match) continue;

        const [, rawName, command, rawStatus] = match;
        const name = rawName!.trim();

        // Skip duplicates
        if (servers.some((s) => s.name === name)) continue;

        const statusText = rawStatus!.trim().toLowerCase();

        let status: McpServerStatus = 'failed';
        if (statusText.includes('connected')) status = 'connected';
        else if (statusText.includes('auth')) status = 'auth_required';

        const transport: McpServerTransport = command!.includes('http://') || command!.includes('https://') ? 'http' : 'stdio';

        let source: McpServerSource = 'user';
        if (name.startsWith('plugin:')) source = 'plugin';
        else if (name.startsWith('claude.ai')) source = 'cloud';

        let displayName = name;
        if (name.startsWith('plugin:')) {
          const parts = name.split(':');
          displayName = parts[1] ?? name;
        } else if (name.startsWith('claude.ai ')) {
          displayName = name.replace('claude.ai ', '');
        }
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

        servers.push({
          name,
          displayName,
          command: command!.trim(),
          status,
          transport,
          source,
        });
      }
    } catch {
      // Continue to next scope
    }
  }

  return servers;
}

// ── Parse installed_plugins.json ────────────────────────────
function parseInstalledPlugins(servers: McpServer[]): McpPlugin[] {
  const pluginsPath = path.join(homedir(), '.claude', 'plugins', 'installed_plugins.json');
  if (!existsSync(pluginsPath)) return [];

  try {
    const raw = readFileSync(pluginsPath, 'utf-8');
    const data = JSON.parse(raw) as {
      version: number;
      plugins: Record<string, Array<{
        scope: string;
        installPath: string;
        version: string;
        installedAt: string;
        lastUpdated: string;
        projectPath?: string;
      }>>;
    };

    const plugins: McpPlugin[] = [];

    for (const [key, installs] of Object.entries(data.plugins)) {
      if (!installs.length) continue;
      const install = installs[0]!;
      const [pluginName, marketplace] = key.split('@');

      // Match servers from claude mcp list (plugin:name:name format)
      let relatedServers = servers.filter(
        (s) => s.name.includes(pluginName!) || s.displayName.toLowerCase() === pluginName!.toLowerCase()
      );

      // If no match from live list, create synthetic server entry from known map
      if (relatedServers.length === 0 && pluginName && PLUGIN_MCP_MAP[pluginName]) {
        const mcpInfo = PLUGIN_MCP_MAP[pluginName]!;
        const syntheticServer: McpServer = {
          name: `plugin:${pluginName}:${pluginName}`,
          displayName: pluginName.charAt(0).toUpperCase() + pluginName.slice(1),
          command: mcpInfo.command,
          status: 'failed', // Unknown from this context
          transport: mcpInfo.transport,
          source: 'plugin',
        };
        servers.push(syntheticServer);
        relatedServers = [syntheticServer];
      }

      plugins.push({
        name: pluginName!,
        marketplace: marketplace ?? 'unknown',
        version: install.version,
        installedAt: install.installedAt,
        lastUpdated: install.lastUpdated,
        scope: install.scope,
        installPath: install.installPath,
        mcpServers: relatedServers,
      });
    }

    return plugins;
  } catch {
    return [];
  }
}

// ── User-configured MCP servers from .claude.json ───────────
function parseUserMcpServers(): McpServer[] {
  const claudeJsonPath = path.join(homedir(), '.claude.json');
  if (!existsSync(claudeJsonPath)) return [];

  try {
    const raw = readFileSync(claudeJsonPath, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    const projects = data['projects'] as Record<string, { mcpServers?: Record<string, { type?: string; command?: string; args?: string[] }> }> | undefined;

    const seen = new Set<string>();
    const userServers: McpServer[] = [];
    if (!projects) return [];

    for (const [_projectPath, projectConfig] of Object.entries(projects)) {
      const mcpServers = projectConfig.mcpServers;
      if (!mcpServers || typeof mcpServers !== 'object') continue;

      for (const [name, config] of Object.entries(mcpServers)) {
        if (seen.has(name)) continue;
        seen.add(name);

        const command = [config.command, ...(config.args ?? [])].join(' ');
        userServers.push({
          name,
          displayName: name.charAt(0).toUpperCase() + name.slice(1),
          command,
          status: 'failed',
          transport: config.type === 'http' ? 'http' : 'stdio',
          source: 'user',
        });
      }
    }

    return userServers;
  } catch {
    return [];
  }
}

// ── Cloud MCP servers (claude.ai built-in) ──────────────────
// These are always injected as 'auth_required' because we cannot
// programmatically check their OAuth status from the server side.
// The live status is only visible within an active Claude Code session.
function getCloudServers(): McpServer[] {
  return [
    {
      name: 'claude.ai Google Calendar',
      displayName: 'Google Calendar',
      command: 'https://gcal.mcp.claude.com/mcp',
      status: 'auth_required',
      transport: 'http',
      source: 'cloud',
    },
    {
      name: 'claude.ai Gmail',
      displayName: 'Gmail',
      command: 'https://gmail.mcp.claude.com/mcp',
      status: 'auth_required',
      transport: 'http',
      source: 'cloud',
    },
  ];
}

// ── Build response (extracted for caching) ──────────────────
function buildMcpResponse(): McpResponse {
  const servers = parseClaudeMcpList();
  // Note: parseInstalledPlugins may push synthetic servers into the array
  // for plugins that have known MCP server mappings but weren't returned by CLI
  const plugins = parseInstalledPlugins(servers);

  // Merge user-configured servers
  const userServers = parseUserMcpServers();
  for (const us of userServers) {
    const existing = servers.find(
      (s) => s.name === us.name || s.displayName.toLowerCase() === us.displayName.toLowerCase()
    );
    if (!existing) {
      servers.push(us);
    }
  }

  // Merge cloud servers if not already present
  const cloudServers = getCloudServers();
  for (const cs of cloudServers) {
    const existing = servers.find((s) => s.name === cs.name);
    if (!existing) {
      servers.push(cs);
    }
  }

  const connected = servers.filter((s) => s.status === 'connected').length;
  const failed = servers.filter((s) => s.status === 'failed').length;
  const authRequired = servers.filter((s) => s.status === 'auth_required').length;

  return {
    servers,
    plugins,
    total: servers.length,
    stats: {
      connected,
      failed,
      authRequired,
      totalPlugins: plugins.length,
      totalServers: servers.length,
    },
  };
}

// ── Main endpoint ───────────────────────────────────────────
router.get('/mcp', (_req, res) => {
  try {
    const now = Date.now();
    const forceRefresh = _req.query['refresh'] === 'true';

    // Return cached response if still fresh
    if (!forceRefresh && cachedResponse && (now - cacheTimestamp) < CACHE_TTL) {
      res.json(cachedResponse);
      return;
    }

    const response = buildMcpResponse();
    cachedResponse = response;
    cacheTimestamp = now;

    res.json(response);
  } catch (err) {
    res.status(500).json({ error: 'internal', message: 'Failed to load MCP data' });
  }
});

export default router;
