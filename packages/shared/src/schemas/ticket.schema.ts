import { z } from 'zod';
import { TICKET_CATEGORIES, TICKET_STATUSES, CRITICALITIES } from '../enums.js';

export const acceptanceCriterionSchema = z.object({
  id: z.string(),
  description: z.string().min(1),
  met: z.boolean().default(false),
});

export const createTicketSchema = z.object({
  title: z.string().min(1).max(200),
  bodyMd: z.string().default(''),
  category: z.enum(TICKET_CATEGORIES as [string, ...string[]]),
  epicId: z.string().min(1),
  repoPath: z.string().nullable().optional(),
  criticalityOverride: z.enum(CRITICALITIES as [string, ...string[]]).nullable().optional(),
  acceptanceCriteria: z.array(acceptanceCriterionSchema).optional(),
});

export const updateTicketSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  bodyMd: z.string().optional(),
  category: z.enum(TICKET_CATEGORIES as [string, ...string[]]).optional(),
  repoPath: z.string().nullable().optional(),
  criticalityOverride: z.enum(CRITICALITIES as [string, ...string[]]).nullable().optional(),
  acceptanceCriteria: z.array(acceptanceCriterionSchema).optional(),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(TICKET_STATUSES as [string, ...string[]]),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type UpdateTicketStatusInput = z.infer<typeof updateTicketStatusSchema>;
