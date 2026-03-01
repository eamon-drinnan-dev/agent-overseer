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
  Planning: 'planning',
  Executing: 'executing',
  Reviewing: 'reviewing',
  Complete: 'complete',
  Failed: 'failed',
  Idle: 'idle',
} as const;
export type AgentSessionStatus = (typeof AgentSessionStatus)[keyof typeof AgentSessionStatus];

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
