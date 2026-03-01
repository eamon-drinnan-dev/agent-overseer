import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { projects } from './projects';

export const sprints = sqliteTable('sprints', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  projectId: text('project_id').notNull().references(() => projects.id),
  startDate: text('start_date'),
  endDate: text('end_date'),
  goalMd: text('goal_md').notNull().default(''),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
