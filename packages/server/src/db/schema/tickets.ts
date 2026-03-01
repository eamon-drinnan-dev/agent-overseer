import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { epics } from './epics';

export const tickets = sqliteTable('tickets', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  bodyMd: text('body_md').notNull().default(''),
  category: text('category', {
    enum: ['feature', 'tech_debt', 'papercut_and_polish', 'bug', 'infrastructure', 'documentation'],
  }).notNull(),
  status: text('status', {
    enum: ['todo', 'in_progress', 'in_review', 'validation', 'complete', 'failed'],
  }).notNull().default('todo'),
  criticalityOverride: text('criticality_override', {
    enum: ['critical', 'standard', 'minor'],
  }),
  epicId: text('epic_id').notNull().references(() => epics.id),
  assignedAgentId: text('assigned_agent_id'),
  acceptanceCriteria: text('acceptance_criteria', { mode: 'json' })
    .$type<Array<{ id: string; description: string; met: boolean }>>()
    .notNull()
    .default([]),
  estimatedTokens: integer('estimated_tokens'),
  filePath: text('file_path'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export const ticketArtifacts = sqliteTable('ticket_artifacts', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull().references(() => tickets.id),
  type: text('type', {
    enum: ['plan', 'execution_summary', 'review', 'validation'],
  }).notNull(),
  contentMd: text('content_md').notNull(),
  agentSessionId: text('agent_session_id'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
