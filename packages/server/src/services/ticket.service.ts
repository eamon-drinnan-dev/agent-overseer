import { eq, and, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AppDatabase } from '../db/index.js';
import { tickets, ticketArtifacts, ticketPatterns, ticketDependencies } from '../db/schema/index.js';
import {
  VALID_TRANSITIONS,
  type CreateTicketInput,
  type UpdateTicketInput,
  type TicketStatus,
} from '@sentinel/shared';

type TicketInsert = typeof tickets.$inferInsert;
type ArtifactInsert = typeof ticketArtifacts.$inferInsert;

export function createTicketService(db: AppDatabase) {
  return {
    async list(filters?: { epicId?: string; status?: string; category?: string }) {
      const conditions = [];
      if (filters?.epicId) conditions.push(eq(tickets.epicId, filters.epicId));
      if (filters?.status) conditions.push(eq(tickets.status, filters.status as NonNullable<TicketInsert['status']>));
      if (filters?.category) conditions.push(eq(tickets.category, filters.category as TicketInsert['category']));

      if (conditions.length > 0) {
        return db.select().from(tickets).where(and(...conditions));
      }
      return db.select().from(tickets);
    },

    async getById(id: string) {
      const results = await db.select().from(tickets).where(eq(tickets.id, id));
      return results[0] ?? null;
    },

    async create(input: CreateTicketInput) {
      const id = nanoid();
      const now = new Date().toISOString();
      const values: TicketInsert = {
        id,
        title: input.title,
        bodyMd: input.bodyMd ?? '',
        category: input.category as TicketInsert['category'],
        epicId: input.epicId,
        repoPath: input.repoPath ?? null,
        criticalityOverride: (input.criticalityOverride ?? null) as TicketInsert['criticalityOverride'],
        acceptanceCriteria: input.acceptanceCriteria ?? [],
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(tickets).values(values);
      return this.getById(id);
    },

    async update(id: string, input: UpdateTicketInput) {
      const set: Partial<TicketInsert> = { updatedAt: new Date().toISOString() };
      if (input.title !== undefined) set.title = input.title;
      if (input.bodyMd !== undefined) set.bodyMd = input.bodyMd;
      if (input.category !== undefined) set.category = input.category as TicketInsert['category'];
      if (input.repoPath !== undefined) set.repoPath = input.repoPath;
      if (input.criticalityOverride !== undefined) set.criticalityOverride = input.criticalityOverride as TicketInsert['criticalityOverride'];
      if (input.acceptanceCriteria !== undefined) set.acceptanceCriteria = input.acceptanceCriteria;
      await db.update(tickets).set(set).where(eq(tickets.id, id));
      return this.getById(id);
    },

    async updateStatus(id: string, newStatus: TicketStatus) {
      const ticket = await this.getById(id);
      if (!ticket) throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });

      const currentStatus = ticket.status as TicketStatus;
      const allowed = VALID_TRANSITIONS[currentStatus];
      if (!allowed?.includes(newStatus)) {
        throw Object.assign(
          new Error(`Invalid transition from ${currentStatus} to ${newStatus}`),
          { statusCode: 400 },
        );
      }

      await db
        .update(tickets)
        .set({ status: newStatus as NonNullable<TicketInsert['status']>, updatedAt: new Date().toISOString() })
        .where(eq(tickets.id, id));
      return this.getById(id);
    },

    async updateAgentAssignment(id: string, sessionId: string | null) {
      await db
        .update(tickets)
        .set({ assignedAgentId: sessionId, updatedAt: new Date().toISOString() })
        .where(eq(tickets.id, id));
      return this.getById(id);
    },

    async delete(id: string) {
      await db.delete(ticketDependencies).where(
        or(eq(ticketDependencies.ticketId, id), eq(ticketDependencies.dependsOnTicketId, id)),
      );
      await db.delete(ticketPatterns).where(eq(ticketPatterns.ticketId, id));
      await db.delete(ticketArtifacts).where(eq(ticketArtifacts.ticketId, id));
      await db.delete(tickets).where(eq(tickets.id, id));
    },

    async listArtifacts(ticketId: string) {
      return db
        .select()
        .from(ticketArtifacts)
        .where(eq(ticketArtifacts.ticketId, ticketId));
    },

    async createArtifact(ticketId: string, input: { type: string; contentMd: string; agentSessionId?: string; epicId?: string }) {
      const id = nanoid();
      const values: ArtifactInsert = {
        id,
        ticketId,
        epicId: input.epicId ?? null,
        type: input.type as ArtifactInsert['type'],
        contentMd: input.contentMd,
        agentSessionId: input.agentSessionId ?? null,
        createdAt: new Date().toISOString(),
      };
      await db.insert(ticketArtifacts).values(values);
      const results = await db.select().from(ticketArtifacts).where(eq(ticketArtifacts.id, id));
      return results[0] ?? null;
    },
  };
}
