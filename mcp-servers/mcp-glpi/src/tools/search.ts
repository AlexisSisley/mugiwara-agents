// MCP tool for GLPI generic search engine

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GlpiClient } from '../glpi-client.js';
import { GlpiSearchResult } from '../types.js';

export function registerSearchTools(server: McpServer, client: GlpiClient): void {

  server.tool(
    'glpi_search',
    'Search GLPI items using the search engine with criteria. Supports Ticket, Computer, Change, User, etc.',
    {
      itemtype: z.string().default('Ticket').describe('GLPI item type to search (Ticket, Computer, Change, User, Software, etc.)'),
      criteria: z.array(z.object({
        field: z.number().describe('Search field ID (e.g., 1=name, 12=status, 3=priority, 15=date)'),
        searchtype: z.string().default('contains').describe('Search type: contains, equals, notequals, lessthan, morethan'),
        value: z.string().describe('Value to search for'),
      })).describe('Search criteria array'),
      limit: z.number().optional().default(25).describe('Max results'),
      sort: z.number().optional().default(19).describe('Sort field ID'),
      order: z.enum(['ASC', 'DESC']).optional().default('DESC'),
    },
    async (params) => {
      try {
        const queryParams: Record<string, string> = {
          'range': `0-${(params.limit ?? 25) - 1}`,
          'sort': String(params.sort ?? 19),
          'order': params.order ?? 'DESC',
          'forcedisplay[0]': '1',  // name
          'forcedisplay[1]': '2',  // id
          'forcedisplay[2]': '12', // status
          'forcedisplay[3]': '3',  // priority
          'forcedisplay[4]': '19', // date_mod
        };

        // Build criteria query params
        for (let i = 0; i < params.criteria.length; i++) {
          const c = params.criteria[i];
          queryParams[`criteria[${i}][field]`] = String(c.field);
          queryParams[`criteria[${i}][searchtype]`] = c.searchtype;
          queryParams[`criteria[${i}][value]`] = c.value;
        }

        const result = await client.get<GlpiSearchResult>(
          `/search/${params.itemtype}`,
          queryParams,
        );

        if (!result.data || result.data.length === 0) {
          return { content: [{ type: 'text' as const, text: `Aucun resultat pour la recherche ${params.itemtype}.` }] };
        }

        const output = [
          `**${result.totalcount} resultat(s) total, ${result.count} affiche(s)**`,
          '',
          '```json',
          JSON.stringify(result.data, null, 2),
          '```',
        ].join('\n');

        return { content: [{ type: 'text' as const, text: output }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Erreur: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    },
  );
}
