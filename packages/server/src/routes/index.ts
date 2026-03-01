import type { FastifyInstance } from 'fastify';
import { projectRoutes } from './projects.js';
import { epicRoutes } from './epics.js';
import { ticketRoutes } from './tickets.js';
import { sprintRoutes } from './sprints.js';
import { patternRoutes } from './patterns.js';
import { agentSessionRoutes } from './agent-sessions.js';
import { agentOutputWs } from './ws/agent-output.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(projectRoutes);
  await app.register(epicRoutes);
  await app.register(ticketRoutes);
  await app.register(sprintRoutes);
  await app.register(patternRoutes);
  await app.register(agentSessionRoutes);
  await app.register(agentOutputWs);
}
