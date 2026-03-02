import type { FastifyInstance } from 'fastify';
import { projectRoutes } from './projects.js';
import { epicRoutes } from './epics.js';
import { ticketRoutes } from './tickets.js';
import { sprintRoutes } from './sprints.js';
import { patternRoutes } from './patterns.js';
import { agentSessionRoutes } from './agent-sessions.js';
import { contextRoutes } from './context.js';
import { ticketPatternRoutes } from './ticket-patterns.js';
import { ticketDependencyRoutes } from './ticket-dependencies.js';
import { peerGroupRoutes } from './peer-groups.js';
import { agentOutputWs } from './ws/agent-output.js';

export async function registerRoutes(app: FastifyInstance) {
  await app.register(projectRoutes);
  await app.register(epicRoutes);
  await app.register(ticketRoutes);
  await app.register(sprintRoutes);
  await app.register(patternRoutes);
  await app.register(peerGroupRoutes);
  await app.register(contextRoutes);
  await app.register(ticketPatternRoutes);
  await app.register(ticketDependencyRoutes);
  await app.register(agentSessionRoutes);
  await app.register(agentOutputWs);
}
