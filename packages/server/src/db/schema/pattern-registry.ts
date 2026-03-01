import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { projects } from './projects';

export const patternRegistry = sqliteTable('pattern_registry', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  path: text('path').notNull(),
  type: text('type').notNull(),
  patternName: text('pattern_name').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  lastUpdated: text('last_updated').notNull().$defaultFn(() => new Date().toISOString()),
});
