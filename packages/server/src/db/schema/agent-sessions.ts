import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { tickets } from './tickets';

export const agentSessions = sqliteTable('agent_sessions', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').references(() => tickets.id),
  agentType: text('agent_type', {
    enum: ['development', 'triage', 'validation', 'planning'],
  }).notNull(),
  status: text('status', {
    enum: ['planning', 'executing', 'reviewing', 'complete', 'failed', 'idle'],
  }).notNull().default('idle'),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  tokenUsageInput: integer('token_usage_input'),
  tokenUsageOutput: integer('token_usage_output'),
  outputLog: text('output_log'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
