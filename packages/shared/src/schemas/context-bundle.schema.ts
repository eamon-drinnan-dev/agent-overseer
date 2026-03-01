import { z } from 'zod';

export const tokenBudgetSchema = z.object({
  budget: z.number().int().positive().default(80_000),
});

export type TokenBudgetInput = z.infer<typeof tokenBudgetSchema>;
