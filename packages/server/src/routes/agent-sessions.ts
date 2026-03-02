import type { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { createAgentSessionService } from '../services/agent-session.service.js';
import { createAgentExecutorService } from '../services/agent-executor.service.js';
import { tickets, epics, ticketArtifacts } from '../db/schema/index.js';
import { createTicketService } from '../services/ticket.service.js';
import {
  deployAgentSchema,
  approveRejectPlanSchema,
  getDefaultModelForCriticality,
  type Criticality,
} from '@sentinel/shared';
import { config } from '../config.js';

export async function agentSessionRoutes(app: FastifyInstance) {
  const sessionService = createAgentSessionService(app.db);
  const executorService = createAgentExecutorService(app.db, app.wsManager);

  // GET /api/agent-sessions — list sessions (optional filters: ticketId, status)
  app.get<{ Querystring: { ticketId?: string; status?: string } }>(
    '/api/agent-sessions',
    async (request) => {
      return sessionService.list(request.query);
    },
  );

  // GET /api/agent-sessions/:id — get session detail
  app.get<{ Params: { id: string } }>(
    '/api/agent-sessions/:id',
    async (request, reply) => {
      const session = await sessionService.getById(request.params.id);
      if (!session) return reply.status(404).send({ error: 'Session not found' });
      return session;
    },
  );

  // POST /api/agent-sessions/deploy — deploy agent (returns 202, fires async)
  app.post(
    '/api/agent-sessions/deploy',
    async (request, reply) => {
      const input = deployAgentSchema.parse(request.body);

      // Check if ticket already has active session
      const existing = await sessionService.getActiveForTicket(input.ticketId);
      if (existing) {
        return reply.status(409).send({ error: 'Ticket already has an active agent session', sessionId: existing.id });
      }

      // Resolve criticality-based default model if client sent the schema default
      if (!('model' in (request.body as Record<string, unknown>))) {
        const ticketRows = await app.db.select().from(tickets).where(eq(tickets.id, input.ticketId));
        const ticket = ticketRows[0];
        if (ticket) {
          const epicRows = await app.db.select().from(epics).where(eq(epics.id, ticket.epicId));
          const epic = epicRows[0];
          const criticality = (ticket.criticalityOverride ?? epic?.criticality ?? 'standard') as Criticality;
          input.model = getDefaultModelForCriticality(criticality);
        }
      }

      // Create session
      const session = await sessionService.create(input);
      if (!session) return reply.status(500).send({ error: 'Failed to create session' });

      // Fire async execution
      executorService.startSession(session.id).catch((err) => {
        app.log.error({ err, sessionId: session.id }, 'Agent execution failed');
      });

      return reply.status(202).send(session);
    },
  );

  // POST /api/agent-sessions/validate — deploy validation agent for a ticket
  app.post(
    '/api/agent-sessions/validate',
    async (request, reply) => {
      const body = request.body as Record<string, unknown>;
      const input = deployAgentSchema.parse({ ...body, agentType: 'validation' });

      // Verify ticket exists and is in the right status
      const ticketRows = await app.db.select().from(tickets).where(eq(tickets.id, input.ticketId));
      const ticket = ticketRows[0];
      if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });

      if (ticket.status !== 'in_review' && ticket.status !== 'validation') {
        return reply.status(400).send({
          error: `Ticket must be in 'in_review' or 'validation' status, currently: ${ticket.status}`,
        });
      }

      // Gate: execution_summary artifact must exist
      const artifactRows = await app.db.select().from(ticketArtifacts).where(eq(ticketArtifacts.ticketId, input.ticketId));
      if (!artifactRows.some(a => a.type === 'execution_summary')) {
        return reply.status(400).send({ error: 'execution_summary artifact required before validation' });
      }

      // Check for existing active session
      const existing = await sessionService.getActiveForTicket(input.ticketId);
      if (existing) {
        return reply.status(409).send({ error: 'Ticket already has an active agent session', sessionId: existing.id });
      }

      // Resolve model from criticality if not specified
      if (!('model' in body)) {
        const epicRows = await app.db.select().from(epics).where(eq(epics.id, ticket.epicId));
        const epic = epicRows[0];
        const criticality = (ticket.criticalityOverride ?? epic?.criticality ?? 'standard') as Criticality;
        input.model = getDefaultModelForCriticality(criticality);
      }

      // Auto-transition ticket to 'validation' if still in 'in_review'
      if (ticket.status === 'in_review') {
        const ticketSvc = createTicketService(app.db);
        await ticketSvc.updateStatus(input.ticketId, 'validation');
      }

      // Create session
      const session = await sessionService.create(input);
      if (!session) return reply.status(500).send({ error: 'Failed to create session' });

      // Fire async validation
      executorService.startValidationSession(session.id).catch((err) => {
        app.log.error({ err, sessionId: session.id }, 'Validation session failed');
      });

      return reply.status(202).send(session);
    },
  );

  // POST /api/agent-sessions/:id/action — approve/reject plan
  app.post<{ Params: { id: string } }>(
    '/api/agent-sessions/:id/action',
    async (request, reply) => {
      const { action, reason } = approveRejectPlanSchema.parse(request.body);
      const session = await sessionService.getById(request.params.id);

      if (!session) return reply.status(404).send({ error: 'Session not found' });
      if (session.status !== 'awaiting_review') {
        return reply.status(400).send({ error: `Session is ${session.status}, not awaiting_review` });
      }

      if (action === 'approve') {
        // Resume execution
        executorService.resumeAfterApproval(session.id).catch((err) => {
          app.log.error({ err, sessionId: session.id }, 'Agent resume failed');
        });
        return reply.status(202).send({ message: 'Plan approved, execution resuming' });
      } else {
        // Reject — fail the session
        await executorService.abortSession(session.id);
        await sessionService.update(session.id, { errorMessage: `Plan rejected${reason ? ': ' + reason : ''}` });
        return { message: 'Plan rejected', sessionId: session.id };
      }
    },
  );

  // POST /api/agent-sessions/:id/abort — abort running session
  app.post<{ Params: { id: string } }>(
    '/api/agent-sessions/:id/abort',
    async (request, reply) => {
      const session = await sessionService.getById(request.params.id);
      if (!session) return reply.status(404).send({ error: 'Session not found' });

      if (session.status === 'complete' || session.status === 'failed') {
        return reply.status(400).send({ error: `Session already ${session.status}` });
      }

      await executorService.abortSession(session.id);
      return { message: 'Session abort requested', sessionId: session.id };
    },
  );

  // GET /api/tickets/:ticketId/agent-sessions — sessions for a ticket
  app.get<{ Params: { ticketId: string } }>(
    '/api/tickets/:ticketId/agent-sessions',
    async (request) => {
      return sessionService.list({ ticketId: request.params.ticketId });
    },
  );

  // GET /api/config/agent — agent configuration status
  // SDK authenticates via Max Plan OAuth (Claude Code subprocess), not ANTHROPIC_API_KEY
  app.get('/api/config/agent', async () => {
    return {
      configured: true,
      defaultModel: config.agent.defaultModel,
      defaultMaxTurns: config.agent.defaultMaxTurns,
    };
  });
}
