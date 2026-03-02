import type { WebSocket } from 'ws';
import type { WsServerMessage } from '@sentinel/shared';

export class WsConnectionManager {
  private subscriptions = new Map<string, Set<WebSocket>>();
  private clientSessions = new Map<WebSocket, Set<string>>();

  subscribe(sessionId: string, client: WebSocket) {
    if (!this.subscriptions.has(sessionId)) {
      this.subscriptions.set(sessionId, new Set());
    }
    this.subscriptions.get(sessionId)!.add(client);

    if (!this.clientSessions.has(client)) {
      this.clientSessions.set(client, new Set());
    }
    this.clientSessions.get(client)!.add(sessionId);
  }

  unsubscribe(sessionId: string, client: WebSocket) {
    this.subscriptions.get(sessionId)?.delete(client);
    if (this.subscriptions.get(sessionId)?.size === 0) {
      this.subscriptions.delete(sessionId);
    }
    this.clientSessions.get(client)?.delete(sessionId);
  }

  removeClient(client: WebSocket) {
    const sessions = this.clientSessions.get(client);
    if (sessions) {
      for (const sessionId of sessions) {
        this.subscriptions.get(sessionId)?.delete(client);
        if (this.subscriptions.get(sessionId)?.size === 0) {
          this.subscriptions.delete(sessionId);
        }
      }
    }
    this.clientSessions.delete(client);
  }

  broadcast(sessionId: string, message: WsServerMessage) {
    const clients = this.subscriptions.get(sessionId);
    if (!clients) return;

    const payload = JSON.stringify(message);
    for (const client of clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }
  }

  getSubscriberCount(sessionId: string): number {
    return this.subscriptions.get(sessionId)?.size ?? 0;
  }
}
