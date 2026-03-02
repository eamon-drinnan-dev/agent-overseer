import { z } from 'zod';
import { CRITICALITIES, EPIC_STATUSES } from '../enums.js';

export const createEpicSchema = z.object({
  title: z.string().min(1).max(200),
  descriptionMd: z.string().default(''),
  criticality: z.enum(CRITICALITIES as [string, ...string[]]).default('standard'),
  projectId: z.string().min(1),
  sprintId: z.string().nullable().optional(),
});

export const updateEpicSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  descriptionMd: z.string().optional(),
  criticality: z.enum(CRITICALITIES as [string, ...string[]]).optional(),
  status: z.enum(EPIC_STATUSES as [string, ...string[]]).optional(),
  sprintId: z.string().nullable().optional(),
  reviewPlans: z.boolean().optional(),
});

export type CreateEpicInput = z.infer<typeof createEpicSchema>;
export type UpdateEpicInput = z.infer<typeof updateEpicSchema>;
