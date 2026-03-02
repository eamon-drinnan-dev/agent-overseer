import type { AgentType, AgentSessionStatus, AgentPhase } from '../enums.js';

export interface AgentSession {
  id: string;
  ticketId: string | null;
  epicId: string | null;
  agentType: AgentType;
  status: AgentSessionStatus;
  currentPhase: AgentPhase | null;
  model: string;
  maxTurns: number;
  startedAt: string | null;
  completedAt: string | null;
  tokenUsageInput: number | null;
  tokenUsageOutput: number | null;
  costUsd: string | null;
  errorMessage: string | null;
  outputLog: string | null;
  createdAt: string;
}
