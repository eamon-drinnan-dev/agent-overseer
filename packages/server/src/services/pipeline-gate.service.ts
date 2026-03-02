import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/index.js';
import { tickets, epics, ticketArtifacts } from '../db/schema/index.js';
import { createTicketDependencyService } from './ticket-dependency.service.js';
import { parseValidationResult, type TicketStatus } from '@sentinel/shared';

export interface GateCheckResult {
  allowed: boolean;
  reason?: string;
}

export function createPipelineGateService(db: AppDatabase) {
  const depService = createTicketDependencyService(db);

  return {
    /**
     * Check if a ticket status transition is allowed beyond basic state-machine rules.
     * Gates only apply to manual/API transitions — executor auto-transitions bypass this.
     */
    async checkGate(ticketId: string, fromStatus: TicketStatus, toStatus: TicketStatus): Promise<GateCheckResult> {
      // todo → in_progress: blocking dependencies must be met
      if (fromStatus === 'todo' && toStatus === 'in_progress') {
        const unmet = await depService.checkBlocking(ticketId);
        if (unmet.length > 0) {
          const names = unmet.map(d => d.dependsOnTitle).join(', ');
          return { allowed: false, reason: `Blocked by unmet dependencies: ${names}` };
        }
      }

      // in_progress → in_review: plan artifact required if review gate applies
      if (fromStatus === 'in_progress' && toStatus === 'in_review') {
        const ticketRows = await db.select().from(tickets).where(eq(tickets.id, ticketId));
        const ticket = ticketRows[0];
        if (ticket) {
          const epicRows = await db.select().from(epics).where(eq(epics.id, ticket.epicId));
          const epic = epicRows[0];
          if (epic) {
            const criticality = ticket.criticalityOverride ?? epic.criticality;
            const needsReview = criticality === 'critical' || (criticality === 'standard' && epic.reviewPlans);
            if (needsReview) {
              const arts = await db.select().from(ticketArtifacts).where(eq(ticketArtifacts.ticketId, ticketId));
              if (!arts.some(a => a.type === 'plan')) {
                return { allowed: false, reason: 'Plan artifact required — deploy agent to generate plan first' };
              }
            }
          }
        }
      }

      // in_review → validation: execution_summary must exist
      if (fromStatus === 'in_review' && toStatus === 'validation') {
        const artifacts = await db.select().from(ticketArtifacts).where(eq(ticketArtifacts.ticketId, ticketId));
        if (!artifacts.some(a => a.type === 'execution_summary')) {
          return { allowed: false, reason: 'execution_summary artifact required before moving to validation' };
        }
      }

      // validation → complete: validation artifact with PASS must exist
      if (fromStatus === 'validation' && toStatus === 'complete') {
        const artifacts = await db.select().from(ticketArtifacts).where(eq(ticketArtifacts.ticketId, ticketId));
        const validationArtifact = artifacts.find(a => a.type === 'validation');
        if (!validationArtifact) {
          return { allowed: false, reason: 'Validation artifact required — run validation agent first' };
        }
        const parsed = parseValidationResult(validationArtifact.contentMd);
        if (!parsed || parsed.result !== 'PASS') {
          return { allowed: false, reason: `Validation result is ${parsed?.result ?? 'unparseable'} — must pass to complete` };
        }
      }

      return { allowed: true };
    },
  };
}
