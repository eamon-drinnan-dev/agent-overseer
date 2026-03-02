import { useParams } from 'react-router-dom';
import { useAgentSession, useAgentSessions, useAbortSession } from '@/hooks/use-agent-sessions';
import { useAgentWs } from '@/hooks/use-agent-ws';
import { useAgentStore } from '@/stores/agent.store';
import { AgentTerminal } from '@/components/agent/agent-terminal';
import { AgentStatusBadge } from '@/components/agent/agent-status-badge';
import { TokenMeter } from '@/components/agent/token-meter';
import { PlanReviewPanel } from '@/components/agent/plan-review-panel';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function AgentTerminalPage() {
  const { sessionId: routeSessionId } = useParams<{ sessionId: string }>();
  const { activeSessionId, setActiveSessionId, autoScroll, setAutoScroll, showToolCalls, setShowToolCalls } = useAgentStore();

  // Use route param or store selection
  const selectedSessionId = routeSessionId ?? activeSessionId;

  const { data: sessions } = useAgentSessions();
  const { data: session } = useAgentSession(selectedSessionId ?? null);
  const wsState = useAgentWs(selectedSessionId ?? null);
  const abort = useAbortSession();

  const status = wsState.status ?? (session?.status as string) ?? null;
  const planArtifact = wsState.artifacts.find((a) => a.type === 'plan');

  return (
    <div className="flex h-full gap-4">
      {/* Session list sidebar */}
      <div className="w-64 shrink-0 space-y-2 overflow-y-auto border-r border-border pr-4">
        <h3 className="text-sm font-semibold text-muted-foreground">Sessions</h3>
        {sessions?.length === 0 && (
          <p className="text-xs text-muted-foreground">No sessions yet.</p>
        )}
        {sessions?.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSessionId(s.id)}
            className={`w-full rounded-md border p-2 text-left text-sm transition-colors ${
              s.id === selectedSessionId ? 'border-primary bg-primary/5' : 'border-border hover:bg-accent'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs">{s.id.slice(0, 8)}</span>
              <AgentStatusBadge status={s.status} className="text-[10px] px-1.5 py-0" />
            </div>
            <p className="mt-1 text-xs text-muted-foreground truncate">
              {s.model.split('-').slice(0, 2).join(' ')}
            </p>
          </button>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0">
        {!selectedSessionId ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-muted-foreground">Select a session or deploy an agent from a ticket.</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold">Agent Terminal</h2>
                {status && <AgentStatusBadge status={status} />}
                {wsState.connected && (
                  <span className="text-xs text-green-600">Connected</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <TokenMeter
                  inputTokens={wsState.inputTokens || (session?.tokenUsageInput ?? 0)}
                  outputTokens={wsState.outputTokens || (session?.tokenUsageOutput ?? 0)}
                  costUsd={wsState.costUsd ?? session?.costUsd}
                />
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={autoScroll}
                    onChange={(e) => setAutoScroll(e.target.checked)}
                    className="rounded"
                  />
                  Auto-scroll
                </label>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={showToolCalls}
                    onChange={(e) => setShowToolCalls(e.target.checked)}
                    className="rounded"
                  />
                  Tool calls
                </label>
                {status && status !== 'complete' && status !== 'failed' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => abort.mutate(selectedSessionId)}
                    disabled={abort.isPending}
                  >
                    Abort
                  </Button>
                )}
              </div>
            </div>

            {/* Plan review panel */}
            {status === 'awaiting_review' && planArtifact && (
              <div className="mb-3">
                <PlanReviewPanel sessionId={selectedSessionId} planContent={planArtifact.content} />
              </div>
            )}

            {/* Terminal */}
            <AgentTerminal outputLog={wsState.outputLog} className="flex-1 min-h-0" />

            {/* Session info footer */}
            {session && (
              <div className="pt-2 flex items-center gap-4 text-xs text-muted-foreground">
                <span>Session: {session.id}</span>
                {session.ticketId && (
                  <Link to={`/tickets/${session.ticketId}`} className="text-primary hover:underline">
                    View Ticket
                  </Link>
                )}
                <span>Model: {session.model}</span>
                <span>Max turns: {session.maxTurns}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
