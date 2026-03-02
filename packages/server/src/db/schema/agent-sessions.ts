import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { tickets } from './tickets';

export const agentSessions = sqliteTable('agent_sessions', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').references(() => tickets.id),
  agentType: text('agent_type', {
    enum: ['development', 'triage', 'validation', 'planning'],
  }).notNull(),
  status: text('status', {
    enum: ['idle', 'planning', 'awaiting_review', 'executing', 'reviewing', 'complete', 'failed'],
  }).notNull().default('idle'),
  currentPhase: text('current_phase', {
    enum: ['plan', 'execute', 'self_review', 'submit'],
  }),
  model: text('model').notNull().default('claude-sonnet-4-5-20250929'),
  maxTurns: integer('max_turns').notNull().default(50),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  tokenUsageInput: integer('token_usage_input'),
  tokenUsageOutput: integer('token_usage_output'),
  costUsd: text('cost_usd'),
  errorMessage: text('error_message'),
  outputLog: text('output_log'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
