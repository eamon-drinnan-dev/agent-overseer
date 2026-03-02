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
  repoPath: string | null;
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
  epicId: string | null;
  type: ArtifactType;
  contentMd: string;
  agentSessionId: string | null;
  createdAt: string;
}

export interface ValidationCriterionResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  details: string;
  items?: Array<{ description: string; met: boolean; notes?: string }>;
}

export interface ValidationResult {
  result: 'PASS' | 'FAIL';
  criteria: ValidationCriterionResult[];
  summary: string;
  feedback?: string;
}
