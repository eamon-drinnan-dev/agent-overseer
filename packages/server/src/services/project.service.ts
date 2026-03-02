import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AppDatabase } from '../db/index.js';
import { projects, epics, tickets, ticketArtifacts, sprints, patternRegistry, ticketPatterns, ticketDependencies } from '../db/schema/index.js';
import { or } from 'drizzle-orm';
import type { CreateProjectInput, UpdateProjectInput } from '@sentinel/shared';

export function createProjectService(db: AppDatabase) {
  return {
    async list() {
      return db.select().from(projects);
    },

    async getById(id: string) {
      const results = await db.select().from(projects).where(eq(projects.id, id));
      return results[0] ?? null;
    },

    async create(input: CreateProjectInput) {
      const id = nanoid();
      const now = new Date().toISOString();
      await db.insert(projects).values({
        id,
        ...input,
        createdAt: now,
        updatedAt: now,
      });
      return this.getById(id);
    },

    async update(id: string, input: UpdateProjectInput) {
      await db
        .update(projects)
        .set({ ...input, updatedAt: new Date().toISOString() })
        .where(eq(projects.id, id));
      return this.getById(id);
    },

    async delete(id: string) {
      // Cascade: ticket_patterns → artifacts → tickets → epics → patterns → sprints → project
      const projectEpics = await db.select({ id: epics.id }).from(epics).where(eq(epics.projectId, id));
      for (const epic of projectEpics) {
        const epicTickets = await db.select({ id: tickets.id }).from(tickets).where(eq(tickets.epicId, epic.id));
        for (const t of epicTickets) {
          await db.delete(ticketDependencies).where(
            or(eq(ticketDependencies.ticketId, t.id), eq(ticketDependencies.dependsOnTicketId, t.id)),
          );
          await db.delete(ticketPatterns).where(eq(ticketPatterns.ticketId, t.id));
          await db.delete(ticketArtifacts).where(eq(ticketArtifacts.ticketId, t.id));
        }
        await db.delete(tickets).where(eq(tickets.epicId, epic.id));
      }
      await db.delete(epics).where(eq(epics.projectId, id));
      await db.delete(patternRegistry).where(eq(patternRegistry.projectId, id));
      await db.delete(sprints).where(eq(sprints.projectId, id));
      await db.delete(projects).where(eq(projects.id, id));
    },
  };
}
