import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { tickets } from './tickets';
import { patternRegistry } from './pattern-registry';

export const ticketPatterns = sqliteTable('ticket_patterns', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull().references(() => tickets.id),
  patternId: text('pattern_id').notNull().references(() => patternRegistry.id),
  pinned: integer('pinned', { mode: 'boolean' }).notNull().default(false),
  autoMatched: integer('auto_matched', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});
