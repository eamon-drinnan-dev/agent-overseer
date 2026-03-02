import { Link } from 'react-router-dom';
import { AgentStatusBadge } from './agent-status-badge';
import { TokenMeter } from './token-meter';
import type { AgentSession } from '@sentinel/shared';

interface SessionHistoryProps {
  sessions: AgentSession[];
}

export function SessionHistory({ sessions }: SessionHistoryProps) {
  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No agent sessions yet.</p>;
  }

  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <Link
          key={session.id}
          to={`/agents/${session.id}`}
          className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-accent"
        >
          <div className="flex items-center gap-3">
            <AgentStatusBadge status={session.status} />
            <div className="text-sm">
              <span className="font-mono text-xs text-muted-foreground">{session.id.slice(0, 8)}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {session.model.split('-').slice(0, 2).join(' ')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <TokenMeter
              inputTokens={session.tokenUsageInput ?? 0}
              outputTokens={session.tokenUsageOutput ?? 0}
              costUsd={session.costUsd}
            />
            <span className="text-xs text-muted-foreground">
              {session.createdAt ? new Date(session.createdAt).toLocaleDateString() : ''}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
