import { eq, and, isNotNull } from 'drizzle-orm';
import type { AppDatabase } from '../db/index.js';
import { agentSessions } from '../db/schema/index.js';
import { tickets } from '../db/schema/index.js';
import { createGitService } from './git.service.js';
import { createTicketService } from './ticket.service.js';
import { createAgentSessionService } from './agent-session.service.js';
import { getDefaultModelForCriticality, type Criticality } from '@sentinel/shared';
import { epics } from '../db/schema/index.js';

export interface PrPollServiceOptions {
  intervalMs?: number; // default 60_000, 0 to disable
}

/**
 * Background service that polls GitHub for PR merge status.
 * When a PR is merged, auto-transitions the ticket from in_review → validation.
 */
export function createPrPollService(
  db: AppDatabase,
  options: PrPollServiceOptions = {},
) {
  const intervalMs = options.intervalMs ?? 60_000;
  const gitService = createGitService();
  const ticketService = createTicketService(db);
  const sessionService = createAgentSessionService(db);
  let timer: ReturnType<typeof setInterval> | null = null;

  async function poll() {
    // Check if gh CLI is available
    if (!await gitService.isGhAvailable()) return;

    // Find tickets in in_review status
    const reviewTickets = await db
      .select({ id: tickets.id, epicId: tickets.epicId, criticalityOverride: tickets.criticalityOverride })
      .from(tickets)
      .where(eq(tickets.status, 'in_review'));

    for (const ticket of reviewTickets) {
      // Find the latest session with a prUrl for this ticket
      const sessions = await db
        .select({ id: agentSessions.id, prUrl: agentSessions.prUrl })
        .from(agentSessions)
        .where(
          and(
            eq(agentSessions.ticketId, ticket.id),
            isNotNull(agentSessions.prUrl),
          ),
        );

      const sessionWithPr = sessions[0];
      if (!sessionWithPr?.prUrl) continue;

      const state = await gitService.checkPrState(sessionWithPr.prUrl);
      if (state !== 'MERGED') continue;

      // PR is merged — transition ticket to validation and trigger auto-validation
      try {
        await ticketService.updateStatus(ticket.id, 'validation');

        // Determine criticality for model selection
        const epicRows = await db.select().from(epics).where(eq(epics.id, ticket.epicId));
        const epic = epicRows[0];
        const criticality = (ticket.criticalityOverride ?? epic?.criticality ?? 'standard') as Criticality;

        if (criticality === 'minor') {
          // Minor: skip validation, auto-complete
          await ticketService.updateStatus(ticket.id, 'complete');
        } else {
          // Standard/Critical: deploy validation agent
          const validationSession = await sessionService.create({
            ticketId: ticket.id,
            agentType: 'validation' as const,
            model: getDefaultModelForCriticality(criticality),
            maxTurns: 30,
          });
          if (validationSession) {
            // Validation session will be started by the executor on next tick
            // The startValidationSession is on the executor service which we don't import here
            // to avoid circular dependencies. The session will be picked up by recoverOrphaned
            // or we can trigger it via an HTTP call.
            console.log(`[PR Poll] PR merged for ticket ${ticket.id} — validation session ${validationSession.id} created`);
          }
        }

        console.log(`[PR Poll] Ticket ${ticket.id}: PR merged, transitioned to validation`);
      } catch (err) {
        console.error(`[PR Poll] Failed to transition ticket ${ticket.id}:`, err);
      }
    }
  }

  return {
    start() {
      if (intervalMs <= 0 || timer) return;
      console.log(`[PR Poll] Starting with ${intervalMs}ms interval`);
      timer = setInterval(() => {
        poll().catch(err => console.error('[PR Poll] Error:', err));
      }, intervalMs);
    },

    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
        console.log('[PR Poll] Stopped');
      }
    },

    /** Run a single poll cycle (useful for testing). */
    pollOnce: poll,
  };
}
