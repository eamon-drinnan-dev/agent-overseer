import type { AgentSessionStatus, AgentPhase } from '../enums.js';

// --- Client → Server ---

export interface WsSubscribeMessage {
  type: 'subscribe';
  sessionId: string;
}

export interface WsUnsubscribeMessage {
  type: 'unsubscribe';
  sessionId: string;
}

export type WsClientMessage = WsSubscribeMessage | WsUnsubscribeMessage;

// --- Server → Client ---

export interface WsConnectedEvent {
  type: 'connected';
  message: string;
  timestamp?: string;
}

export interface WsOutputChunkEvent {
  type: 'output_chunk';
  sessionId: string;
  content: string;
  phase?: string;
}

export interface WsToolUseEvent {
  type: 'tool_use';
  sessionId: string;
  toolName: string;
  input: string;
}

export interface WsToolResultEvent {
  type: 'tool_result';
  sessionId: string;
  toolName: string;
  content: string | null;
}

export interface WsStatusChangeEvent {
  type: 'status_change';
  sessionId: string;
  status: AgentSessionStatus;
  phase: AgentPhase | null;
}

export interface WsArtifactCapturedEvent {
  type: 'artifact_captured';
  sessionId: string;
  artifactType: string;
  content: string;
}

export interface WsTokenUpdateEvent {
  type: 'token_update';
  sessionId: string;
  inputTokens: number;
  outputTokens: number;
  costUsd?: string;
}

export interface WsErrorEvent {
  type: 'error';
  sessionId: string;
  message: string;
}

export interface WsSessionCompleteEvent {
  type: 'session_complete';
  sessionId: string;
  status: 'complete' | 'failed';
  artifactCount?: number;
}

export type WsServerMessage =
  | WsConnectedEvent
  | WsOutputChunkEvent
  | WsToolUseEvent
  | WsToolResultEvent
  | WsStatusChangeEvent
  | WsArtifactCapturedEvent
  | WsTokenUpdateEvent
  | WsErrorEvent
  | WsSessionCompleteEvent;
