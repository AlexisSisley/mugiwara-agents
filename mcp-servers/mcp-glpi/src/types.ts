// GLPI REST API type definitions

export interface GlpiSession {
  session_token: string;
}

export interface GlpiTicket {
  id: number;
  name: string;
  content: string;
  status: number;
  urgency: number;
  impact: number;
  priority: number;
  type: number; // 1 = Incident, 2 = Request
  date: string;
  date_mod: string;
  solvedate: string | null;
  closedate: string | null;
  itilcategories_id: number;
  users_id_recipient: number;
  users_id_lastupdater: number;
  entities_id: number;
  requesttypes_id: number;
  global_validation: number;
}

export interface GlpiFollowup {
  id: number;
  items_id: number;
  itemtype: string;
  content: string;
  date: string;
  users_id: number;
  is_private: number;
}

export interface GlpiTask {
  id: number;
  tickets_id: number;
  content: string;
  state: number;
  date: string;
  users_id: number;
  actiontime: number;
}

export interface GlpiSolution {
  id: number;
  items_id: number;
  itemtype: string;
  content: string;
  date_creation: string;
  users_id: number;
  status: number;
}

export interface GlpiComputer {
  id: number;
  name: string;
  serial: string;
  otherserial: string;
  states_id: number;
  locations_id: number;
  computertypes_id: number;
  computermodels_id: number;
  operatingsystems_id: number;
  entities_id: number;
  date_mod: string;
}

export interface GlpiChange {
  id: number;
  name: string;
  content: string;
  status: number;
  urgency: number;
  impact: number;
  priority: number;
  date: string;
  date_mod: string;
  solvedate: string | null;
  closedate: string | null;
}

export interface GlpiUser {
  id: number;
  name: string;
  realname: string;
  firstname: string;
  email: string;
}

export interface GlpiSearchCriteria {
  field: number;
  searchtype: string;
  value: string;
}

export interface GlpiSearchResult {
  totalcount: number;
  count: number;
  data: Record<string, unknown>[];
}

// GLPI status codes
export const TICKET_STATUS = {
  NEW: 1,
  ASSIGNED: 2,
  PLANNED: 3,
  PENDING: 4,
  SOLVED: 5,
  CLOSED: 6,
} as const;

export const TICKET_STATUS_LABELS: Record<number, string> = {
  1: 'Nouveau',
  2: 'En cours (attribue)',
  3: 'En cours (planifie)',
  4: 'En attente',
  5: 'Resolu',
  6: 'Clos',
};

export const TICKET_TYPE = {
  INCIDENT: 1,
  REQUEST: 2,
} as const;

export const TICKET_TYPE_LABELS: Record<number, string> = {
  1: 'Incident',
  2: 'Demande',
};

export const PRIORITY_LABELS: Record<number, string> = {
  1: 'Tres basse',
  2: 'Basse',
  3: 'Moyenne',
  4: 'Haute',
  5: 'Tres haute',
  6: 'Majeure',
};
