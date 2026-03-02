import { z } from 'zod';
import { DEPENDENCY_TYPES } from '../enums.js';

export const createTicketDependencySchema = z.object({
  dependsOnTicketId: z.string().min(1),
  dependencyType: z.enum(DEPENDENCY_TYPES as [string, ...string[]]),
});

export type CreateTicketDependencyInput = z.infer<typeof createTicketDependencySchema>;
