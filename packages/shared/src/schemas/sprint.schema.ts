import { z } from 'zod';

export const createSprintSchema = z.object({
  name: z.string().min(1).max(100),
  projectId: z.string().min(1),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  goalMd: z.string().default(''),
});

export const updateSprintSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
  goalMd: z.string().optional(),
});

export type CreateSprintInput = z.infer<typeof createSprintSchema>;
export type UpdateSprintInput = z.infer<typeof updateSprintSchema>;
