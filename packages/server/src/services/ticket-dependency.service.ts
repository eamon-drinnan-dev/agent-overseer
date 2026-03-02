import { eq, and, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AppDatabase } from '../db/index.js';
import { ticketDependencies, tickets } from '../db/schema/index.js';
import type { DependencyType, TicketDependencyWithInfo } from '@sentinel/shared';

type DepInsert = typeof ticketDependencies.$inferInsert;

export function createTicketDependencyService(db: AppDatabase) {
  return {
    async create(ticketId: string, dependsOnTicketId: string, dependencyType: string) {
      // Self-reference check
      if (ticketId === dependsOnTicketId) {
        throw Object.assign(new Error('A ticket cannot depend on itself'), { statusCode: 400 });
      }

      // Single-level cycle detection: check if the reverse already exists
      const reverse = await db
        .select()
        .from(ticketDependencies)
        .where(
          and(
            eq(ticketDependencies.ticketId, dependsOnTicketId),
            eq(ticketDependencies.dependsOnTicketId, ticketId),
          ),
        );
      if (reverse.length > 0) {
        throw Object.assign(
          new Error('Circular dependency: reverse relationship already exists'),
          { statusCode: 409 },
        );
      }

      // Duplicate check
      const existing = await db
        .select()
        .from(ticketDependencies)
        .where(
          and(
            eq(ticketDependencies.ticketId, ticketId),
            eq(ticketDependencies.dependsOnTicketId, dependsOnTicketId),
          ),
        );
      if (existing.length > 0) {
        throw Object.assign(new Error('Dependency already exists'), { statusCode: 409 });
      }

      const id = nanoid();
      const values: DepInsert = {
        id,
        ticketId,
        dependsOnTicketId,
        dependencyType: dependencyType as DepInsert['dependencyType'],
        createdAt: new Date().toISOString(),
      };
      await db.insert(ticketDependencies).values(values);

      const results = await db.select().from(ticketDependencies).where(eq(ticketDependencies.id, id));
      return results[0] ?? null;
    },

    async delete(id: string) {
      const existing = await db.select().from(ticketDependencies).where(eq(ticketDependencies.id, id));
      if (!existing[0]) {
        throw Object.assign(new Error('Dependency not found'), { statusCode: 404 });
      }
      await db.delete(ticketDependencies).where(eq(ticketDependencies.id, id));
    },

    async listForTicket(ticketId: string): Promise<TicketDependencyWithInfo[]> {
      const deps = await db
        .select()
        .from(ticketDependencies)
        .where(
          or(
            eq(ticketDependencies.ticketId, ticketId),
            eq(ticketDependencies.dependsOnTicketId, ticketId),
          ),
        );

      // Enrich with target ticket info
      const enriched: TicketDependencyWithInfo[] = [];
      for (const dep of deps) {
        const targetId = dep.ticketId === ticketId ? dep.dependsOnTicketId : dep.ticketId;
        const targetRows = await db.select().from(tickets).where(eq(tickets.id, targetId));
        const target = targetRows[0];
        enriched.push({
          ...dep,
          dependencyType: dep.dependencyType as DependencyType,
          dependsOnTitle: target?.title ?? 'Unknown',
          dependsOnStatus: (target?.status ?? 'todo') as TicketDependencyWithInfo['dependsOnStatus'],
        });
      }
      return enriched;
    },

    /** Returns unmet 'blocks' dependencies (target tickets not in terminal state). */
    async checkBlocking(ticketId: string): Promise<TicketDependencyWithInfo[]> {
      const deps = await db
        .select()
        .from(ticketDependencies)
        .where(
          and(
            eq(ticketDependencies.ticketId, ticketId),
            eq(ticketDependencies.dependencyType, 'blocks'),
          ),
        );

      const unmet: TicketDependencyWithInfo[] = [];
      const terminalStatuses = ['complete', 'failed'];

      for (const dep of deps) {
        const targetRows = await db.select().from(tickets).where(eq(tickets.id, dep.dependsOnTicketId));
        const target = targetRows[0];
        if (!target || !terminalStatuses.includes(target.status)) {
          unmet.push({
            ...dep,
            dependencyType: dep.dependencyType as DependencyType,
            dependsOnTitle: target?.title ?? 'Unknown',
            dependsOnStatus: (target?.status ?? 'todo') as TicketDependencyWithInfo['dependsOnStatus'],
          });
        }
      }
      return unmet;
    },

    /** Delete all dependencies involving a ticket (for cascade delete). */
    async deleteAllForTicket(ticketId: string) {
      await db.delete(ticketDependencies).where(
        or(
          eq(ticketDependencies.ticketId, ticketId),
          eq(ticketDependencies.dependsOnTicketId, ticketId),
        ),
      );
    },
  };
}
