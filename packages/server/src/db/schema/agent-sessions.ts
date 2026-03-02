import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { tickets } from './tickets';
import { epics } from './epics';

export const agentSessions = sqliteTable('agent_sessions', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').references(() => tickets.id),
  epicId: text('epic_id').references(() => epics.id),
  agentType: text('agent_type', {
    enum: ['development', 'triage', 'validation', 'planning'],
  }).notNull(),
  status: text('status', {
    enum: ['idle', 'planning', 'awaiting_review', 'executing', 'reviewing', 'complete', 'failed'],
  }).notNull().default('idle'),
  currentPhase: text('current_phase', {
    enum: ['plan', 'execute', 'self_review', 'submit'],
  }),
  model: text('model').notNull().default('claude-opus-4-6'),
  maxTurns: integer('max_turns').notNull().default(50),
  startedAt: text('started_at'),
  completedAt: text('completed_at'),
  tokenUsageInput: integer('token_usage_input'),
  tokenUsageOutput: integer('token_usage_output'),
  costUsd: text('cost_usd'),
  errorMessage: text('error_message'),
  outputLog: text('output_log'),
  prUrl: text('pr_url'),
  branchName: text('branch_name'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index('idx_agent_sessions_ticket_id').on(table.ticketId),
  index('idx_agent_sessions_status').on(table.status),
]);
