import type { FastifyInstance } from 'fastify';
import { createPeerGroupService } from '../services/peer-group.service.js';
import { createPeerGroupSchema, updatePeerGroupSchema } from '@sentinel/shared';

export async function peerGroupRoutes(app: FastifyInstance) {
  const service = createPeerGroupService(app.db);

  // List peer groups for a project
  app.get<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/peer-groups',
    async (request) => {
      return service.listByProject(request.params.projectId);
    },
  );

  // Get peer group by ID (with members)
  app.get<{ Params: { id: string } }>(
    '/api/peer-groups/:id',
    async (request, reply) => {
      const group = await service.getById(request.params.id);
      if (!group) return reply.status(404).send({ error: 'Peer group not found' });
      return group;
    },
  );

  // Create peer group
  app.post<{ Params: { projectId: string } }>(
    '/api/projects/:projectId/peer-groups',
    async (request, reply) => {
      const input = createPeerGroupSchema.parse({
        ...(request.body as Record<string, unknown>),
        projectId: request.params.projectId,
      });
      const group = await service.create(input);
      return reply.status(201).send(group);
    },
  );

  // Update peer group
  app.put<{ Params: { id: string } }>(
    '/api/peer-groups/:id',
    async (request, reply) => {
      const input = updatePeerGroupSchema.parse(request.body);
      const group = await service.update(request.params.id, input);
      if (!group) return reply.status(404).send({ error: 'Peer group not found' });
      return group;
    },
  );

  // Delete peer group
  app.delete<{ Params: { id: string } }>(
    '/api/peer-groups/:id',
    async (request, reply) => {
      await service.delete(request.params.id);
      return reply.status(204).send();
    },
  );

  // Add member to peer group
  app.post<{ Params: { id: string; patternId: string } }>(
    '/api/peer-groups/:id/members/:patternId',
    async (request, reply) => {
      await service.addMember(request.params.id, request.params.patternId);
      return reply.status(204).send();
    },
  );

  // Remove member from peer group
  app.delete<{ Params: { id: string; patternId: string } }>(
    '/api/peer-groups/:id/members/:patternId',
    async (request, reply) => {
      await service.removeMember(request.params.id, request.params.patternId);
      return reply.status(204).send();
    },
  );
}
