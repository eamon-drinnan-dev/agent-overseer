import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { projects } from './projects';

export const peerGroups = sqliteTable('peer_groups', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id),
  patternId: text('pattern_id'), // exemplar — circular FK, enforced at service layer
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  conventionSummary: text('convention_summary').notNull().default(''),
  lastUpdated: text('last_updated').notNull().$defaultFn(() => new Date().toISOString()),
});
