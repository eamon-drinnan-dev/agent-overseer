import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStartDispatch, useDispatchPlan } from '@/hooks/use-dispatch';
import { useApproveRejectPlan } from '@/hooks/use-agent-sessions';
import { Play, X, AlertTriangle, Layers } from 'lucide-react';

interface DispatchPlanReviewProps {
  epicId: string;
}

export function DispatchPlanReview({ epicId }: DispatchPlanReviewProps) {
  const { data: planResult, isLoading, isError } = useDispatchPlan(epicId);
  const startDispatch = useStartDispatch(epicId);
  const approveReject = useApproveRejectPlan();

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading dispatch plan...</p>;
  if (isError || !planResult) return null;

  const { plan, sessionId } = planResult;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-muted-foreground">Dispatch Plan</h3>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={() => approveReject.mutate({ sessionId, action: 'reject', reason: 'Rejected by user' })}
            disabled={approveReject.isPending}
          >
            <X className="mr-1 h-3 w-3" />
            Reject
          </Button>
          <Button
            size="sm"
            onClick={() => startDispatch.mutate()}
            disabled={startDispatch.isPending}
          >
            <Play className="mr-1 h-3 w-3" />
            Approve & Dispatch
          </Button>
        </div>
      </div>

      <p className="text-sm">{plan.summary}</p>

      {/* Conflict warnings */}
      {plan.conflicts.length > 0 && (
        <div className="rounded-md border border-yellow-500/30 bg-yellow-500/10 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-yellow-600">
            <AlertTriangle className="h-4 w-4" />
            Conflicts Detected ({plan.conflicts.length})
          </div>
          <ul className="mt-2 space-y-1">
            {plan.conflicts.map((c, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                <Badge variant="outline" className="mr-1 text-[10px]">{c.severity}</Badge>
                {c.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Groups */}
      {plan.groups
        .sort((a, b) => a.groupIndex - b.groupIndex)
        .map((group) => (
          <div key={group.groupIndex} className="rounded-lg border border-border p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Group {group.groupIndex}: {group.label}
              </h4>
              {group.dependsOnGroups.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  depends on: {group.dependsOnGroups.join(', ')}
                </span>
              )}
            </div>
            <div className="mt-2 space-y-1">
              {group.tickets.map((t) => (
                <div key={t.ticketId} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span>{t.title}</span>
                    <Badge variant="outline" className="text-[10px]">{t.complexity}</Badge>
                  </div>
                  {t.model && (
                    <span className="text-xs text-muted-foreground">{t.model}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

      {/* Excluded tickets */}
      {plan.excluded.length > 0 && (
        <div className="text-xs text-muted-foreground">
          <p className="font-medium">Excluded ({plan.excluded.length}):</p>
          {plan.excluded.map((e, i) => (
            <p key={i}>{e.ticketId}: {e.reason}</p>
          ))}
        </div>
      )}
    </div>
  );
}
