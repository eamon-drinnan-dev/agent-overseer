import { sqliteTable, text, index, unique } from 'drizzle-orm/sqlite-core';
import { tickets } from './tickets';

export const ticketDependencies = sqliteTable('ticket_dependencies', {
  id: text('id').primaryKey(),
  ticketId: text('ticket_id').notNull().references(() => tickets.id),
  dependsOnTicketId: text('depends_on_ticket_id').notNull().references(() => tickets.id),
  dependencyType: text('dependency_type', {
    enum: ['blocks', 'informs', 'conflicts'],
  }).notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  unique('uq_ticket_dep_pair').on(table.ticketId, table.dependsOnTicketId),
  index('idx_ticket_deps_ticket_id').on(table.ticketId),
  index('idx_ticket_deps_depends_on').on(table.dependsOnTicketId),
]);
