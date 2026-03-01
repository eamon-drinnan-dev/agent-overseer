import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AppDatabase } from '../db/index.js';
import { sprints, epics } from '../db/schema/index.js';
import type { CreateSprintInput, UpdateSprintInput } from '@sentinel/shared';

export function createSprintService(db: AppDatabase) {
  return {
    async listByProject(projectId: string) {
      return db.select().from(sprints).where(eq(sprints.projectId, projectId));
    },

    async getById(id: string) {
      const results = await db.select().from(sprints).where(eq(sprints.id, id));
      return results[0] ?? null;
    },

    async create(input: CreateSprintInput) {
      const id = nanoid();
      const now = new Date().toISOString();
      await db.insert(sprints).values({
        id,
        name: input.name,
        projectId: input.projectId,
        startDate: input.startDate ?? null,
        endDate: input.endDate ?? null,
        goalMd: input.goalMd ?? '',
        createdAt: now,
        updatedAt: now,
      });
      return this.getById(id);
    },

    async update(id: string, input: UpdateSprintInput) {
      await db
        .update(sprints)
        .set({ ...input, updatedAt: new Date().toISOString() })
        .where(eq(sprints.id, id));
      return this.getById(id);
    },

    async delete(id: string) {
      // Nullify sprintId on any epics referencing this sprint
      await db.update(epics).set({ sprintId: null }).where(eq(epics.sprintId, id));
      await db.delete(sprints).where(eq(sprints.id, id));
    },
  };
}
