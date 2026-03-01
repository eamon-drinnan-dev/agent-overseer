import type { FastifyInstance } from 'fastify';
import { createContextBundleService } from '../services/context-bundle.service.js';

export async function contextRoutes(app: FastifyInstance) {
  const bundleService = createContextBundleService(app.db);

  app.get<{ Params: { projectId: string; ticketId: string } }>(
    '/api/projects/:projectId/tickets/:ticketId/context-bundle',
    async (request) => {
      return bundleService.generateBundle(
        request.params.projectId,
        request.params.ticketId,
      );
    },
  );

  app.post<{ Params: { projectId: string; ticketId: string } }>(
    '/api/projects/:projectId/tickets/:ticketId/estimate-tokens',
    async (request) => {
      const totalTokens = await bundleService.estimateAndSaveTokens(
        request.params.projectId,
        request.params.ticketId,
      );
      return { totalTokens };
    },
  );
}
