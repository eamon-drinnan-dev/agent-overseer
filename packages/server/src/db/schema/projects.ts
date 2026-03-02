import { sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  repoPath: text('repo_path').notNull(),
  workspacePaths: text('workspace_paths', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  claudeMdPath: text('claude_md_path'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});
