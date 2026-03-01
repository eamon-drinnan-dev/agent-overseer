import { z } from 'zod';

export const createPatternSchema = z.object({
  projectId: z.string().min(1),
  path: z.string().min(1),
  type: z.string().min(1),
  patternName: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

export const updatePatternSchema = createPatternSchema.omit({ projectId: true }).partial();

export type CreatePatternInput = z.infer<typeof createPatternSchema>;
export type UpdatePatternInput = z.infer<typeof updatePatternSchema>;
