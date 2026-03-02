import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { dbPlugin } from './plugins/db.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { registerRoutes } from './routes/index.js';
import { WsConnectionManager } from './services/ws-manager.js';

declare module 'fastify' {
  interface FastifyInstance {
    wsManager: WsConnectionManager;
  }
}

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: 'http://localhost:5173' });
  await app.register(websocket);
  await app.register(dbPlugin);
  await app.register(errorHandlerPlugin);

  // WebSocket connection manager
  const wsManager = new WsConnectionManager();
  app.decorate('wsManager', wsManager);

  await registerRoutes(app);

  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}
