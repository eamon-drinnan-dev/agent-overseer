import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { dbPlugin } from './plugins/db.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { registerRoutes } from './routes/index.js';
import { WsConnectionManager } from './services/ws-manager.js';
import { createAgentSessionService } from './services/agent-session.service.js';
import { createPrPollService } from './services/pr-poll.service.js';

declare module 'fastify' {
  interface FastifyInstance {
    wsManager: WsConnectionManager;
  }
}

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: /^http:\/\/localhost:\d+$/ });
  await app.register(websocket);
  await app.register(dbPlugin);
  await app.register(errorHandlerPlugin);

  // WebSocket connection manager
  const wsManager = new WsConnectionManager();
  app.decorate('wsManager', wsManager);

  await registerRoutes(app);

  // Recover orphaned agent sessions from previous runs
  const sessionService = createAgentSessionService(app.db);
  const recovered = await sessionService.recoverOrphaned();
  if (recovered > 0) {
    app.log.info(`Recovered ${recovered} orphaned agent session(s)`);
  }

  // Start PR merge polling (checks every 60s if gh CLI is available)
  const prPoll = createPrPollService(app.db);
  prPoll.start();
  app.addHook('onClose', () => prPoll.stop());

  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}
