import type { FastifyInstance } from 'fastify';

// Stub routes for agent sessions — full implementation in Phase 3
export async function agentSessionRoutes(app: FastifyInstance) {
  app.get('/api/agent-sessions', async () => {
    return [];
  });

  app.get<{ Params: { id: string } }>('/api/agent-sessions/:id', async (_request, reply) => {
    return reply.status(501).send({ error: 'Not implemented' });
  });

  app.post('/api/agent-sessions', async (_request, reply) => {
    return reply.status(501).send({ error: 'Not implemented' });
  });
}
