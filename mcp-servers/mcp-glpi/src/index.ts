#!/usr/bin/env node
// MCP Server for GLPI REST API — Mugiwara Agents ecosystem
// Transport: stdio

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { GlpiClient } from './glpi-client.js';
import { registerTicketTools } from './tools/tickets.js';
import { registerFollowupTools } from './tools/followups.js';
import { registerSearchTools } from './tools/search.js';
import { registerChangeTools } from './tools/changes.js';
import { registerAssetTools } from './tools/assets.js';

async function main(): Promise<void> {
  // Load and validate configuration
  const config = loadConfig();
  const client = new GlpiClient(config);

  // Create MCP server
  const server = new McpServer({
    name: 'glpi',
    version: '1.0.0',
  });

  // Register all tools
  registerTicketTools(server, client);
  registerFollowupTools(server, client);
  registerSearchTools(server, client);
  registerChangeTools(server, client);
  registerAssetTools(server, client);

  // Graceful shutdown — kill GLPI session
  const cleanup = async () => {
    await client.killSession();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Fatal error starting GLPI MCP server:', error);
  process.exit(1);
});
