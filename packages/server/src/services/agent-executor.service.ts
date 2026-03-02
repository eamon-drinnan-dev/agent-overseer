import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/index.js';
import { tickets, epics, projects } from '../db/schema/index.js';
import { createAgentSessionService } from './agent-session.service.js';
import { createPromptBuilderService } from './prompt-builder.service.js';
import { createTicketService } from './ticket.service.js';
import { createTicketDependencyService } from './ticket-dependency.service.js';
import { createGitService } from './git.service.js';
import type { WsConnectionManager } from './ws-manager.js';
import { AgentSessionStatus, AgentPhase, estimateCostUsd, dispatchPlanSchema, getDefaultModelForCriticality, parseValidationResult, type Criticality, type AgentModel, type WsServerMessage, type WsConnectedEvent } from '@sentinel/shared';

/** Any server message except the initial 'connected' handshake (which has no sessionId). */
type SessionMessage = Exclude<WsServerMessage, WsConnectedEvent>;

/** Distributive Omit that preserves discriminated union narrowing. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

interface ActiveSession {
  aborted: boolean;
}

export function createAgentExecutorService(db: AppDatabase, wsManager: WsConnectionManager) {
  const sessionService = createAgentSessionService(db);
  const promptBuilder = createPromptBuilderService(db);
  const ticketService = createTicketService(db);
  const depService = createTicketDependencyService(db);
  const gitService = createGitService();

  const activeSessions = new Map<string, ActiveSession>();

  function broadcast(sessionId: string, msg: DistributiveOmit<SessionMessage, 'sessionId'>) {
    wsManager.broadcast(sessionId, { ...msg, sessionId } as SessionMessage);
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
    let queryFn: typeof import('@anthropic-ai/claude-agent-sdk')['query'];
    try {
      const sdk = await import('@anthropic-ai/claude-agent-sdk');
      queryFn = sdk.query;
    } catch (err) {
      const msg = `Agent SDK unavailable: ${err instanceof Error ? err.message : String(err)}`;
      broadcast(sessionId, { type: 'error', message: msg });
      throw new Error(msg);
    }

    let outputBuffer = '';
    let inputTokens = 0;
    let outputTokens = 0;

    const session = activeSessions.get(sessionId);

    try {
      for await (const message of queryFn({
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
          broadcast(sessionId, { type: 'output_chunk', content: resultText, phase: 'result' });
        } else if ('subtype' in message) {
          if (message.subtype === 'init') {
            // Session initialized
            broadcast(sessionId, { type: 'output_chunk', content: '[Agent session initialized]\n', phase: 'init' });
          }
        }
      }
    } catch (sdkError) {
      const errMsg = sdkError instanceof Error ? sdkError.message : String(sdkError);
      broadcast(sessionId, { type: 'error', message: `SDK execution error: ${errMsg}` });
      throw new Error(`SDK execution error: ${errMsg}`);
    }

    // Update token counts (approximate — SDK may not expose exact counts)
    const currentSession = await sessionService.getById(sessionId);
    if (currentSession) {
      inputTokens = (currentSession.tokenUsageInput ?? 0) + Math.ceil(outputBuffer.length / 4);
      outputTokens = (currentSession.tokenUsageOutput ?? 0) + Math.ceil(outputBuffer.length / 4);
      const costUsd = estimateCostUsd(model as AgentModel, inputTokens, outputTokens);
      await sessionService.update(sessionId, {
        tokenUsageInput: inputTokens,
        tokenUsageOutput: outputTokens,
        costUsd,
        outputLog: (currentSession.outputLog ?? '') + outputBuffer,
      });
    }

    // Broadcast token update
    const costUsd = currentSession
      ? estimateCostUsd(model as AgentModel, inputTokens, outputTokens)
      : undefined;
    broadcast(sessionId, { type: 'token_update', inputTokens, outputTokens, costUsd });

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

      // Check blocking dependencies
      const unmetDeps = await depService.checkBlocking(session.ticketId);
      if (unmetDeps.length > 0) {
        const names = unmetDeps.map(d => d.dependsOnTitle).join(', ');
        throw Object.assign(
          new Error(`Blocked by unmet dependencies: ${names}`),
          { statusCode: 409 },
        );
      }

      const projectId = await getProjectIdForTicket(session.ticketId);
      const projectRepoPath = await getRepoPath(projectId);

      // Per-ticket repoPath overrides project default
      const ticketRows2 = await db.select().from(tickets).where(eq(tickets.id, session.ticketId));
      const repoPath = ticketRows2[0]?.repoPath ?? projectRepoPath;

      // Register active session
      activeSessions.set(sessionId, { aborted: false });

      // Assign agent to ticket
      await ticketService.updateAgentAssignment(session.ticketId, sessionId);

      // Get ticket and epic info for review gate
      const ticketRows = await db.select().from(tickets).where(eq(tickets.id, session.ticketId));
      const ticket = ticketRows[0]!;
      const epicRows = await db.select().from(epics).where(eq(epics.id, ticket.epicId));
      const epic = epicRows[0]!;

      // Git: create feature branch before execution
      let branchName: string | null = null;
      try {
        const branchInfo = await gitService.createBranch(repoPath, ticket.id, ticket.title, ticket.category);
        branchName = branchInfo.branchName;
        broadcast(sessionId, { type: 'output_chunk', content: `[Git] Branch: ${branchName}${branchInfo.created ? ' (created)' : ' (existing)'}\n`, phase: 'init' });
      } catch (gitErr) {
        // Git integration is best-effort — don't block execution
        broadcast(sessionId, { type: 'output_chunk', content: `[Git] Branch creation skipped: ${gitErr instanceof Error ? gitErr.message : String(gitErr)}\n`, phase: 'init' });
      }

      const needsReview = requiresPlanReview(ticket.criticalityOverride, epic.criticality, epic.reviewPlans);

      // Transition to planning
      await sessionService.updateStatus(sessionId, AgentSessionStatus.Planning, AgentPhase.Plan);
      broadcast(sessionId, { type: 'status_change', status: AgentSessionStatus.Planning, phase: AgentPhase.Plan });

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
            broadcast(sessionId, { type: 'artifact_captured', artifactType: 'plan', content: planArtifact.content });
          }

          // Transition to awaiting_review
          await sessionService.updateStatus(sessionId, AgentSessionStatus.AwaitingReview, AgentPhase.Plan);
          broadcast(sessionId, { type: 'status_change', status: AgentSessionStatus.AwaitingReview, phase: AgentPhase.Plan });
          // Session pauses here — resumed via resumeAfterApproval
        } else {
          // Single-query approach: full workflow
          const fullPrompt = await promptBuilder.buildDevelopmentPrompt(projectId, session.ticketId);

          await sessionService.updateStatus(sessionId, AgentSessionStatus.Executing, AgentPhase.Execute);
          broadcast(sessionId, { type: 'status_change', status: AgentSessionStatus.Executing, phase: AgentPhase.Execute });

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

          await this.captureAndFinalize(sessionId, session.ticketId, output, branchName);
        }
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        await this.handleFailure(sessionId, errMsg);
      }
    },

    /**
     * Start a planning session for an epic — produces a dispatch_plan artifact.
     * The session has agentType='planning' and epicId set, ticketId=null.
     */
    async startPlanningSession(sessionId: string) {
      const session = await sessionService.getById(sessionId);
      if (!session || !session.epicId) {
        throw Object.assign(new Error('Invalid planning session (no epicId)'), { statusCode: 400 });
      }

      // Look up projectId from epic
      const epicRows = await db.select().from(epics).where(eq(epics.id, session.epicId));
      const epic = epicRows[0];
      if (!epic) throw Object.assign(new Error('Epic not found'), { statusCode: 404 });

      const projectId = epic.projectId;
      const repoPath = await getRepoPath(projectId);

      // Register active session
      activeSessions.set(sessionId, { aborted: false });

      // Transition to planning
      await sessionService.updateStatus(sessionId, AgentSessionStatus.Planning, AgentPhase.Plan);
      broadcast(sessionId, { type: 'status_change', status: AgentSessionStatus.Planning, phase: AgentPhase.Plan });

      try {
        const planningPrompt = await promptBuilder.buildPlanningPrompt(projectId, session.epicId);

        const output = await runAgentQuery(
          sessionId,
          'Analyze the epic\'s tickets and produce a structured dispatch plan artifact. Output ONLY the dispatch_plan artifact in JSON format.',
          planningPrompt,
          repoPath,
          session.model,
          Math.min(session.maxTurns, 15),
        );

        if (activeSessions.get(sessionId)?.aborted) {
          await this.handleFailure(sessionId, 'Session aborted');
          return;
        }

        // Capture dispatch_plan artifact
        const artifacts = checkAndCaptureArtifacts(output);
        const dispatchArtifact = artifacts.find(a => a.type === 'dispatch_plan');

        if (!dispatchArtifact) {
          await this.handleFailure(sessionId, 'Planning agent did not produce a dispatch_plan artifact');
          return;
        }

        // Validate the JSON against schema
        let parsedPlan;
        try {
          parsedPlan = dispatchPlanSchema.parse(JSON.parse(dispatchArtifact.content));
        } catch (parseErr) {
          const errDetail = parseErr instanceof Error ? parseErr.message : String(parseErr);
          await this.handleFailure(sessionId, `Invalid dispatch plan: ${errDetail}`);
          return;
        }

        // Store the artifact (use a dummy ticketId from the first ticket in the plan, or store on epic)
        // Store as a ticket artifact on the first ticket, or create a special epic-level artifact
        // For now, store it associated with the epic's first ticket or use epicId on the artifact
        const firstTicketId = parsedPlan.groups[0]?.tickets[0]?.ticketId;
        if (firstTicketId) {
          await ticketService.createArtifact(firstTicketId, {
            type: 'dispatch_plan',
            contentMd: dispatchArtifact.content,
            agentSessionId: sessionId,
          });
        }

        broadcast(sessionId, { type: 'artifact_captured', artifactType: 'dispatch_plan', content: dispatchArtifact.content });

        // Transition to awaiting_review (user must approve before dispatch)
        await sessionService.updateStatus(sessionId, AgentSessionStatus.AwaitingReview, AgentPhase.Plan);
        broadcast(sessionId, { type: 'status_change', status: AgentSessionStatus.AwaitingReview, phase: AgentPhase.Plan });

        // Cleanup active tracking — session is now paused
        activeSessions.delete(sessionId);

      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        await this.handleFailure(sessionId, errMsg);
      }
    },

    async startValidationSession(sessionId: string) {
      const session = await sessionService.getById(sessionId);
      if (!session || !session.ticketId) {
        throw Object.assign(new Error('Invalid validation session (no ticketId)'), { statusCode: 400 });
      }

      const projectId = await getProjectIdForTicket(session.ticketId);
      const projectRepoPath = await getRepoPath(projectId);

      // Per-ticket repoPath overrides project default
      const ticketRows2 = await db.select().from(tickets).where(eq(tickets.id, session.ticketId));
      const repoPath = ticketRows2[0]?.repoPath ?? projectRepoPath;

      activeSessions.set(sessionId, { aborted: false });

      // Assign agent to ticket
      await ticketService.updateAgentAssignment(session.ticketId, sessionId);

      // Transition: idle → planning → executing (single-query validation flow)
      await sessionService.updateStatus(sessionId, AgentSessionStatus.Planning, AgentPhase.Plan);
      broadcast(sessionId, { type: 'status_change', status: AgentSessionStatus.Planning, phase: AgentPhase.Plan });

      try {
        const validationPrompt = await promptBuilder.buildValidationPrompt(projectId, session.ticketId);

        await sessionService.updateStatus(sessionId, AgentSessionStatus.Executing, AgentPhase.Execute);
        broadcast(sessionId, { type: 'status_change', status: AgentSessionStatus.Executing, phase: AgentPhase.Execute });

        const output = await runAgentQuery(
          sessionId,
          'Review the completed work for the assigned ticket. Run tests, check patterns, verify acceptance criteria, and produce your validation report artifact.',
          validationPrompt,
          repoPath,
          session.model,
          session.maxTurns,
        );

        if (activeSessions.get(sessionId)?.aborted) {
          await this.handleFailure(sessionId, 'Session aborted');
          return;
        }

        // Capture artifacts
        const artifacts = checkAndCaptureArtifacts(output);
        const validationArtifact = artifacts.find(a => a.type === 'validation');

        if (!validationArtifact) {
          await this.handleFailure(sessionId, 'Validation agent did not produce a validation artifact');
          return;
        }

        // Store all captured artifacts
        for (const artifact of artifacts) {
          await ticketService.createArtifact(session.ticketId, {
            type: artifact.type,
            contentMd: artifact.content,
            agentSessionId: sessionId,
          });
          broadcast(sessionId, { type: 'artifact_captured', artifactType: artifact.type, content: artifact.content });
        }

        // Parse the validation result
        const validationResult = parseValidationResult(validationArtifact.content)
          ?? { result: 'FAIL' as const, criteria: [], summary: 'Could not parse validation artifact', feedback: 'See raw validation output' };

        // Transition session: reviewing → complete
        await sessionService.updateStatus(sessionId, AgentSessionStatus.Reviewing, AgentPhase.SelfReview);
        broadcast(sessionId, { type: 'status_change', status: AgentSessionStatus.Reviewing, phase: AgentPhase.SelfReview });

        await sessionService.updateStatus(sessionId, AgentSessionStatus.Complete, null);
        broadcast(sessionId, { type: 'status_change', status: AgentSessionStatus.Complete, phase: null });

        // Auto-transition ticket based on validation result
        if (validationResult.result === 'PASS') {
          try {
            await ticketService.updateStatus(session.ticketId, 'complete');
            broadcast(sessionId, { type: 'output_chunk', content: '[Validation] PASS — ticket marked complete\n', phase: 'result' });
          } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            broadcast(sessionId, { type: 'error', message: `Could not transition ticket to complete: ${reason}` });
          }
        } else {
          try {
            await ticketService.updateStatus(session.ticketId, 'failed');
            broadcast(sessionId, { type: 'output_chunk', content: `[Validation] FAIL — ticket marked failed. Feedback: ${validationResult.feedback ?? 'See validation artifact'}\n`, phase: 'result' });
          } catch (err) {
            const reason = err instanceof Error ? err.message : String(err);
            broadcast(sessionId, { type: 'error', message: `Could not transition ticket to failed: ${reason}` });
          }
        }

        // Clear agent assignment
        await ticketService.updateAgentAssignment(session.ticketId, null);

        // Cleanup
        activeSessions.delete(sessionId);

        broadcast(sessionId, {
          type: 'session_complete',
          status: AgentSessionStatus.Complete,
          artifactCount: artifacts.length,
        });
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

      // Detect existing git branch (may have been created in startSession before pause)
      let branchName: string | null = null;
      try {
        const currentBranch = await gitService.getCurrentBranch(repoPath);
        if (currentBranch.includes('/tl-')) branchName = currentBranch;
      } catch { /* ignore */ }

      // Get the plan artifact content
      const artifacts = await ticketService.listArtifacts(session.ticketId);
      const planArtifact = artifacts.find(a => a.type === 'plan' && a.agentSessionId === sessionId);
      const planContent = planArtifact?.contentMd ?? '';

      // Transition to executing
      await sessionService.updateStatus(sessionId, AgentSessionStatus.Executing, AgentPhase.Execute);
      broadcast(sessionId, { type: 'status_change', status: AgentSessionStatus.Executing, phase: AgentPhase.Execute });

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

        await this.captureAndFinalize(sessionId, session.ticketId, output, branchName);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        await this.handleFailure(sessionId, errMsg);
      }
    },

    async captureAndFinalize(sessionId: string, ticketId: string, output: string, branchName?: string | null) {
      // Capture artifacts
      const artifacts = checkAndCaptureArtifacts(output);

      for (const artifact of artifacts) {
        if (artifact.type === 'plan') continue; // Already captured
        await ticketService.createArtifact(ticketId, {
          type: artifact.type,
          contentMd: artifact.content,
          agentSessionId: sessionId,
        });
        broadcast(sessionId, { type: 'artifact_captured', artifactType: artifact.type, content: artifact.content });
      }

      // Transition through reviewing → complete
      await sessionService.updateStatus(sessionId, AgentSessionStatus.Reviewing, AgentPhase.SelfReview);
      broadcast(sessionId, { type: 'status_change', status: AgentSessionStatus.Reviewing, phase: AgentPhase.SelfReview });

      await sessionService.updateStatus(sessionId, AgentSessionStatus.Complete, null);
      broadcast(sessionId, { type: 'status_change', status: AgentSessionStatus.Complete, phase: null });

      // Git: create PR after successful completion
      if (branchName) {
        try {
          const ticket = await ticketService.getById(ticketId);
          const epicRows = ticket ? await db.select().from(epics).where(eq(epics.id, ticket.epicId)) : [];
          const epic = epicRows[0];
          const repoPath = ticket?.repoPath ?? (epic ? await getRepoPath(epic.projectId) : '.');
          const ac = (ticket?.acceptanceCriteria ?? []) as Array<{ description: string; met: boolean }>;
          const execSummary = artifacts.find(a => a.type === 'execution_summary')?.content ?? null;

          const pr = await gitService.createPullRequest(
            repoPath,
            branchName,
            ticketId,
            ticket?.title ?? 'Agent PR',
            epic?.title ?? '',
            ac,
            execSummary,
          );
          if (pr) {
            broadcast(sessionId, { type: 'output_chunk', content: `[Git] PR created: ${pr.prUrl}\n`, phase: 'result' });
          }
        } catch (prErr) {
          broadcast(sessionId, { type: 'output_chunk', content: `[Git] PR creation skipped: ${prErr instanceof Error ? prErr.message : String(prErr)}\n`, phase: 'result' });
        }
      }

      // Transition ticket to in_review
      try {
        await ticketService.updateStatus(ticketId, 'in_review');
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        broadcast(sessionId, { type: 'error', message: `Could not transition ticket to in_review: ${reason}` });
      }

      // Clear agent assignment
      await ticketService.updateAgentAssignment(ticketId, null);

      // Cleanup
      activeSessions.delete(sessionId);

      broadcast(sessionId, { type: 'session_complete',
        status: AgentSessionStatus.Complete,
        artifactCount: artifacts.length,
      });

      // Auto-trigger validation based on criticality (best-effort)
      try {
        const ticketData = await ticketService.getById(ticketId);
        if (ticketData) {
          const epicData = await db.select().from(epics).where(eq(epics.id, ticketData.epicId));
          const epic = epicData[0];
          const criticality = (ticketData.criticalityOverride ?? epic?.criticality ?? 'standard') as Criticality;

          if (criticality === 'minor') {
            // Minor: skip validation agent, auto-complete
            // execution_summary is best-effort for minor tickets — don't stall if missing
            const arts = await ticketService.listArtifacts(ticketId);
            if (!arts.some(a => a.type === 'execution_summary')) {
              broadcast(sessionId, { type: 'output_chunk', content: '[Auto] Minor ticket: no execution_summary found, completing anyway\n', phase: 'result' });
            }
            await ticketService.updateStatus(ticketId, 'validation');
            await ticketService.updateStatus(ticketId, 'complete');
            broadcast(sessionId, { type: 'output_chunk', content: '[Auto] Minor ticket: skipped validation, marked complete\n', phase: 'result' });
          } else {
            // Standard + Critical: deploy validation agent
            const validationSession = await sessionService.create({
              ticketId,
              agentType: 'validation' as const,
              model: getDefaultModelForCriticality(criticality),
              maxTurns: 30,
            });
            if (validationSession) {
              await ticketService.updateStatus(ticketId, 'validation');
              this.startValidationSession(validationSession.id).catch(() => {
                // Failure handled inside startValidationSession
              });
              broadcast(sessionId, { type: 'output_chunk', content: `[Auto] Validation agent deployed (session: ${validationSession.id})\n`, phase: 'result' });
            }
          }
        }
      } catch (autoErr) {
        broadcast(sessionId, { type: 'output_chunk', content: `[Auto] Validation auto-trigger skipped: ${autoErr instanceof Error ? autoErr.message : String(autoErr)}\n`, phase: 'result' });
      }
    },

    async handleFailure(sessionId: string, errorMessage: string) {
      await sessionService.updateStatus(sessionId, AgentSessionStatus.Failed, null);
      await sessionService.update(sessionId, { errorMessage });

      const session = await sessionService.getById(sessionId);
      if (session?.ticketId) {
        await ticketService.updateAgentAssignment(session.ticketId, null);
      }

      activeSessions.delete(sessionId);

      broadcast(sessionId, { type: 'error', message: errorMessage });
      broadcast(sessionId, { type: 'status_change', status: AgentSessionStatus.Failed, phase: null });
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
