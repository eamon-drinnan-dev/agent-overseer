/** Structured dispatch plan artifact produced by the Planning Agent. */
export interface DispatchPlan {
  version: 1;
  epicId: string;
  generatedAt: string;
  summary: string;
  groups: DispatchPlanGroup[];
  dependencies: DispatchPlanDependency[];
  conflicts: DispatchPlanConflict[];
  totalTickets: number;
  excluded: Array<{ ticketId: string; reason: string }>;
}

export interface DispatchPlanGroup {
  groupIndex: number;
  label: string;
  tickets: DispatchPlanTicketBrief[];
  dependsOnGroups: number[];
}

export interface DispatchPlanTicketBrief {
  ticketId: string;
  title: string;
  repoPath: string | null;
  agentBrief: string;
  model: string | null;
  complexity: 'low' | 'medium' | 'high';
}

export interface DispatchPlanConflict {
  ticketIdA: string;
  ticketIdB: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface DispatchPlanDependency {
  ticketId: string;
  dependsOnTicketId: string;
  reason: string;
  type: 'blocks' | 'informs';
}
