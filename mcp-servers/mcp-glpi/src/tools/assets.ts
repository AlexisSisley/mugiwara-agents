// MCP tools for GLPI Asset (Computer) management

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GlpiClient } from '../glpi-client.js';
import { GlpiComputer } from '../types.js';

export function registerAssetTools(server: McpServer, client: GlpiClient): void {

  server.tool(
    'glpi_list_assets',
    'List GLPI computers/assets',
    {
      limit: z.number().optional().default(25).describe('Max number of assets to return'),
      search: z.string().optional().describe('Search by name (contains)'),
    },
    async (params) => {
      try {
        const queryParams: Record<string, string> = {
          'range': `0-${(params.limit ?? 25) - 1}`,
          'sort': '1',
          'order': 'ASC',
        };

        if (params.search) {
          queryParams['searchText[name]'] = params.search;
        }

        const computers = await client.get<GlpiComputer[]>('/Computer', queryParams);

        if (!computers || computers.length === 0) {
          return { content: [{ type: 'text' as const, text: 'Aucun asset trouve.' }] };
        }

        const header = '| ID | Nom | N/S | Date modification |';
        const separator = '|---|---|---|---|';
        const rows = computers.map(c =>
          `| ${c.id} | ${c.name} | ${c.serial ?? '-'} | ${c.date_mod} |`
        ).join('\n');

        const table = `**${computers.length} asset(s)**\n\n${header}\n${separator}\n${rows}`;
        return { content: [{ type: 'text' as const, text: table }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Erreur: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    },
  );

  server.tool(
    'glpi_get_asset',
    'Get full details of a GLPI computer/asset',
    {
      id: z.number().describe('Computer/Asset ID'),
    },
    async (params) => {
      try {
        const computer = await client.get<GlpiComputer>(`/Computer/${params.id}`);
        const output = [
          `# Asset #${computer.id} — ${computer.name}`,
          '',
          `- **Numero de serie** : ${computer.serial || '-'}`,
          `- **Numero d'inventaire** : ${computer.otherserial || '-'}`,
          `- **Date modification** : ${computer.date_mod}`,
        ].join('\n');

        return { content: [{ type: 'text' as const, text: output }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Erreur: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    },
  );
}
