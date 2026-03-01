import type { AgentType, AgentSessionStatus } from '../enums.js';

export interface AgentSession {
  id: string;
  ticketId: string | null;
  agentType: AgentType;
  status: AgentSessionStatus;
  startedAt: string | null;
  completedAt: string | null;
  tokenUsageInput: number | null;
  tokenUsageOutput: number | null;
  outputLog: string | null;
  createdAt: string;
}
