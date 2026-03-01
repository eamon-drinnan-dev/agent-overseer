import type { PatternEntry } from '@sentinel/shared';

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'shall', 'can', 'to', 'of', 'in', 'for',
  'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'between', 'and', 'but', 'or',
  'not', 'no', 'nor', 'so', 'yet', 'both', 'either', 'neither', 'each',
  'every', 'all', 'any', 'few', 'more', 'most', 'other', 'some', 'such',
  'than', 'too', 'very', 'just', 'also', 'now', 'then', 'here', 'there',
  'when', 'where', 'why', 'how', 'what', 'which', 'who', 'whom', 'this',
  'that', 'these', 'those', 'it', 'its', 'i', 'me', 'my', 'we', 'us',
  'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them',
  'their', 'if', 'else', 'while', 'until', 'about', 'up', 'out', 'down',
]);

/**
 * Extract keywords from ticket content for matching against pattern tags.
 */
export function extractTicketKeywords(ticket: {
  title: string;
  bodyMd: string;
  category: string;
  acceptanceCriteria: Array<{ description: string }>;
}): string[] {
  const acDescriptions = (ticket.acceptanceCriteria ?? []).map((ac) => ac.description);
  const text = [
    ticket.title,
    ticket.bodyMd,
    ticket.category.replace(/_/g, ' '),
    ...acDescriptions,
  ].join(' ');

  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, ' ')
    .split(/[\s_-]+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));

  return [...new Set(words)];
}

/**
 * Score a pattern against ticket keywords using Jaccard similarity.
 * Returns 0–1 relevance score based on tag overlap.
 */
export function scorePatternMatch(
  patternTags: string[],
  ticketKeywords: string[],
): number {
  if (patternTags.length === 0 || ticketKeywords.length === 0) return 0;

  const tagSet = new Set(patternTags.map((t) => t.toLowerCase()));
  const keywordSet = new Set(ticketKeywords);

  let intersection = 0;
  for (const tag of tagSet) {
    if (keywordSet.has(tag)) intersection++;
  }

  if (intersection === 0) return 0;
  const union = new Set([...tagSet, ...keywordSet]).size;
  return intersection / union;
}

/**
 * Find top N matching patterns for a ticket from the project registry.
 */
export function findMatchingPatterns(
  patterns: PatternEntry[],
  ticketKeywords: string[],
  maxResults = 5,
): Array<PatternEntry & { score: number }> {
  const scored = patterns
    .map((pattern) => ({
      ...pattern,
      score: scorePatternMatch(pattern.tags, ticketKeywords),
    }))
    .filter((p) => p.score > 0.1)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, maxResults);
}
