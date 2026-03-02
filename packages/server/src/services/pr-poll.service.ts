import { eq, and, isNotNull } from 'drizzle-orm';
import type { AppDatabase } from '../db/index.js';
import { agentSessions } from '../db/schema/index.js';
import { tickets } from '../db/schema/index.js';
import { epics } from '../db/schema/index.js';
import { createGitService } from './git.service.js';
import { createTicketService } from './ticket.service.js';
import type { Criticality } from '@sentinel/shared';

export interface PrPollServiceOptions {
  intervalMs?: number; // default 60_000, 0 to disable
  baseUrl?: string;    // server base URL for self-calls (default http://localhost:3001)
}

/**
 * Background service that polls GitHub for PR merge status.
 * When a PR is merged, auto-transitions the ticket from in_review → validation.
 * Uses internal HTTP calls to /api/agent-sessions/validate to start validation
 * sessions, avoiding circular dependencies with the executor service.
 */
export function createPrPollService(
  db: AppDatabase,
  options: PrPollServiceOptions = {},
) {
  const intervalMs = options.intervalMs ?? 60_000;
  const baseUrl = options.baseUrl ?? 'http://localhost:3001';
  const gitService = createGitService();
  const ticketService = createTicketService(db);
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
      try {
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

        // PR is merged — determine criticality and trigger validation
        const epicRows = await db.select().from(epics).where(eq(epics.id, ticket.epicId));
        const epic = epicRows[0];
        const criticality = (ticket.criticalityOverride ?? epic?.criticality ?? 'standard') as Criticality;

        if (criticality === 'minor') {
          // Minor: skip validation, auto-complete directly
          // Check for execution_summary (best-effort, complete anyway if missing)
          await ticketService.updateStatus(ticket.id, 'validation');
          await ticketService.updateStatus(ticket.id, 'complete');
          console.log(`[PR Poll] Ticket ${ticket.id}: PR merged, minor ticket auto-completed`);
        } else {
          // Standard/Critical: trigger validation via internal HTTP call
          // This reuses all guards, session creation, and executor startup
          const resp = await fetch(`${baseUrl}/api/agent-sessions/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticketId: ticket.id }),
          });

          if (resp.ok) {
            console.log(`[PR Poll] Ticket ${ticket.id}: PR merged, validation agent deployed`);
          } else {
            const err = await resp.text();
            console.error(`[PR Poll] Ticket ${ticket.id}: validation deploy failed: ${err}`);
          }
        }
      } catch (err) {
        console.error(`[PR Poll] Error processing ticket ${ticket.id}:`, err);
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
