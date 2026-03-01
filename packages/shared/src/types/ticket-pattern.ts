export interface TicketPattern {
  id: string;
  ticketId: string;
  patternId: string;
  pinned: boolean;
  autoMatched: boolean;
  createdAt: string;
}

/** Pattern with link metadata — returned by GET /api/tickets/:id/patterns */
export interface LinkedPattern {
  id: string;
  projectId: string;
  path: string;
  type: string;
  patternName: string;
  tags: string[];
  lastUpdated: string;
  pinned: boolean;
  autoMatched: boolean;
  linkId: string;
}
