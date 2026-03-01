import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { db, type AppDatabase } from '../db/index.js';

declare module 'fastify' {
  interface FastifyInstance {
    db: AppDatabase;
  }
}

export const dbPlugin = fp(async (app: FastifyInstance) => {
  app.decorate('db', db);
});
