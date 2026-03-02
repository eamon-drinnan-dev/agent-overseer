import type { DependencyType, TicketStatus } from '../enums.js';

export interface TicketDependency {
  id: string;
  ticketId: string;
  dependsOnTicketId: string;
  dependencyType: DependencyType;
  createdAt: string;
}

/** Enriched dependency with target ticket info for display. */
export interface TicketDependencyWithInfo extends TicketDependency {
  dependsOnTitle: string;
  dependsOnStatus: TicketStatus;
}
