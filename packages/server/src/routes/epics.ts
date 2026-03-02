import type { FastifyInstance } from 'fastify';
import { createEpicService } from '../services/epic.service.js';
import { createFileSyncService } from '../services/file-sync.service.js';
import { createAgentSessionService } from '../services/agent-session.service.js';
import { createAgentExecutorService } from '../services/agent-executor.service.js';
import { createDispatchOrchestratorService } from '../services/dispatch-orchestrator.service.js';
import {
  createEpicSchema,
  updateEpicSchema,
  planSprintSchema,
  getDefaultModelForCriticality,
  type Criticality,
} from '@sentinel/shared';

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

  // --- Planning & Dispatch routes ---
  const sessionService = createAgentSessionService(app.db);
  const executorService = createAgentExecutorService(app.db, app.wsManager);
  const dispatchService = createDispatchOrchestratorService(app.db, app.wsManager);

  // POST /api/epics/:epicId/plan-sprint — trigger planning agent
  app.post<{ Params: { epicId: string } }>(
    '/api/epics/:epicId/plan-sprint',
    async (request, reply) => {
      const { epicId } = request.params;
      const epic = await service.getById(epicId);
      if (!epic) return reply.status(404).send({ error: 'Epic not found' });

      const body = request.body as Record<string, unknown> | undefined;
      const input = planSprintSchema.parse({ epicId, ...body });

      // Resolve model from epic criticality if not specified
      if (!body?.model) {
        input.model = getDefaultModelForCriticality(epic.criticality as Criticality);
      }

      // Create planning session
      const session = await sessionService.createPlanning(input);
      if (!session) return reply.status(500).send({ error: 'Failed to create planning session' });

      // Fire async execution
      executorService.startPlanningSession(session.id).catch((err) => {
        app.log.error({ err, sessionId: session.id }, 'Planning session failed');
      });

      return reply.status(202).send(session);
    },
  );

  // POST /api/epics/:epicId/dispatch — execute approved plan
  app.post<{ Params: { epicId: string } }>(
    '/api/epics/:epicId/dispatch',
    async (request, reply) => {
      const { epicId } = request.params;
      const epic = await service.getById(epicId);
      if (!epic) return reply.status(404).send({ error: 'Epic not found' });

      const approved = await dispatchService.getApprovedPlan(epicId);
      if (!approved) return reply.status(404).send({ error: 'No approved dispatch plan found' });

      // Fire async dispatch
      dispatchService.startDispatch(epicId, approved.plan, approved.sessionId, epic.criticality).catch((err) => {
        app.log.error({ err, epicId }, 'Dispatch execution failed');
      });

      return reply.status(202).send({ message: 'Dispatch started', epicId });
    },
  );

  // GET /api/epics/:epicId/dispatch-status — current dispatch state
  app.get<{ Params: { epicId: string } }>(
    '/api/epics/:epicId/dispatch-status',
    async (request, reply) => {
      const status = dispatchService.getDispatchStatus(request.params.epicId);
      if (!status) return reply.status(404).send({ error: 'No active dispatch for this epic' });
      return status;
    },
  );

  // POST /api/epics/:epicId/dispatch-abort — abort active dispatch
  app.post<{ Params: { epicId: string } }>(
    '/api/epics/:epicId/dispatch-abort',
    async (request) => {
      await dispatchService.abortDispatch(request.params.epicId);
      return { message: 'Dispatch abort requested' };
    },
  );

  // GET /api/epics/:epicId/plan — get the latest dispatch plan
  app.get<{ Params: { epicId: string } }>(
    '/api/epics/:epicId/plan',
    async (request, reply) => {
      const result = await dispatchService.getApprovedPlan(request.params.epicId);
      if (!result) return reply.status(404).send({ error: 'No dispatch plan found' });
      return result;
    },
  );
}
