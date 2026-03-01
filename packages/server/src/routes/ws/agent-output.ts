import type { FastifyInstance } from 'fastify';

// Stub WebSocket handler for agent output streaming — full implementation in Phase 3
export async function agentOutputWs(app: FastifyInstance) {
  app.get('/ws/agent-output', { websocket: true }, (socket) => {
    socket.send(JSON.stringify({ type: 'connected', message: 'Agent output stream ready' }));

    socket.on('message', (message: Buffer) => {
      app.log.info(`WS message received: ${message.toString()}`);
    });

    socket.on('close', () => {
      app.log.info('WS client disconnected');
    });
  });
}
