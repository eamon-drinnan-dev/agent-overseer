import { z } from 'zod';

const dispatchPlanTicketBriefSchema = z.object({
  ticketId: z.string(),
  title: z.string(),
  repoPath: z.string().nullable(),
  agentBrief: z.string(),
  model: z.string().nullable(),
  complexity: z.enum(['low', 'medium', 'high']),
});

const dispatchPlanGroupSchema = z.object({
  groupIndex: z.number().int().min(1),
  label: z.string(),
  tickets: z.array(dispatchPlanTicketBriefSchema).min(1),
  dependsOnGroups: z.array(z.number().int()),
});

const dispatchPlanConflictSchema = z.object({
  ticketIdA: z.string(),
  ticketIdB: z.string(),
  reason: z.string(),
  severity: z.enum(['low', 'medium', 'high']),
});

const dispatchPlanDependencySchema = z.object({
  ticketId: z.string(),
  dependsOnTicketId: z.string(),
  reason: z.string(),
  type: z.enum(['blocks', 'informs']),
});

export const dispatchPlanSchema = z.object({
  version: z.literal(1),
  epicId: z.string(),
  generatedAt: z.string(),
  summary: z.string(),
  groups: z.array(dispatchPlanGroupSchema).min(1),
  dependencies: z.array(dispatchPlanDependencySchema),
  conflicts: z.array(dispatchPlanConflictSchema),
  totalTickets: z.number().int().min(0),
  excluded: z.array(z.object({
    ticketId: z.string(),
    reason: z.string(),
  })),
});

export type DispatchPlanInput = z.infer<typeof dispatchPlanSchema>;
