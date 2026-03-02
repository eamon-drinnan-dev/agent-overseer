import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useDispatchStatus, useAbortDispatch } from '@/hooks/use-dispatch';
import { Loader2, CheckCircle2, XCircle, Clock, Square } from 'lucide-react';

interface DispatchProgressProps {
  epicId: string;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  running: <Loader2 className="h-3 w-3 animate-spin text-blue-500" />,
  complete: <CheckCircle2 className="h-3 w-3 text-green-500" />,
  failed: <XCircle className="h-3 w-3 text-destructive" />,
  pending: <Clock className="h-3 w-3 text-muted-foreground" />,
};

export function DispatchProgress({ epicId }: DispatchProgressProps) {
  const { data: status, isError } = useDispatchStatus(epicId);
  const abortDispatch = useAbortDispatch(epicId);

  if (isError || !status) return null;

  const completedCount = status.ticketStatuses.filter((t) => t.status === 'complete').length;
  const totalCount = status.ticketStatuses.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Dispatch Progress
          <Badge variant="secondary" className="ml-2">
            {status.status}
          </Badge>
        </h3>
        {(status.status === 'running' || status.status === 'paused') && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => abortDispatch.mutate()}
            disabled={abortDispatch.isPending}
          >
            <Square className="mr-1 h-3 w-3" />
            Abort
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-secondary">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <p className="text-right text-xs text-muted-foreground">
        Group {status.currentGroup} of {status.totalGroups} — {completedCount}/{totalCount} tickets
      </p>

      {/* Ticket list grouped */}
      {Array.from(new Set(status.ticketStatuses.map((t) => t.groupIndex)))
        .sort((a, b) => a - b)
        .map((groupIdx) => {
          const groupTickets = status.ticketStatuses.filter((t) => t.groupIndex === groupIdx);
          return (
            <div key={groupIdx} className="rounded-md border border-border p-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Group {groupIdx}</p>
              <div className="space-y-1">
                {groupTickets.map((t) => (
                  <div key={t.ticketId} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {STATUS_ICON[t.status] ?? STATUS_ICON.pending}
                      <Link to={`/tickets/${t.ticketId}`} className="hover:underline">
                        {t.title}
                      </Link>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {t.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

      {/* Failed tickets */}
      {status.failedTickets.length > 0 && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">
            Failed Tickets ({status.failedTickets.length})
          </p>
          <ul className="mt-1 space-y-0.5">
            {status.failedTickets.map((id, i) => (
              <li key={i} className="text-xs text-muted-foreground">{id}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
