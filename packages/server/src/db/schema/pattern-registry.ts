import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { projects } from './projects';
import { peerGroups } from './peer-groups';

export const patternRegistry = sqliteTable('pattern_registry', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  path: text('path').notNull(),
  type: text('type').notNull(),
  patternName: text('pattern_name').notNull(),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default([]),
  peerGroupId: text('peer_group_id').references(() => peerGroups.id),
  lastUpdated: text('last_updated').notNull().$defaultFn(() => new Date().toISOString()),
});
