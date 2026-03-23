// MCP tools for GLPI Ticket Followups

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GlpiClient } from '../glpi-client.js';

export function registerFollowupTools(server: McpServer, client: GlpiClient): void {

  server.tool(
    'glpi_add_followup',
    'Add a followup/comment to a GLPI ticket. Requires GLPI_READ_ONLY=false.',
    {
      ticket_id: z.number().describe('Ticket ID to add followup to'),
      content: z.string().describe('Followup content (supports HTML)'),
      is_private: z.boolean().optional().default(false).describe('Private followup (visible only to technicians)'),
    },
    async (params) => {
      try {
        await client.post(`/Ticket/${params.ticket_id}/ITILFollowup`, {
          input: {
            itemtype: 'Ticket',
            items_id: params.ticket_id,
            content: params.content,
            is_private: params.is_private ? 1 : 0,
          },
        });
        return { content: [{ type: 'text' as const, text: `Suivi ajoute au ticket #${params.ticket_id}.` }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Erreur: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    },
  );
}
