import type { FastifyInstance } from 'fastify';
import type { WsClientMessage } from '@sentinel/shared';

export async function agentOutputWs(app: FastifyInstance) {
  app.get('/ws/agent-output', { websocket: true }, (socket) => {
    // Send connected event
    socket.send(JSON.stringify({
      type: 'connected',
      message: 'Agent output stream ready',
      timestamp: new Date().toISOString(),
    }));

    socket.on('message', (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString()) as WsClientMessage;

        switch (msg.type) {
          case 'subscribe':
            app.wsManager.subscribe(msg.sessionId, socket);
            app.log.info({ sessionId: msg.sessionId }, 'WS client subscribed');
            break;
          case 'unsubscribe':
            app.wsManager.unsubscribe(msg.sessionId, socket);
            app.log.info({ sessionId: msg.sessionId }, 'WS client unsubscribed');
            break;
          default:
            app.log.warn({ msg }, 'Unknown WS message type');
        }
      } catch (err) {
        app.log.error({ err }, 'Failed to parse WS message');
        socket.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
      }
    });

    socket.on('close', () => {
      app.wsManager.removeClient(socket);
      app.log.info('WS client disconnected');
    });
  });
}
