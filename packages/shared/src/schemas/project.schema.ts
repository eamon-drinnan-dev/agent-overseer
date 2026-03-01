import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  repoPath: z.string().min(1),
  claudeMdPath: z.string().nullable().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
