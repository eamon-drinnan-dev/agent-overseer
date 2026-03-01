import type { FastifyInstance } from 'fastify';
import { createSprintService } from '../services/sprint.service.js';
import { createSprintSchema, updateSprintSchema } from '@sentinel/shared';

export async function sprintRoutes(app: FastifyInstance) {
  const service = createSprintService(app.db);

  app.get<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/sprints',
    async (request) => {
      return service.listByProject(request.params.projectId);
    },
  );

  app.get<{ Params: { projectId: string; id: string } }>(
    '/api/projects/:projectId/sprints/:id',
    async (request, reply) => {
      const sprint = await service.getById(request.params.id);
      if (!sprint) return reply.status(404).send({ error: 'Sprint not found' });
      return sprint;
    },
  );

  app.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/sprints',
    async (request, reply) => {
      const input = createSprintSchema.parse({
        ...request.body as Record<string, unknown>,
        projectId: request.params.projectId,
      });
      const sprint = await service.create(input);
      return reply.status(201).send(sprint);
    },
  );

  app.patch<{ Params: { projectId: string; id: string } }>(
    '/api/projects/:projectId/sprints/:id',
    async (request, reply) => {
      const input = updateSprintSchema.parse(request.body);
      const sprint = await service.update(request.params.id, input);
      if (!sprint) return reply.status(404).send({ error: 'Sprint not found' });
      return sprint;
    },
  );

  app.delete<{ Params: { projectId: string; id: string } }>(
    '/api/projects/:projectId/sprints/:id',
    async (request, reply) => {
      await service.delete(request.params.id);
      return reply.status(204).send();
    },
  );
}
