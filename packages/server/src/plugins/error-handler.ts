import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { ZodError } from 'zod';

export const errorHandlerPlugin = fp(async (app: FastifyInstance) => {
  app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: 'Validation Error',
        details: error.errors,
      });
    }

    app.log.error(error);
    return reply.status(error.statusCode ?? 500).send({
      error: error.message ?? 'Internal Server Error',
    });
  });
});
