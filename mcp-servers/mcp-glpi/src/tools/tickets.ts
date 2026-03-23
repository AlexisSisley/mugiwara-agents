// MCP tools for GLPI Ticket operations

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { GlpiClient } from '../glpi-client.js';
import { GlpiTicket, TICKET_STATUS_LABELS, TICKET_TYPE_LABELS, PRIORITY_LABELS } from '../types.js';

function formatTicket(t: GlpiTicket): string {
  return [
    `# Ticket #${t.id} — ${t.name}`,
    '',
    `- **Type** : ${TICKET_TYPE_LABELS[t.type] ?? t.type}`,
    `- **Statut** : ${TICKET_STATUS_LABELS[t.status] ?? t.status}`,
    `- **Priorite** : ${PRIORITY_LABELS[t.priority] ?? t.priority}`,
    `- **Urgence** : ${PRIORITY_LABELS[t.urgency] ?? t.urgency}`,
    `- **Impact** : ${PRIORITY_LABELS[t.impact] ?? t.impact}`,
    `- **Cree le** : ${t.date}`,
    `- **Modifie le** : ${t.date_mod}`,
    t.solvedate ? `- **Resolu le** : ${t.solvedate}` : null,
    t.closedate ? `- **Clos le** : ${t.closedate}` : null,
    '',
    '## Description',
    '',
    t.content,
  ].filter(Boolean).join('\n');
}

function formatTicketRow(t: GlpiTicket): string {
  const type = TICKET_TYPE_LABELS[t.type] ?? String(t.type);
  const status = TICKET_STATUS_LABELS[t.status] ?? String(t.status);
  const priority = PRIORITY_LABELS[t.priority] ?? String(t.priority);
  return `| ${t.id} | ${type} | ${status} | ${priority} | ${t.name} | ${t.date} |`;
}

export function registerTicketTools(server: McpServer, client: GlpiClient): void {

  server.tool(
    'glpi_list_tickets',
    'List GLPI tickets with optional filters (status, type, priority, limit)',
    {
      status: z.number().optional().describe('Filter by status: 1=New, 2=Assigned, 3=Planned, 4=Pending, 5=Solved, 6=Closed'),
      type: z.number().optional().describe('Filter by type: 1=Incident, 2=Request'),
      priority: z.number().optional().describe('Filter by priority: 1=Very low, 2=Low, 3=Medium, 4=High, 5=Very high, 6=Major'),
      limit: z.number().optional().default(25).describe('Max number of tickets to return (default: 25)'),
      sort: z.number().optional().default(19).describe('Sort field ID (default: 19 = date_mod)'),
      order: z.enum(['ASC', 'DESC']).optional().default('DESC').describe('Sort order'),
    },
    async (params) => {
      try {
        const queryParams: Record<string, string> = {
          'range': `0-${(params.limit ?? 25) - 1}`,
          'sort': String(params.sort ?? 19),
          'order': params.order ?? 'DESC',
          'expand_dropdowns': 'false',
        };

        // Build criteria for search-like filtering
        const criteria: string[] = [];
        if (params.status !== undefined) {
          criteria.push(`searchText[12]=${params.status}`);
        }
        if (params.type !== undefined) {
          criteria.push(`searchText[14]=${params.type}`);
        }
        if (params.priority !== undefined) {
          criteria.push(`searchText[3]=${params.priority}`);
        }

        let path = '/Ticket';
        if (criteria.length > 0) {
          path += `?${criteria.join('&')}`;
        }

        const tickets = await client.get<GlpiTicket[]>(path, criteria.length > 0 ? undefined : queryParams);

        if (!tickets || tickets.length === 0) {
          return { content: [{ type: 'text' as const, text: 'Aucun ticket trouve avec ces criteres.' }] };
        }

        const header = '| ID | Type | Statut | Priorite | Titre | Date |';
        const separator = '|---|---|---|---|---|---|';
        const rows = tickets.map(formatTicketRow).join('\n');
        const table = `${header}\n${separator}\n${rows}`;
        const summary = `**${tickets.length} ticket(s) trouve(s)**\n\n${table}`;

        return { content: [{ type: 'text' as const, text: summary }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Erreur: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    },
  );

  server.tool(
    'glpi_get_ticket',
    'Get full details of a GLPI ticket including followups, tasks, and solutions',
    {
      id: z.number().describe('Ticket ID'),
      with_followups: z.boolean().optional().default(true).describe('Include followups/comments'),
      with_tasks: z.boolean().optional().default(true).describe('Include tasks'),
      with_solutions: z.boolean().optional().default(true).describe('Include solutions'),
    },
    async (params) => {
      try {
        const ticket = await client.get<GlpiTicket>(`/Ticket/${params.id}`);
        let output = formatTicket(ticket);

        if (params.with_followups) {
          try {
            const followups = await client.get<Array<{ id: number; content: string; date: string; users_id: number }>>(`/Ticket/${params.id}/ITILFollowup`);
            if (followups && followups.length > 0) {
              output += '\n\n## Suivis\n';
              for (const f of followups) {
                output += `\n### Suivi #${f.id} (${f.date})\n${f.content}\n`;
              }
            }
          } catch { /* No followups */ }
        }

        if (params.with_tasks) {
          try {
            const tasks = await client.get<Array<{ id: number; content: string; state: number; date: string; actiontime: number }>>(`/Ticket/${params.id}/TicketTask`);
            if (tasks && tasks.length > 0) {
              output += '\n\n## Taches\n';
              for (const t of tasks) {
                const stateLabel = t.state === 1 ? 'A faire' : t.state === 2 ? 'En cours' : 'Fait';
                output += `\n### Tache #${t.id} [${stateLabel}] (${t.date})\n${t.content}\n`;
              }
            }
          } catch { /* No tasks */ }
        }

        if (params.with_solutions) {
          try {
            const solutions = await client.get<Array<{ id: number; content: string; date_creation: string; status: number }>>(`/Ticket/${params.id}/ITILSolution`);
            if (solutions && solutions.length > 0) {
              output += '\n\n## Solutions\n';
              for (const s of solutions) {
                const statusLabel = s.status === 2 ? 'Approuvee' : s.status === 3 ? 'Refusee' : 'En attente';
                output += `\n### Solution #${s.id} [${statusLabel}] (${s.date_creation})\n${s.content}\n`;
              }
            }
          } catch { /* No solutions */ }
        }

        return { content: [{ type: 'text' as const, text: output }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Erreur: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    },
  );

  server.tool(
    'glpi_update_ticket',
    'Update a GLPI ticket (status, priority, assignment, etc.). Requires GLPI_READ_ONLY=false.',
    {
      id: z.number().describe('Ticket ID to update'),
      status: z.number().optional().describe('New status: 1=New, 2=Assigned, 3=Planned, 4=Pending, 5=Solved, 6=Closed'),
      priority: z.number().optional().describe('New priority: 1-6'),
      urgency: z.number().optional().describe('New urgency: 1-6'),
      impact: z.number().optional().describe('New impact: 1-6'),
      content: z.string().optional().describe('Updated description'),
    },
    async (params) => {
      try {
        const { id, ...updates } = params;
        const input: Record<string, unknown> = {};
        if (updates.status !== undefined) input.status = updates.status;
        if (updates.priority !== undefined) input.priority = updates.priority;
        if (updates.urgency !== undefined) input.urgency = updates.urgency;
        if (updates.impact !== undefined) input.impact = updates.impact;
        if (updates.content !== undefined) input.content = updates.content;

        await client.put(`/Ticket/${id}`, { input });
        return { content: [{ type: 'text' as const, text: `Ticket #${id} mis a jour avec succes.` }] };
      } catch (error) {
        return { content: [{ type: 'text' as const, text: `Erreur: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
      }
    },
  );
}
