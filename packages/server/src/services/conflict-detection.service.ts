import { eq, inArray } from 'drizzle-orm';
import type { AppDatabase } from '../db/index.js';
import { tickets, ticketPatterns, patternRegistry } from '../db/schema/index.js';
import type { DispatchPlanConflict } from '@sentinel/shared';

interface TicketPatternSet {
  ticketId: string;
  title: string;
  patternIds: string[];
  tags: Set<string>;
  filePaths: Set<string>;
}

export function createConflictDetectionService(db: AppDatabase) {
  /** Build pattern-set and file-path-set for each ticket. */
  async function buildTicketPatternSets(ticketIds: string[]): Promise<TicketPatternSet[]> {
    if (ticketIds.length === 0) return [];

    const ticketRows = await db
      .select({ id: tickets.id, title: tickets.title, bodyMd: tickets.bodyMd })
      .from(tickets)
      .where(inArray(tickets.id, ticketIds));

    const sets: TicketPatternSet[] = [];

    for (const t of ticketRows) {
      // Get linked patterns
      const links = await db
        .select()
        .from(ticketPatterns)
        .where(eq(ticketPatterns.ticketId, t.id));

      const patternIds = links.map((l) => l.patternId);
      const tags = new Set<string>();
      const filePaths = new Set<string>();

      if (patternIds.length > 0) {
        const patterns = await db
          .select()
          .from(patternRegistry)
          .where(inArray(patternRegistry.id, patternIds));

        for (const p of patterns) {
          for (const tag of p.tags) tags.add(tag);
          filePaths.add(p.path);
        }
      }

      // Extract backtick-wrapped file paths from ticket body
      const pathRegex = /`([^`]+\.[a-zA-Z]{1,10})`/g;
      let match;
      while ((match = pathRegex.exec(t.bodyMd)) !== null) {
        filePaths.add(match[1]!);
      }

      sets.push({ ticketId: t.id, title: t.title, patternIds, tags, filePaths });
    }

    return sets;
  }

  /** Jaccard similarity between two sets. */
  function jaccard(a: Set<string>, b: Set<string>): number {
    if (a.size === 0 && b.size === 0) return 0;
    let intersection = 0;
    for (const item of a) {
      if (b.has(item)) intersection++;
    }
    const union = a.size + b.size - intersection;
    return union === 0 ? 0 : intersection / union;
  }

  return {
    /**
     * Detect potential conflicts between tickets based on:
     * 1. Pattern overlap (Jaccard > 0.3 on tags)
     * 2. File path overlap (any shared extracted file paths)
     */
    async detectConflicts(_projectId: string, ticketIds: string[]): Promise<DispatchPlanConflict[]> {
      const sets = await buildTicketPatternSets(ticketIds);
      const conflicts: DispatchPlanConflict[] = [];

      for (let i = 0; i < sets.length; i++) {
        for (let j = i + 1; j < sets.length; j++) {
          const a = sets[i]!;
          const b = sets[j]!;
          const reasons: string[] = [];

          // Check tag similarity
          const tagSim = jaccard(a.tags, b.tags);
          if (tagSim > 0.3) {
            reasons.push(`Tag similarity: ${(tagSim * 100).toFixed(0)}%`);
          }

          // Check file path overlap
          const sharedPaths: string[] = [];
          for (const path of a.filePaths) {
            if (b.filePaths.has(path)) sharedPaths.push(path);
          }
          if (sharedPaths.length > 0) {
            reasons.push(`Shared files: ${sharedPaths.slice(0, 3).join(', ')}${sharedPaths.length > 3 ? ` (+${sharedPaths.length - 3} more)` : ''}`);
          }

          if (reasons.length > 0) {
            const severity = (tagSim > 0.6 || sharedPaths.length >= 3)
              ? 'high'
              : (tagSim > 0.3 || sharedPaths.length >= 1)
                ? 'medium'
                : 'low';

            conflicts.push({
              ticketIdA: a.ticketId,
              ticketIdB: b.ticketId,
              reason: reasons.join('; '),
              severity,
            });
          }
        }
      }

      return conflicts;
    },
  };
}
