/**
 * Simple token estimation heuristic.
 * Approximation: 1 token ≈ 4 characters for English text.
 * Avoids tiktoken native dependency. Can be upgraded later
 * without changing the interface.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

export const DEFAULT_TOKEN_BUDGET = 80_000;
export const TIER1_TARGET = 2_000;
export const TIER1_HARD_LIMIT = 3_000;
export const TIER2_TARGET = 8_000;
export const TIER2_HARD_LIMIT = 12_000;
export const COMBINED_HARD_LIMIT = 15_000;
