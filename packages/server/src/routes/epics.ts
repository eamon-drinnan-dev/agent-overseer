import type { FastifyInstance } from 'fastify';
import { createEpicService } from '../services/epic.service.js';
import { createFileSyncService } from '../services/file-sync.service.js';
import { createEpicSchema, updateEpicSchema } from '@sentinel/shared';

export async function epicRoutes(app: FastifyInstance) {
  const service = createEpicService(app.db);
  const fileSync = createFileSyncService(app.db);

  app.get<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/epics',
    async (request) => {
      return service.listByProject(request.params.projectId);
    },
  );

  app.get<{ Params: { projectId: string; id: string } }>(
    '/api/projects/:projectId/epics/:id',
    async (request, reply) => {
      const epic = await service.getById(request.params.id);
      if (!epic) return reply.status(404).send({ error: 'Epic not found' });
      return epic;
    },
  );

  app.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/epics',
    async (request, reply) => {
      const input = createEpicSchema.parse({
        ...request.body as Record<string, unknown>,
        projectId: request.params.projectId,
      });
      const epic = await service.create(input);
      if (epic) fileSync.syncEpicToFile(epic).catch((err) => app.log.error(err, 'File sync failed for epic'));
      return reply.status(201).send(epic);
    },
  );

  app.patch<{ Params: { projectId: string; id: string } }>(
    '/api/projects/:projectId/epics/:id',
    async (request, reply) => {
      const input = updateEpicSchema.parse(request.body);
      const epic = await service.update(request.params.id, input);
      if (!epic) return reply.status(404).send({ error: 'Epic not found' });
      fileSync.syncEpicToFile(epic).catch((err) => app.log.error(err, 'File sync failed for epic'));
      return epic;
    },
  );

  app.delete<{ Params: { projectId: string; id: string } }>(
    '/api/projects/:projectId/epics/:id',
    async (request, reply) => {
      await service.delete(request.params.id);
      return reply.status(204).send();
    },
  );
}
