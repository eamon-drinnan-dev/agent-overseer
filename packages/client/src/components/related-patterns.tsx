import {
  useTicketPatterns,
  usePinPattern,
  useUnpinPattern,
  useAutoMatchPatterns,
} from '@/hooks/use-ticket-patterns';
import { usePatterns } from '@/hooks/use-patterns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pin, PinOff, Sparkles, Plus } from 'lucide-react';
import { useState } from 'react';

interface RelatedPatternsProps {
  ticketId: string;
  projectId: string;
}

export function RelatedPatterns({ ticketId, projectId }: RelatedPatternsProps) {
  const { data: linkedPatterns, isLoading } = useTicketPatterns(ticketId);
  const pinPattern = usePinPattern();
  const unpinPattern = useUnpinPattern();
  const autoMatch = useAutoMatchPatterns();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">Related Patterns</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={autoMatch.isPending}
            onClick={() => autoMatch.mutate({ ticketId, projectId })}
          >
            <Sparkles className="mr-1 h-3 w-3" />
            {autoMatch.isPending ? 'Matching...' : 'Auto-Match'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-3 w-3" />
            Pin Pattern
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading patterns...</p>
      ) : linkedPatterns && linkedPatterns.length > 0 ? (
        <div className="mt-2 space-y-2">
          {linkedPatterns.map((pattern) => (
            <div
              key={pattern.id}
              className="flex items-center justify-between rounded-md border border-border p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{pattern.patternName}</span>
                  <Badge variant="outline" className="text-xs">{pattern.type}</Badge>
                  {pattern.pinned && (
                    <Badge variant="default" className="text-xs">pinned</Badge>
                  )}
                  {pattern.autoMatched && !pattern.pinned && (
                    <Badge variant="secondary" className="text-xs">suggested</Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground font-mono truncate">
                  {pattern.path}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 ml-2"
                disabled={pinPattern.isPending || unpinPattern.isPending}
                onClick={() => {
                  if (pattern.pinned) {
                    unpinPattern.mutate({ ticketId, patternId: pattern.id });
                  } else {
                    pinPattern.mutate({ ticketId, patternId: pattern.id });
                  }
                }}
              >
                {pattern.pinned ? (
                  <PinOff className="h-3.5 w-3.5" />
                ) : (
                  <Pin className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          No patterns linked. Use Auto-Match or pin patterns manually.
        </p>
      )}

      <PinPatternDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        ticketId={ticketId}
        linkedPatternIds={linkedPatterns?.map((p) => p.id) ?? []}
      />
    </div>
  );
}

function PinPatternDialog({
  open,
  onOpenChange,
  ticketId,
  linkedPatternIds,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
  linkedPatternIds: string[];
}) {
  const { data: allPatterns } = usePatterns();
  const pinPattern = usePinPattern();

  const available = allPatterns?.filter((p) => !linkedPatternIds.includes(p.id)) ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Pin a Pattern</DialogTitle>
        </DialogHeader>
        {available.length > 0 ? (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {available.map((pattern) => (
              <div
                key={pattern.id}
                className="flex items-center justify-between rounded-md border border-border p-3"
              >
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium">{pattern.patternName}</span>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    {pattern.path}
                  </p>
                  <div className="mt-1 flex gap-1">
                    <Badge variant="outline" className="text-xs">{pattern.type}</Badge>
                    {pattern.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-2 shrink-0"
                  disabled={pinPattern.isPending}
                  onClick={() => {
                    pinPattern.mutate(
                      { ticketId, patternId: pattern.id },
                      { onSuccess: () => onOpenChange(false) },
                    );
                  }}
                >
                  <Pin className="mr-1 h-3 w-3" />
                  Pin
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No available patterns. Create patterns on the Patterns page first.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
