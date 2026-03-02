import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AppDatabase } from '../db/index.js';
import { epics, tickets, ticketArtifacts, ticketPatterns } from '../db/schema/index.js';
import type { CreateEpicInput, UpdateEpicInput } from '@sentinel/shared';

type EpicInsert = typeof epics.$inferInsert;

export function createEpicService(db: AppDatabase) {
  return {
    async listByProject(projectId: string) {
      return db.select().from(epics).where(eq(epics.projectId, projectId));
    },

    async getById(id: string) {
      const results = await db.select().from(epics).where(eq(epics.id, id));
      return results[0] ?? null;
    },

    async create(input: CreateEpicInput) {
      const id = nanoid();
      const now = new Date().toISOString();
      const values: EpicInsert = {
        id,
        title: input.title,
        descriptionMd: input.descriptionMd ?? '',
        criticality: (input.criticality ?? 'standard') as EpicInsert['criticality'],
        projectId: input.projectId,
        sprintId: input.sprintId ?? null,
        createdAt: now,
        updatedAt: now,
      };
      await db.insert(epics).values(values);
      return this.getById(id);
    },

    async update(id: string, input: UpdateEpicInput) {
      const set: Partial<EpicInsert> = { updatedAt: new Date().toISOString() };
      if (input.title !== undefined) set.title = input.title;
      if (input.descriptionMd !== undefined) set.descriptionMd = input.descriptionMd;
      if (input.criticality !== undefined) set.criticality = input.criticality as EpicInsert['criticality'];
      if (input.status !== undefined) set.status = input.status as EpicInsert['status'];
      if (input.sprintId !== undefined) set.sprintId = input.sprintId;
      if (input.reviewPlans !== undefined) set.reviewPlans = input.reviewPlans;
      await db.update(epics).set(set).where(eq(epics.id, id));
      return this.getById(id);
    },

    async delete(id: string) {
      // Cascade: ticket_patterns → artifacts → tickets → epic
      const epicTickets = await db.select({ id: tickets.id }).from(tickets).where(eq(tickets.epicId, id));
      for (const t of epicTickets) {
        await db.delete(ticketPatterns).where(eq(ticketPatterns.ticketId, t.id));
        await db.delete(ticketArtifacts).where(eq(ticketArtifacts.ticketId, t.id));
      }
      await db.delete(tickets).where(eq(tickets.epicId, id));
      await db.delete(epics).where(eq(epics.id, id));
    },
  };
}
