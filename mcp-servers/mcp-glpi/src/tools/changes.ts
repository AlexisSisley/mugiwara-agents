// MCP tools for GLPI Change management

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GlpiClient } from '../glpi-client.js';
import { GlpiChange, TICKET_STATUS_LABELS, PRIORITY_LABELS } from '../types.js';

export function registerChangeTools(server: McpServer, client: GlpiClient): void {

  server.tool(
    'glpi_list_changes',
    'List GLPI change requests with optional filters',
    {
      status: z.number().optional().describe('Filter by status: 1=New, 2=Evaluation, 3=Approved, 4=Testing, 5=Qualification, 6=Applied, 7=Review, 8=Closed, 9=Cancelled'),
      limit: z.number().optional().default(25).describe('Max number of changes to return'),
    },
    async (params) => {
      try {
        const queryParams: Record<string, string> = {
          'range': `0-${(params.limit ?? 25) - 1}`,
          'sort': '19',
          'order': 'DESC',
        };

        const changes = await client.get<GlpiChange[]>('/Change', queryParams);

        if (!changes || changes.length === 0) {
          return { content: [{ type: 'text' as const, text: 'Aucune demande de changement trouvee.' }] };
        }

        const filtered = params.status !== undefined
          ? changes.filter(c => c.status === params.status)
          : changes;

        const header = '| ID | Statut | Priorite | Titre | Date |';
        const separator = '|---|---|---|---|---|';
        const rows = filtered.map(c => {
          const status = TICKET_STATUS_LABELS[c.status] ?? String(c.status);
          const priority = PRIORITY_LABELS[c.priority] ?? String(c.priority);
          return `| ${c.id} | ${status} | ${priority} | ${c.name} | ${c.date} |`;
        }).join('\n');

        const table = `**${filtered.length} changement(s)**\n\n${header}\n${separator}\n${rows}`;
        return { content: [{ type: 'text' as const, text: table }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Erreur: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    },
  );

  server.tool(
    'glpi_get_change',
    'Get full details of a GLPI change request',
    {
      id: z.number().describe('Change ID'),
    },
    async (params) => {
      try {
        const change = await client.get<GlpiChange>(`/Change/${params.id}`);
        const output = [
          `# Change #${change.id} — ${change.name}`,
          '',
          `- **Statut** : ${TICKET_STATUS_LABELS[change.status] ?? change.status}`,
          `- **Priorite** : ${PRIORITY_LABELS[change.priority] ?? change.priority}`,
          `- **Cree le** : ${change.date}`,
          `- **Modifie le** : ${change.date_mod}`,
          '',
          '## Description',
          '',
          change.content,
        ].join('\n');

        return { content: [{ type: 'text' as const, text: output }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Erreur: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    },
  );
}
