import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/index.js';
import { ticketArtifacts } from '../db/schema/index.js';
import { createAgentSessionService } from './agent-session.service.js';
import { createAgentExecutorService } from './agent-executor.service.js';
import { createTicketDependencyService } from './ticket-dependency.service.js';
import { createTicketService } from './ticket.service.js';
import type { WsConnectionManager } from './ws-manager.js';
import { dispatchPlanSchema, getDefaultModelForCriticality, AgentSessionStatus, type Criticality, type DispatchPlan, type DispatchPlanGroup } from '@sentinel/shared';

export interface DispatchStatus {
  epicId: string;
  planSessionId: string;
  status: 'pending' | 'running' | 'paused' | 'complete' | 'failed';
  currentGroup: number;
  totalGroups: number;
  ticketStatuses: Array<{
    ticketId: string;
    title: string;
    groupIndex: number;
    sessionId: string | null;
    status: string;
  }>;
  failedTickets: string[];
}

export function createDispatchOrchestratorService(db: AppDatabase, wsManager: WsConnectionManager) {
  const sessionService = createAgentSessionService(db);
  const executorService = createAgentExecutorService(db, wsManager);
  const depService = createTicketDependencyService(db);
  const ticketService = createTicketService(db);

  // Track active dispatches
  const activeDispatches = new Map<string, {
    plan: DispatchPlan;
    planSessionId: string;
    status: 'running' | 'paused' | 'complete' | 'failed';
    currentGroup: number;
    ticketSessions: Map<string, string>; // ticketId → sessionId
    failedTickets: string[];
    aborted: boolean;
  }>();

  /**
   * Apply a dispatch plan: create ticket_dependencies, set per-ticket repoPath.
   */
  async function applyPlanToDatabase(plan: DispatchPlan): Promise<void> {
    // Create dependencies from the plan
    for (const dep of plan.dependencies) {
      try {
        await depService.create(dep.ticketId, dep.dependsOnTicketId, dep.type);
      } catch {
        // Dependency may already exist — skip
      }
    }

    // Set per-ticket repoPath from plan
    for (const group of plan.groups) {
      for (const brief of group.tickets) {
        if (brief.repoPath) {
          await ticketService.update(brief.ticketId, { repoPath: brief.repoPath });
        }
      }
    }
  }

  /**
   * Execute a single group of tickets in parallel.
   * Returns when all tickets in the group reach a terminal state.
   */
  async function executeGroup(
    epicId: string,
    group: DispatchPlanGroup,
    epicCriticality: string,
  ): Promise<{ succeeded: string[]; failed: string[] }> {
    const dispatch = activeDispatches.get(epicId);
    if (!dispatch) throw new Error('Dispatch not found');

    const succeeded: string[] = [];
    const failed: string[] = [];

    // Deploy agents for all tickets in the group
    const deployPromises = group.tickets.map(async (brief) => {
      if (dispatch.aborted) return;

      // Look up ticket to get criticality override
      const ticket = await ticketService.getById(brief.ticketId);
      if (!ticket) {
        failed.push(brief.ticketId);
        return;
      }

      // Skip already-complete tickets
      if (ticket.status === 'complete') {
        succeeded.push(brief.ticketId);
        return;
      }

      const model = brief.model ?? getDefaultModelForCriticality(
        (ticket.criticalityOverride ?? epicCriticality ?? 'standard') as Criticality,
      );

      // Create session
      const session = await sessionService.create({
        ticketId: brief.ticketId,
        agentType: 'development',
        model,
        maxTurns: 50,
      });

      if (!session) {
        failed.push(brief.ticketId);
        return;
      }

      dispatch.ticketSessions.set(brief.ticketId, session.id);

      // Fire execution (non-blocking)
      executorService.startSession(session.id).catch(() => {
        failed.push(brief.ticketId);
      });
    });

    await Promise.all(deployPromises);

    // Poll for completion of all tickets in the group
    const pollingInterval = 5000; // 5 seconds
    const maxWait = 30 * 60 * 1000; // 30 minutes
    const start = Date.now();

    while (Date.now() - start < maxWait) {
      if (dispatch.aborted) {
        return { succeeded, failed: [...failed, ...group.tickets.filter(t => !succeeded.includes(t.ticketId) && !failed.includes(t.ticketId)).map(t => t.ticketId)] };
      }

      let allDone = true;
      for (const brief of group.tickets) {
        if (succeeded.includes(brief.ticketId) || failed.includes(brief.ticketId)) continue;

        const sessionId = dispatch.ticketSessions.get(brief.ticketId);
        if (!sessionId) {
          failed.push(brief.ticketId);
          continue;
        }

        const session = await sessionService.getById(sessionId);
        if (!session) {
          failed.push(brief.ticketId);
          continue;
        }

        if (session.status === 'complete') {
          succeeded.push(brief.ticketId);
        } else if (session.status === 'failed') {
          failed.push(brief.ticketId);
        } else {
          allDone = false;
        }
      }

      if (allDone) break;
      await new Promise((r) => setTimeout(r, pollingInterval));
    }

    return { succeeded, failed };
  }

  return {
    /**
     * Get the latest approved dispatch plan for an epic.
     */
    async getApprovedPlan(epicId: string): Promise<{ plan: DispatchPlan; sessionId: string } | null> {
      // Find the latest planning session for this epic that's in awaiting_review or complete
      const sessions = await sessionService.listByEpic(epicId);
      const planSession = sessions
        .filter((s) => s.agentType === 'planning' && (s.status === 'awaiting_review' || s.status === 'complete'))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

      if (!planSession) return null;

      // Find the dispatch_plan artifact
      const artifacts = await db
        .select()
        .from(ticketArtifacts)
        .where(eq(ticketArtifacts.agentSessionId, planSession.id));

      const planArtifact = artifacts.find((a) => a.type === 'dispatch_plan');
      if (!planArtifact) return null;

      try {
        const plan = dispatchPlanSchema.parse(JSON.parse(planArtifact.contentMd));
        return { plan, sessionId: planSession.id };
      } catch {
        return null;
      }
    },

    /**
     * Start executing an approved dispatch plan group-by-group.
     */
    async startDispatch(epicId: string, plan: DispatchPlan, planSessionId: string, epicCriticality: string): Promise<void> {
      if (activeDispatches.has(epicId)) {
        throw Object.assign(new Error('Dispatch already running for this epic'), { statusCode: 409 });
      }

      // Mark the planning session as complete
      try {
        await sessionService.updateStatus(planSessionId, AgentSessionStatus.Complete, null);
      } catch { /* already complete */ }

      // Apply plan to database (dependencies, repoPath)
      await applyPlanToDatabase(plan);

      const dispatch: {
        plan: DispatchPlan;
        planSessionId: string;
        status: 'running' | 'paused' | 'complete' | 'failed';
        currentGroup: number;
        ticketSessions: Map<string, string>;
        failedTickets: string[];
        aborted: boolean;
      } = {
        plan,
        planSessionId,
        status: 'running',
        currentGroup: 1,
        ticketSessions: new Map<string, string>(),
        failedTickets: [],
        aborted: false,
      };
      activeDispatches.set(epicId, dispatch);

      // Sort groups by index
      const sortedGroups = [...plan.groups].sort((a, b) => a.groupIndex - b.groupIndex);

      // Execute groups sequentially
      try {
        for (const group of sortedGroups) {
          if (dispatch.aborted) break;

          dispatch.currentGroup = group.groupIndex;

          const { failed } = await executeGroup(epicId, group, epicCriticality);

          if (failed.length > 0) {
            dispatch.failedTickets.push(...failed);
            dispatch.status = 'paused';
            // Pause — user must decide: skip, retry, or abort
            return;
          }
        }

        dispatch.status = 'complete';
      } catch (err) {
        dispatch.status = 'failed';
        dispatch.failedTickets.push(`Error: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        // Keep in map for status queries; clean up after a timeout
        setTimeout(() => activeDispatches.delete(epicId), 5 * 60 * 1000);
      }
    },

    /**
     * Get current dispatch status for an epic.
     */
    getDispatchStatus(epicId: string): DispatchStatus | null {
      const dispatch = activeDispatches.get(epicId);
      if (!dispatch) return null;

      const ticketStatuses = dispatch.plan.groups.flatMap((g) =>
        g.tickets.map((t) => ({
          ticketId: t.ticketId,
          title: t.title,
          groupIndex: g.groupIndex,
          sessionId: dispatch.ticketSessions.get(t.ticketId) ?? null,
          status: dispatch.failedTickets.includes(t.ticketId)
            ? 'failed'
            : g.groupIndex < dispatch.currentGroup
              ? 'complete'
              : g.groupIndex === dispatch.currentGroup
                ? 'running'
                : 'pending',
        })),
      );

      return {
        epicId,
        planSessionId: dispatch.planSessionId,
        status: dispatch.status,
        currentGroup: dispatch.currentGroup,
        totalGroups: dispatch.plan.groups.length,
        ticketStatuses,
        failedTickets: dispatch.failedTickets,
      };
    },

    /**
     * Abort an active dispatch.
     */
    async abortDispatch(epicId: string): Promise<void> {
      const dispatch = activeDispatches.get(epicId);
      if (!dispatch) return;

      dispatch.aborted = true;
      dispatch.status = 'failed';

      // Abort all active ticket sessions
      for (const [, sessionId] of dispatch.ticketSessions) {
        try {
          await executorService.abortSession(sessionId);
        } catch { /* ignore */ }
      }
    },
  };
}
