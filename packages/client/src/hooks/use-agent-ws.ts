import { useState, useEffect, useRef, useCallback } from 'react';
import type { WsServerMessage, AgentSessionStatus, AgentPhase } from '@sentinel/shared';

interface OutputEntry {
  id: string;
  timestamp: string;
  type: 'text' | 'tool_use' | 'tool_result' | 'status' | 'error' | 'artifact';
  content: string;
  phase?: string;
  toolName?: string;
}

interface AgentWsState {
  connected: boolean;
  outputLog: OutputEntry[];
  status: AgentSessionStatus | null;
  phase: AgentPhase | null;
  inputTokens: number;
  outputTokens: number;
  costUsd: string | null;
  artifacts: Array<{ type: string; content: string }>;
}

export function useAgentWs(sessionId: string | null) {
  const [state, setState] = useState<AgentWsState>({
    connected: false,
    outputLog: [],
    status: null,
    phase: null,
    inputTokens: 0,
    outputTokens: 0,
    costUsd: null,
    artifacts: [],
  });

  const wsRef = useRef<WebSocket | null>(null);
  const entryIdRef = useRef(0);

  const addEntry = useCallback((entry: Omit<OutputEntry, 'id' | 'timestamp'>) => {
    setState((prev) => ({
      ...prev,
      outputLog: [...prev.outputLog, {
        ...entry,
        id: String(++entryIdRef.current),
        timestamp: new Date().toISOString(),
      }],
    }));
  }, []);

  useEffect(() => {
    if (!sessionId) return;

    // Reset state on session change
    setState({
      connected: false,
      outputLog: [],
      status: null,
      phase: null,
      inputTokens: 0,
      outputTokens: 0,
      costUsd: null,
      artifacts: [],
    });
    entryIdRef.current = 0;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/agent-output`);
    wsRef.current = ws;

    ws.onopen = () => {
      setState((prev) => ({ ...prev, connected: true }));
      ws.send(JSON.stringify({ type: 'subscribe', sessionId }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsServerMessage;

        switch (msg.type) {
          case 'connected':
            break;

          case 'output_chunk':
            addEntry({ type: 'text', content: msg.content, phase: msg.phase });
            break;

          case 'tool_use':
            addEntry({ type: 'tool_use', content: JSON.stringify(msg.input), toolName: msg.toolName });
            break;

          case 'tool_result':
            addEntry({ type: 'tool_result', content: msg.content ?? '', toolName: msg.toolName });
            break;

          case 'status_change':
            setState((prev) => ({
              ...prev,
              status: msg.status as AgentSessionStatus,
              phase: (msg.phase as AgentPhase) ?? null,
            }));
            addEntry({ type: 'status', content: `Status: ${msg.status}${msg.phase ? ` (${msg.phase})` : ''}` });
            break;

          case 'artifact_captured':
            setState((prev) => ({
              ...prev,
              artifacts: [...prev.artifacts, { type: msg.artifactType, content: msg.content }],
            }));
            addEntry({ type: 'artifact', content: `Artifact captured: ${msg.artifactType}` });
            break;

          case 'token_update':
            setState((prev) => ({
              ...prev,
              inputTokens: msg.inputTokens,
              outputTokens: msg.outputTokens,
              costUsd: msg.costUsd ?? prev.costUsd,
            }));
            break;

          case 'error':
            addEntry({ type: 'error', content: msg.message });
            break;

          case 'session_complete':
            addEntry({ type: 'status', content: `Session complete (${msg.artifactCount ?? 0} artifacts)` });
            break;
        }
      } catch {
        // Ignore parse errors
      }
    };

    ws.onclose = () => {
      setState((prev) => ({ ...prev, connected: false }));
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribe', sessionId }));
      }
      ws.close();
      wsRef.current = null;
    };
  }, [sessionId, addEntry]);

  return state;
}
