// Enums and constants
export {
  TicketCategory,
  TICKET_CATEGORIES,
  TicketStatus,
  TICKET_STATUSES,
  Criticality,
  CRITICALITIES,
  EpicStatus,
  EPIC_STATUSES,
  ArtifactType,
  AgentType,
  AgentSessionStatus,
  VALID_TRANSITIONS,
} from './enums.js';

// Types
export type {
  Project,
  Epic,
  Ticket,
  TicketArtifact,
  AcceptanceCriterion,
  Sprint,
  PatternEntry,
  AgentSession,
} from './types/index.js';

// Schemas
export {
  createProjectSchema,
  updateProjectSchema,
  createEpicSchema,
  updateEpicSchema,
  createTicketSchema,
  updateTicketSchema,
  updateTicketStatusSchema,
  acceptanceCriterionSchema,
  createSprintSchema,
  updateSprintSchema,
  createPatternSchema,
  updatePatternSchema,
  createAgentSessionSchema,
} from './schemas/index.js';

export type {
  CreateProjectInput,
  UpdateProjectInput,
  CreateEpicInput,
  UpdateEpicInput,
  CreateTicketInput,
  UpdateTicketInput,
  UpdateTicketStatusInput,
  CreateSprintInput,
  UpdateSprintInput,
  CreatePatternInput,
  UpdatePatternInput,
  CreateAgentSessionInput,
} from './schemas/index.js';

// API
export { API_ROUTES } from './api/index.js';
