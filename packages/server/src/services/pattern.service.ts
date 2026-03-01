import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AppDatabase } from '../db/index.js';
import { patternRegistry, ticketPatterns } from '../db/schema/index.js';
import type { CreatePatternInput, UpdatePatternInput } from '@sentinel/shared';

type PatternInsert = typeof patternRegistry.$inferInsert;

export function createPatternService(db: AppDatabase) {
  return {
    async listByProject(projectId: string) {
      return db.select().from(patternRegistry).where(eq(patternRegistry.projectId, projectId));
    },

    async getById(id: string) {
      const results = await db.select().from(patternRegistry).where(eq(patternRegistry.id, id));
      return results[0] ?? null;
    },

    async create(input: CreatePatternInput) {
      const id = nanoid();
      const now = new Date().toISOString();
      const values: PatternInsert = {
        id,
        projectId: input.projectId,
        path: input.path,
        type: input.type as PatternInsert['type'],
        patternName: input.patternName,
        tags: input.tags ?? [],
        lastUpdated: now,
      };
      await db.insert(patternRegistry).values(values);
      return this.getById(id);
    },

    async update(id: string, input: UpdatePatternInput) {
      const set: Partial<PatternInsert> = { lastUpdated: new Date().toISOString() };
      if (input.path !== undefined) set.path = input.path;
      if (input.type !== undefined) set.type = input.type as PatternInsert['type'];
      if (input.patternName !== undefined) set.patternName = input.patternName;
      if (input.tags !== undefined) set.tags = input.tags;
      await db.update(patternRegistry).set(set).where(eq(patternRegistry.id, id));
      return this.getById(id);
    },

    async delete(id: string) {
      await db.delete(ticketPatterns).where(eq(ticketPatterns.patternId, id));
      await db.delete(patternRegistry).where(eq(patternRegistry.id, id));
    },

    async searchByTags(projectId: string, tags: string[]) {
      const all = await this.listByProject(projectId);
      if (tags.length === 0) return all;
      const tagSet = new Set(tags.map((t) => t.toLowerCase()));
      return all.filter((pattern) =>
        pattern.tags.some((t) => tagSet.has(t.toLowerCase())),
      );
    },
  };
}
