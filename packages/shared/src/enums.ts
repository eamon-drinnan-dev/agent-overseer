export const TicketCategory = {
  Feature: 'feature',
  TechDebt: 'tech_debt',
  PapercutAndPolish: 'papercut_and_polish',
  Bug: 'bug',
  Infrastructure: 'infrastructure',
  Documentation: 'documentation',
} as const;
export type TicketCategory = (typeof TicketCategory)[keyof typeof TicketCategory];

export const TICKET_CATEGORIES = Object.values(TicketCategory);

export const TicketStatus = {
  ToDo: 'todo',
  InProgress: 'in_progress',
  InReview: 'in_review',
  Validation: 'validation',
  Complete: 'complete',
  Failed: 'failed',
} as const;
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];

export const TICKET_STATUSES = Object.values(TicketStatus);

export const Criticality = {
  Critical: 'critical',
  Standard: 'standard',
  Minor: 'minor',
} as const;
export type Criticality = (typeof Criticality)[keyof typeof Criticality];

export const CRITICALITIES = Object.values(Criticality);

export const EpicStatus = {
  Planning: 'planning',
  Active: 'active',
  Complete: 'complete',
  OnHold: 'on_hold',
} as const;
export type EpicStatus = (typeof EpicStatus)[keyof typeof EpicStatus];

export const EPIC_STATUSES = Object.values(EpicStatus);

export const ArtifactType = {
  Plan: 'plan',
  ExecutionSummary: 'execution_summary',
  Review: 'review',
  Validation: 'validation',
} as const;
export type ArtifactType = (typeof ArtifactType)[keyof typeof ArtifactType];

export const AgentType = {
  Development: 'development',
  Triage: 'triage',
  Validation: 'validation',
  Planning: 'planning',
} as const;
export type AgentType = (typeof AgentType)[keyof typeof AgentType];

export const AgentSessionStatus = {
  Idle: 'idle',
  Planning: 'planning',
  AwaitingReview: 'awaiting_review',
  Executing: 'executing',
  Reviewing: 'reviewing',
  Complete: 'complete',
  Failed: 'failed',
} as const;
export type AgentSessionStatus = (typeof AgentSessionStatus)[keyof typeof AgentSessionStatus];

export const AGENT_SESSION_STATUSES = Object.values(AgentSessionStatus);

export const AgentPhase = {
  Plan: 'plan',
  Execute: 'execute',
  SelfReview: 'self_review',
  Submit: 'submit',
} as const;
export type AgentPhase = (typeof AgentPhase)[keyof typeof AgentPhase];

/** Valid agent session status transitions */
export const VALID_SESSION_TRANSITIONS: Record<AgentSessionStatus, AgentSessionStatus[]> = {
  [AgentSessionStatus.Idle]: [AgentSessionStatus.Planning],
  [AgentSessionStatus.Planning]: [AgentSessionStatus.AwaitingReview, AgentSessionStatus.Executing, AgentSessionStatus.Failed],
  [AgentSessionStatus.AwaitingReview]: [AgentSessionStatus.Executing, AgentSessionStatus.Failed],
  [AgentSessionStatus.Executing]: [AgentSessionStatus.Reviewing, AgentSessionStatus.Failed],
  [AgentSessionStatus.Reviewing]: [AgentSessionStatus.Complete, AgentSessionStatus.Failed],
  [AgentSessionStatus.Complete]: [],
  [AgentSessionStatus.Failed]: [],
};

// --- Agent Models ---

export const AgentModel = {
  Opus: 'claude-opus-4-6',
  Sonnet: 'claude-sonnet-4-6',
  Haiku: 'claude-haiku-4-5',
} as const;
export type AgentModel = (typeof AgentModel)[keyof typeof AgentModel];

export const AGENT_MODELS = Object.values(AgentModel);

/** Human-readable labels for agent models */
export const AGENT_MODEL_LABELS: Record<AgentModel, string> = {
  [AgentModel.Opus]: 'Opus 4.6',
  [AgentModel.Sonnet]: 'Sonnet 4.6',
  [AgentModel.Haiku]: 'Haiku 4.5',
};

/** Default model: Critical/Standard → Opus, Minor → Sonnet */
export const DEFAULT_AGENT_MODEL = AgentModel.Opus;

/** Pick the right model based on ticket criticality */
export function getDefaultModelForCriticality(criticality: Criticality): AgentModel {
  if (criticality === 'minor') return AgentModel.Sonnet;
  return AgentModel.Opus; // critical + standard
}

export const PatternType = {
  Component: 'component',
  Hook: 'hook',
  Utility: 'utility',
  Service: 'service',
  Store: 'store',
  Layout: 'layout',
} as const;
export type PatternType = (typeof PatternType)[keyof typeof PatternType];

export const PATTERN_TYPES = Object.values(PatternType);

/** Valid ticket status transitions */
export const VALID_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  [TicketStatus.ToDo]: [TicketStatus.InProgress],
  [TicketStatus.InProgress]: [TicketStatus.InReview],
  [TicketStatus.InReview]: [TicketStatus.Validation],
  [TicketStatus.Validation]: [TicketStatus.Complete, TicketStatus.Failed],
  [TicketStatus.Complete]: [],
  [TicketStatus.Failed]: [TicketStatus.InProgress],
};
