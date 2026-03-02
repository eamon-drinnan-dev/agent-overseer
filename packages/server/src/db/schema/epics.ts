import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { projects } from './projects';

export const epics = sqliteTable('epics', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  descriptionMd: text('description_md').notNull().default(''),
  criticality: text('criticality', {
    enum: ['critical', 'standard', 'minor'],
  }).notNull().default('standard'),
  status: text('status', {
    enum: ['planning', 'active', 'complete', 'on_hold'],
  }).notNull().default('planning'),
  projectId: text('project_id').notNull().references(() => projects.id),
  sprintId: text('sprint_id'),
  progressPct: integer('progress_pct').notNull().default(0),
  reviewPlans: integer('review_plans', { mode: 'boolean' }).notNull().default(false),
  filePath: text('file_path'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
