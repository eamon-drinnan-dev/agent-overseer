import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { dbPlugin } from './plugins/db.js';
import { errorHandlerPlugin } from './plugins/error-handler.js';
import { registerRoutes } from './routes/index.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: 'http://localhost:5173' });
  await app.register(websocket);
  await app.register(dbPlugin);
  await app.register(errorHandlerPlugin);
  await registerRoutes(app);

  app.get('/api/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  return app;
}
