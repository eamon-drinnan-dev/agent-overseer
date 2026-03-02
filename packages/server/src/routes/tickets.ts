import type { FastifyInstance } from 'fastify';
import { createTicketService } from '../services/ticket.service.js';
import { createFileSyncService } from '../services/file-sync.service.js';
import {
  createTicketSchema,
  updateTicketSchema,
  updateTicketStatusSchema,
  type TicketStatus,
} from '@sentinel/shared';
import { createPipelineGateService } from '../services/pipeline-gate.service.js';

export async function ticketRoutes(app: FastifyInstance) {
  const service = createTicketService(app.db);
  const fileSync = createFileSyncService(app.db);
  const gateService = createPipelineGateService(app.db);

  app.get<{
    Querystring: { epicId?: string; status?: string; category?: string };
  }>('/api/tickets', async (request) => {
    return service.list(request.query);
  });

  app.get<{ Params: { id: string } }>('/api/tickets/:id', async (request, reply) => {
    const ticket = await service.getById(request.params.id);
    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });
    return ticket;
  });

  app.post('/api/tickets', async (request, reply) => {
    const input = createTicketSchema.parse(request.body);
    const ticket = await service.create(input);
    if (ticket) fileSync.syncTicketToFile(ticket).catch((err) => app.log.error(err, 'File sync failed for ticket'));
    return reply.status(201).send(ticket);
  });

  app.patch<{ Params: { id: string } }>('/api/tickets/:id', async (request, reply) => {
    const input = updateTicketSchema.parse(request.body);
    const ticket = await service.update(request.params.id, input);
    if (!ticket) return reply.status(404).send({ error: 'Ticket not found' });
    fileSync.syncTicketToFile(ticket).catch((err) => app.log.error(err, 'File sync failed for ticket'));
    return ticket;
  });

  app.patch<{ Params: { id: string } }>('/api/tickets/:id/status', async (request, reply) => {
    const { status } = updateTicketStatusSchema.parse(request.body);

    // Pipeline gate enforcement for manual transitions
    const current = await service.getById(request.params.id);
    if (!current) return reply.status(404).send({ error: 'Ticket not found' });

    const gateResult = await gateService.checkGate(
      request.params.id,
      current.status as TicketStatus,
      status as TicketStatus,
    );
    if (!gateResult.allowed) {
      return reply.status(400).send({ error: gateResult.reason });
    }

    const ticket = await service.updateStatus(request.params.id, status as Parameters<typeof service.updateStatus>[1]);
    if (ticket) fileSync.syncTicketToFile(ticket).catch((err) => app.log.error(err, 'File sync failed for ticket'));
    return ticket;
  });

  app.delete<{ Params: { id: string } }>('/api/tickets/:id', async (request, reply) => {
    await service.delete(request.params.id);
    return reply.status(204).send();
  });

  app.get<{ Params: { id: string } }>('/api/tickets/:id/artifacts', async (request) => {
    return service.listArtifacts(request.params.id);
  });

  app.post<{ Params: { id: string } }>('/api/tickets/:id/artifacts', async (request, reply) => {
    const body = request.body as { type: string; contentMd: string; agentSessionId?: string };
    const artifact = await service.createArtifact(request.params.id, body);
    return reply.status(201).send(artifact);
  });
}
