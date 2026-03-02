import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/index.js';
import { tickets, epics, projects } from '../db/schema/index.js';
import { createAgentSessionService } from './agent-session.service.js';
import { createPromptBuilderService } from './prompt-builder.service.js';
import { createTicketService } from './ticket.service.js';
import type { WsConnectionManager } from './ws-manager.js';
import { AgentSessionStatus, AgentPhase, type Criticality } from '@sentinel/shared';

interface ActiveSession {
  aborted: boolean;
}

export function createAgentExecutorService(db: AppDatabase, wsManager: WsConnectionManager) {
  const sessionService = createAgentSessionService(db);
  const promptBuilder = createPromptBuilderService(db);
  const ticketService = createTicketService(db);

  const activeSessions = new Map<string, ActiveSession>();

  function broadcast(sessionId: string, type: string, data: Record<string, unknown>) {
    wsManager.broadcast(sessionId, { type, sessionId, ...data } as any);
  }

  async function getProjectIdForTicket(ticketId: string): Promise<string> {
    const ticketRows = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    const ticket = ticketRows[0];
    if (!ticket) throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });

    const epicRows = await db.select().from(epics).where(eq(epics.id, ticket.epicId));
    const epic = epicRows[0];
    if (!epic) throw Object.assign(new Error('Epic not found'), { statusCode: 404 });

    return epic.projectId;
  }

  async function getRepoPath(projectId: string): Promise<string> {
    const projectRows = await db.select().from(projects).where(eq(projects.id, projectId));
    const project = projectRows[0];
    if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404 });
    return project.repoPath;
  }

  function requiresPlanReview(ticketCritOverride: string | null, epicCriticality: string, epicReviewPlans: boolean | number): boolean {
    const criticality = (ticketCritOverride ?? epicCriticality) as Criticality;
    if (criticality === 'critical') return true;
    if (criticality === 'standard') return !!epicReviewPlans;
    return false; // minor → auto-approve
  }

  function checkAndCaptureArtifacts(outputBuffer: string): Array<{ type: string; content: string }> {
    const artifacts: Array<{ type: string; content: string }> = [];
    const regex = /===ARTIFACT_START:(\w+)===\n?([\s\S]*?)===ARTIFACT_END:\1===/g;
    let match;
    while ((match = regex.exec(outputBuffer)) !== null) {
      artifacts.push({ type: match[1]!, content: match[2]!.trim() });
    }
    return artifacts;
  }

  async function runAgentQuery(
    sessionId: string,
    prompt: string,
    systemPrompt: string,
    cwd: string,
    model: string,
    maxTurns: number,
  ): Promise<string> {
    // Dynamic import for ESM compatibility
    const { query } = await import('@anthropic-ai/claude-agent-sdk');

    let outputBuffer = '';
    let inputTokens = 0;
    let outputTokens = 0;

    const session = activeSessions.get(sessionId);

    for await (const message of query({
      prompt,
      options: {
        systemPrompt,
        cwd,
        model,
        maxTurns,
        allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Glob', 'Grep'],
        permissionMode: 'bypassPermissions',
      },
    })) {
      // Check abort
      if (session?.aborted) {
        break;
      }

      if ('result' in message) {
        // Final result
        const resultText = typeof message.result === 'string' ? message.result : JSON.stringify(message.result);
        outputBuffer += resultText + '\n';
        broadcast(sessionId, 'output_chunk', { content: resultText, phase: 'result' });
      } else if ('subtype' in message) {
        if (message.subtype === 'init') {
          // Session initialized
          broadcast(sessionId, 'output_chunk', { content: '[Agent session initialized]\n', phase: 'init' });
        }
      }
    }

    // Update token counts (approximate — SDK may not expose exact counts)
    const currentSession = await sessionService.getById(sessionId);
    if (currentSession) {
      inputTokens = (currentSession.tokenUsageInput ?? 0) + Math.ceil(outputBuffer.length / 4);
      outputTokens = (currentSession.tokenUsageOutput ?? 0) + Math.ceil(outputBuffer.length / 4);
      await sessionService.update(sessionId, {
        tokenUsageInput: inputTokens,
        tokenUsageOutput: outputTokens,
        outputLog: (currentSession.outputLog ?? '') + outputBuffer,
      });
    }

    // Broadcast token update
    broadcast(sessionId, 'token_update', { inputTokens, outputTokens });

    return outputBuffer;
  }

  return {
    async startSession(sessionId: string) {
      const session = await sessionService.getById(sessionId);
      if (!session || !session.ticketId) {
        throw Object.assign(new Error('Invalid session'), { statusCode: 400 });
      }

      // Check for existing active session
      const existing = await sessionService.getActiveForTicket(session.ticketId);
      if (existing && existing.id !== sessionId) {
        throw Object.assign(new Error('Ticket already has an active agent session'), { statusCode: 409 });
      }

      const projectId = await getProjectIdForTicket(session.ticketId);
      const repoPath = await getRepoPath(projectId);

      // Register active session
      activeSessions.set(sessionId, { aborted: false });

      // Assign agent to ticket
      await ticketService.updateAgentAssignment(session.ticketId, sessionId);

      // Get ticket and epic info for review gate
      const ticketRows = await db.select().from(tickets).where(eq(tickets.id, session.ticketId));
      const ticket = ticketRows[0]!;
      const epicRows = await db.select().from(epics).where(eq(epics.id, ticket.epicId));
      const epic = epicRows[0]!;

      const needsReview = requiresPlanReview(ticket.criticalityOverride, epic.criticality, epic.reviewPlans);

      // Transition to planning
      await sessionService.updateStatus(sessionId, AgentSessionStatus.Planning, AgentPhase.Plan);
      broadcast(sessionId, 'status_change', { status: AgentSessionStatus.Planning, phase: AgentPhase.Plan });

      try {
        if (needsReview) {
          // Two-query approach: plan first, then wait for approval
          const planPrompt = await promptBuilder.buildPlanOnlyPrompt(projectId, session.ticketId);

          const planOutput = await runAgentQuery(
            sessionId,
            'Produce your implementation plan for the assigned ticket. Wrap the plan in artifact markers.',
            planPrompt,
            repoPath,
            session.model,
            Math.min(session.maxTurns, 10), // Limit turns for plan phase
          );

          if (activeSessions.get(sessionId)?.aborted) {
            await this.handleFailure(sessionId, 'Session aborted');
            return;
          }

          // Capture plan artifact
          const artifacts = checkAndCaptureArtifacts(planOutput);
          const planArtifact = artifacts.find(a => a.type === 'plan');

          if (planArtifact) {
            await ticketService.createArtifact(session.ticketId, {
              type: 'plan',
              contentMd: planArtifact.content,
              agentSessionId: sessionId,
            });
            broadcast(sessionId, 'artifact_captured', { artifactType: 'plan', content: planArtifact.content });
          }

          // Transition to awaiting_review
          await sessionService.updateStatus(sessionId, AgentSessionStatus.AwaitingReview, AgentPhase.Plan);
          broadcast(sessionId, 'status_change', { status: AgentSessionStatus.AwaitingReview, phase: AgentPhase.Plan });
          // Session pauses here — resumed via resumeAfterApproval
        } else {
          // Single-query approach: full workflow
          const fullPrompt = await promptBuilder.buildDevelopmentPrompt(projectId, session.ticketId);

          await sessionService.updateStatus(sessionId, AgentSessionStatus.Executing, AgentPhase.Execute);
          broadcast(sessionId, 'status_change', { status: AgentSessionStatus.Executing, phase: AgentPhase.Execute });

          const output = await runAgentQuery(
            sessionId,
            'Execute the full development workflow for the assigned ticket: plan, implement, self-review, and submit. Wrap each phase output in artifact markers.',
            fullPrompt,
            repoPath,
            session.model,
            session.maxTurns,
          );

          if (activeSessions.get(sessionId)?.aborted) {
            await this.handleFailure(sessionId, 'Session aborted');
            return;
          }

          await this.captureAndFinalize(sessionId, session.ticketId, output);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        await this.handleFailure(sessionId, errMsg);
      }
    },

    async resumeAfterApproval(sessionId: string) {
      const session = await sessionService.getById(sessionId);
      if (!session || session.status !== 'awaiting_review' || !session.ticketId) {
        throw Object.assign(new Error('Session not in awaiting_review state'), { statusCode: 400 });
      }

      const projectId = await getProjectIdForTicket(session.ticketId);
      const repoPath = await getRepoPath(projectId);

      // Re-register as active if needed
      if (!activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, { aborted: false });
      }

      // Get the plan artifact content
      const artifacts = await ticketService.listArtifacts(session.ticketId);
      const planArtifact = artifacts.find(a => a.type === 'plan' && a.agentSessionId === sessionId);
      const planContent = planArtifact?.contentMd ?? '';

      // Transition to executing
      await sessionService.updateStatus(sessionId, AgentSessionStatus.Executing, AgentPhase.Execute);
      broadcast(sessionId, 'status_change', { status: AgentSessionStatus.Executing, phase: AgentPhase.Execute });

      try {
        const execPrompt = await promptBuilder.buildExecutionPrompt(projectId, session.ticketId, planContent);

        const output = await runAgentQuery(
          sessionId,
          'Execute the approved plan, perform self-review, and submit. Wrap each phase output in artifact markers.',
          execPrompt,
          repoPath,
          session.model,
          session.maxTurns,
        );

        if (activeSessions.get(sessionId)?.aborted) {
          await this.handleFailure(sessionId, 'Session aborted');
          return;
        }

        await this.captureAndFinalize(sessionId, session.ticketId, output);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        await this.handleFailure(sessionId, errMsg);
      }
    },

    async captureAndFinalize(sessionId: string, ticketId: string, output: string) {
      // Capture artifacts
      const artifacts = checkAndCaptureArtifacts(output);

      for (const artifact of artifacts) {
        if (artifact.type === 'plan') continue; // Already captured
        await ticketService.createArtifact(ticketId, {
          type: artifact.type,
          contentMd: artifact.content,
          agentSessionId: sessionId,
        });
        broadcast(sessionId, 'artifact_captured', { artifactType: artifact.type, content: artifact.content });
      }

      // Transition through reviewing → complete
      await sessionService.updateStatus(sessionId, AgentSessionStatus.Reviewing, AgentPhase.SelfReview);
      broadcast(sessionId, 'status_change', { status: AgentSessionStatus.Reviewing, phase: AgentPhase.SelfReview });

      await sessionService.updateStatus(sessionId, AgentSessionStatus.Complete, null);
      broadcast(sessionId, 'status_change', { status: AgentSessionStatus.Complete, phase: null });

      // Transition ticket to in_review
      try {
        await ticketService.updateStatus(ticketId, 'in_review');
      } catch {
        // Ticket may not be in a valid state for transition — non-fatal
      }

      // Clear agent assignment
      await ticketService.updateAgentAssignment(ticketId, null);

      // Cleanup
      activeSessions.delete(sessionId);

      broadcast(sessionId, 'session_complete', {
        status: AgentSessionStatus.Complete,
        artifactCount: artifacts.length,
      });
    },

    async handleFailure(sessionId: string, errorMessage: string) {
      await sessionService.updateStatus(sessionId, AgentSessionStatus.Failed, null);
      await sessionService.update(sessionId, { errorMessage });

      const session = await sessionService.getById(sessionId);
      if (session?.ticketId) {
        await ticketService.updateAgentAssignment(session.ticketId, null);
      }

      activeSessions.delete(sessionId);

      broadcast(sessionId, 'error', { message: errorMessage });
      broadcast(sessionId, 'status_change', { status: AgentSessionStatus.Failed, phase: null });
    },

    async abortSession(sessionId: string) {
      const active = activeSessions.get(sessionId);
      if (active) {
        active.aborted = true;
      }
      // If not actively running (e.g., awaiting_review), just fail it directly
      const session = await sessionService.getById(sessionId);
      if (session && session.status !== 'complete' && session.status !== 'failed') {
        await this.handleFailure(sessionId, 'Aborted by user');
      }
    },

    isActive(sessionId: string): boolean {
      return activeSessions.has(sessionId);
    },

    getActiveSessionCount(): number {
      return activeSessions.size;
    },

    async shutdownAll() {
      for (const [sessionId] of activeSessions) {
        await this.abortSession(sessionId);
      }
    },
  };
}
