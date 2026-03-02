import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/index.js';
import { ticketArtifacts } from '../db/schema/index.js';
import { parseValidationResult, type TicketStatus } from '@sentinel/shared';

export interface GateCheckResult {
  allowed: boolean;
  reason?: string;
}

export function createPipelineGateService(db: AppDatabase) {
  return {
    /**
     * Check if a ticket status transition is allowed beyond basic state-machine rules.
     * Gates only apply to manual/API transitions — executor auto-transitions bypass this.
     */
    async checkGate(ticketId: string, fromStatus: TicketStatus, toStatus: TicketStatus): Promise<GateCheckResult> {
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
