import { z } from 'zod';

export const createPeerGroupSchema = z.object({
  projectId: z.string().min(1),
  patternId: z.string().nullable().default(null),
  name: z.string().min(1),
  description: z.string().default(''),
  conventionSummary: z.string().min(10, 'Convention summary must be at least 10 characters'),
});

export const updatePeerGroupSchema = createPeerGroupSchema
  .omit({ projectId: true })
  .partial();

export type CreatePeerGroupInput = z.infer<typeof createPeerGroupSchema>;
export type UpdatePeerGroupInput = z.infer<typeof updatePeerGroupSchema>;
