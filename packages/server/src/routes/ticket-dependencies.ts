import type { FastifyInstance } from 'fastify';
import { createTicketDependencyService } from '../services/ticket-dependency.service.js';
import { createTicketDependencySchema } from '@sentinel/shared';

export async function ticketDependencyRoutes(app: FastifyInstance) {
  const service = createTicketDependencyService(app.db);

  app.get<{ Params: { id: string } }>(
    '/api/tickets/:id/dependencies',
    async (request) => {
      return service.listForTicket(request.params.id);
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/tickets/:id/dependencies',
    async (request, reply) => {
      const input = createTicketDependencySchema.parse(request.body);
      const dep = await service.create(
        request.params.id,
        input.dependsOnTicketId,
        input.dependencyType,
      );
      return reply.status(201).send(dep);
    },
  );

  app.delete<{ Params: { id: string; depId: string } }>(
    '/api/tickets/:id/dependencies/:depId',
    async (request, reply) => {
      await service.delete(request.params.depId);
      return reply.status(204).send();
    },
  );
}
