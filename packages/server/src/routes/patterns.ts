import type { FastifyInstance } from 'fastify';

// Stub routes for pattern registry — full implementation in Phase 2
export async function patternRoutes(app: FastifyInstance) {
  app.get<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/patterns',
    async () => {
      return [];
    },
  );

  app.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/patterns',
    async (_request, reply) => {
      return reply.status(501).send({ error: 'Not implemented' });
    },
  );
}
