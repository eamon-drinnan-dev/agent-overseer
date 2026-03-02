import { z } from 'zod';

const AGENT_TYPES = ['development', 'triage', 'validation', 'planning'] as const;

export const deployAgentSchema = z.object({
  ticketId: z.string().min(1),
  agentType: z.enum(AGENT_TYPES).default('development'),
  model: z.string().default('claude-sonnet-4-5-20250929'),
  maxTurns: z.number().int().min(1).max(200).default(50),
});

export type DeployAgentInput = z.input<typeof deployAgentSchema>;

export const approveRejectPlanSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

export type ApproveRejectPlanInput = z.infer<typeof approveRejectPlanSchema>;

// Backward compat alias
export const createAgentSessionSchema = deployAgentSchema;
export type CreateAgentSessionInput = DeployAgentInput;
