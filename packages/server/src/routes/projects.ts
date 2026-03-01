import type { FastifyInstance } from 'fastify';
import { createProjectService } from '../services/project.service.js';
import { createFileSyncService } from '../services/file-sync.service.js';
import { createProjectSchema, updateProjectSchema } from '@sentinel/shared';

export async function projectRoutes(app: FastifyInstance) {
  const service = createProjectService(app.db);
  const fileSync = createFileSyncService(app.db);

  app.get('/api/projects', async () => {
    return service.list();
  });

  app.get<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const project = await service.getById(request.params.id);
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    return project;
  });

  app.post('/api/projects', async (request, reply) => {
    const input = createProjectSchema.parse(request.body);
    const project = await service.create(input);
    return reply.status(201).send(project);
  });

  app.patch<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    const input = updateProjectSchema.parse(request.body);
    const project = await service.update(request.params.id, input);
    if (!project) return reply.status(404).send({ error: 'Project not found' });
    return project;
  });

  app.delete<{ Params: { id: string } }>('/api/projects/:id', async (request, reply) => {
    await service.delete(request.params.id);
    return reply.status(204).send();
  });

  // File-first sync endpoints
  app.post<{ Params: { id: string } }>(
    '/api/projects/:id/sync/to-files',
    async (request) => {
      await fileSync.syncDbToFiles(request.params.id);
      return { status: 'ok' };
    },
  );

  app.post<{ Params: { id: string } }>(
    '/api/projects/:id/sync/from-files',
    async (request) => {
      const result = await fileSync.syncFilesToDb(request.params.id);
      return { status: 'ok', ...result };
    },
  );
}
