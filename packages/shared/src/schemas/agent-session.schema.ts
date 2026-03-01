import { z } from 'zod';

const AGENT_TYPES = ['development', 'triage', 'validation', 'planning'] as const;

export const createAgentSessionSchema = z.object({
  ticketId: z.string().nullable().optional(),
  agentType: z.enum(AGENT_TYPES),
});

export type CreateAgentSessionInput = z.infer<typeof createAgentSessionSchema>;
