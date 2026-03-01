import { z } from 'zod';
import { PATTERN_TYPES } from '../enums.js';

export const createPatternSchema = z.object({
  projectId: z.string().min(1),
  path: z.string().min(1),
  type: z.enum(PATTERN_TYPES as [string, ...string[]]),
  patternName: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export const updatePatternSchema = createPatternSchema.omit({ projectId: true }).partial();

export type CreatePatternInput = z.infer<typeof createPatternSchema>;
export type UpdatePatternInput = z.infer<typeof updatePatternSchema>;
