import { eq, and, notInArray } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AppDatabase } from '../db/index.js';
import { agentSessions } from '../db/schema/index.js';
import {
  VALID_SESSION_TRANSITIONS,
  DEFAULT_AGENT_MODEL,
  type AgentSessionStatus,
  type AgentPhase,
  type DeployAgentInput,
  type PlanSprintInput,
} from '@sentinel/shared';

type SessionInsert = typeof agentSessions.$inferInsert;

export function createAgentSessionService(db: AppDatabase) {
  return {
    async list(filters?: { ticketId?: string; status?: string }) {
      const conditions = [];
      if (filters?.ticketId) conditions.push(eq(agentSessions.ticketId, filters.ticketId));
      if (filters?.status) conditions.push(eq(agentSessions.status, filters.status as NonNullable<SessionInsert['status']>));

      if (conditions.length > 0) {
        return db.select().from(agentSessions).where(and(...conditions));
      }
      return db.select().from(agentSessions);
    },

    async getById(id: string) {
      const results = await db.select().from(agentSessions).where(eq(agentSessions.id, id));
      return results[0] ?? null;
    },

    async create(input: DeployAgentInput) {
      const id = nanoid();
      const now = new Date().toISOString();
      const values: SessionInsert = {
        id,
        ticketId: input.ticketId,
        agentType: (input.agentType ?? 'development') as SessionInsert['agentType'],
        status: 'idle' as SessionInsert['status'],
        model: input.model ?? DEFAULT_AGENT_MODEL,
        maxTurns: input.maxTurns ?? 50,
        createdAt: now,
      };
      await db.insert(agentSessions).values(values);
      return this.getById(id);
    },

    async createPlanning(input: PlanSprintInput) {
      const id = nanoid();
      const now = new Date().toISOString();
      const values: SessionInsert = {
        id,
        ticketId: null,
        epicId: input.epicId,
        agentType: 'planning' as SessionInsert['agentType'],
        status: 'idle' as SessionInsert['status'],
        model: input.model ?? DEFAULT_AGENT_MODEL,
        maxTurns: input.maxTurns ?? 15,
        createdAt: now,
      };
      await db.insert(agentSessions).values(values);
      return this.getById(id);
    },

    async listByEpic(epicId: string) {
      return db
        .select()
        .from(agentSessions)
        .where(eq(agentSessions.epicId, epicId));
    },

    async update(id: string, patch: Partial<Pick<SessionInsert, 'tokenUsageInput' | 'tokenUsageOutput' | 'costUsd' | 'outputLog' | 'errorMessage' | 'prUrl' | 'branchName'>>) {
      await db.update(agentSessions).set(patch).where(eq(agentSessions.id, id));
      return this.getById(id);
    },

    async updateStatus(id: string, newStatus: AgentSessionStatus, phase?: AgentPhase | null) {
      const session = await this.getById(id);
      if (!session) throw Object.assign(new Error('Session not found'), { statusCode: 404 });

      const currentStatus = session.status as AgentSessionStatus;
      const allowed = VALID_SESSION_TRANSITIONS[currentStatus];
      if (!allowed?.includes(newStatus)) {
        throw Object.assign(
          new Error(`Invalid session transition from ${currentStatus} to ${newStatus}`),
          { statusCode: 400 },
        );
      }

      const set: Partial<SessionInsert> = {
        status: newStatus as SessionInsert['status'],
      };
      if (phase !== undefined) {
        set.currentPhase = (phase as SessionInsert['currentPhase']) ?? null;
      }
      if (newStatus === 'complete' || newStatus === 'failed') {
        set.completedAt = new Date().toISOString();
      }
      if (newStatus === 'planning' && !session.startedAt) {
        set.startedAt = new Date().toISOString();
      }

      await db.update(agentSessions).set(set).where(eq(agentSessions.id, id));
      return this.getById(id);
    },

    async getActiveForTicket(ticketId: string) {
      const results = await db
        .select()
        .from(agentSessions)
        .where(
          and(
            eq(agentSessions.ticketId, ticketId),
            // Active = not complete/failed
          ),
        );
      return results.filter(
        (s) => s.status !== 'complete' && s.status !== 'failed',
      )[0] ?? null;
    },

    async delete(id: string) {
      await db.delete(agentSessions).where(eq(agentSessions.id, id));
    },

    /** Mark any non-terminal sessions as failed on startup (orphan recovery). */
    async recoverOrphaned(): Promise<number> {
      const terminal = ['complete', 'failed'] as const;
      const orphaned = await db
        .select({ id: agentSessions.id })
        .from(agentSessions)
        .where(notInArray(agentSessions.status, [...terminal]));

      for (const row of orphaned) {
        await db
          .update(agentSessions)
          .set({
            status: 'failed' as SessionInsert['status'],
            errorMessage: 'Orphaned — server restarted while session was active',
            completedAt: new Date().toISOString(),
          })
          .where(eq(agentSessions.id, row.id));
      }
      return orphaned.length;
    },
  };
}
