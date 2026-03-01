import type { FastifyInstance } from 'fastify';
import { createPatternService } from '../services/pattern.service.js';
import { createPatternSchema, updatePatternSchema } from '@sentinel/shared';

export async function patternRoutes(app: FastifyInstance) {
  const service = createPatternService(app.db);

  app.get<{ Params: { projectId: string }; Querystring: { type?: string; tags?: string } }>(
    '/api/projects/:projectId/patterns',
    async (request) => {
      const { type, tags } = request.query;
      if (tags) {
        const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);
        const results = await service.searchByTags(request.params.projectId, tagList);
        if (type) return results.filter((p) => p.type === type);
        return results;
      }
      const results = await service.listByProject(request.params.projectId);
      if (type) return results.filter((p) => p.type === type);
      return results;
    },
  );

  app.get<{ Params: { projectId: string; id: string } }>(
    '/api/projects/:projectId/patterns/:id',
    async (request, reply) => {
      const pattern = await service.getById(request.params.id);
      if (!pattern) return reply.status(404).send({ error: 'Pattern not found' });
      return pattern;
    },
  );

  app.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/patterns',
    async (request, reply) => {
      const input = createPatternSchema.parse({
        ...(request.body as Record<string, unknown>),
        projectId: request.params.projectId,
      });
      const pattern = await service.create(input);
      return reply.status(201).send(pattern);
    },
  );

  app.patch<{ Params: { projectId: string; id: string } }>(
    '/api/projects/:projectId/patterns/:id',
    async (request, reply) => {
      const input = updatePatternSchema.parse(request.body);
      const pattern = await service.update(request.params.id, input);
      if (!pattern) return reply.status(404).send({ error: 'Pattern not found' });
      return pattern;
    },
  );

  app.delete<{ Params: { projectId: string; id: string } }>(
    '/api/projects/:projectId/patterns/:id',
    async (request, reply) => {
      await service.delete(request.params.id);
      return reply.status(204).send();
    },
  );
}
