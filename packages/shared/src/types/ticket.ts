import type { TicketCategory, TicketStatus, Criticality, ArtifactType } from '../enums.js';

export interface AcceptanceCriterion {
  id: string;
  description: string;
  met: boolean;
}

export interface Ticket {
  id: string;
  title: string;
  bodyMd: string;
  category: TicketCategory;
  status: TicketStatus;
  criticalityOverride: Criticality | null;
  epicId: string;
  assignedAgentId: string | null;
  acceptanceCriteria: AcceptanceCriterion[];
  estimatedTokens: number | null;
  filePath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketArtifact {
  id: string;
  ticketId: string;
  type: ArtifactType;
  contentMd: string;
  agentSessionId: string | null;
  createdAt: string;
}
