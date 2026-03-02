import { useState } from 'react';
import { useContextBundle, useEstimateTokens } from '@/hooks/use-context-bundle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextBundlePreviewProps {
  projectId: string;
  ticketId: string;
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return String(tokens);
}

function budgetColor(ratio: number): string {
  if (ratio > 0.9) return 'bg-red-500';
  if (ratio > 0.6) return 'bg-yellow-500';
  return 'bg-green-500';
}

function budgetTextColor(ratio: number): string {
  if (ratio > 0.9) return 'text-red-600';
  if (ratio > 0.6) return 'text-yellow-600';
  return 'text-green-600';
}

export function ContextBundlePreview({ projectId, ticketId }: ContextBundlePreviewProps) {
  const { data: bundle, isLoading, isError } = useContextBundle(projectId, ticketId);
  const estimateTokens = useEstimateTokens();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-6">
      <button
        type="button"
        className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        Context Bundle
      </button>

      {expanded && (
        <div className="mt-3 rounded-lg border border-border p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading context bundle...</p>
          ) : isError ? (
            <p className="text-sm text-destructive">Failed to load context bundle.</p>
          ) : bundle ? (
            <div className="space-y-4">
              {/* Budget Meter */}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Token Budget</span>
                  <span className={cn('font-mono', budgetTextColor(bundle.totalTokens / bundle.budgetLimit))}>
                    {formatTokens(bundle.totalTokens)} / {formatTokens(bundle.budgetLimit)}
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-secondary">
                  <div
                    className={cn(
                      'h-2 rounded-full transition-all',
                      budgetColor(bundle.totalTokens / bundle.budgetLimit),
                    )}
                    style={{ width: `${Math.min((bundle.totalTokens / bundle.budgetLimit) * 100, 100)}%` }}
                  />
                </div>
                {bundle.overBudget && (
                  <p className="mt-1 text-xs text-red-600 font-medium">
                    Over budget! Consider splitting this ticket into smaller tasks.
                  </p>
                )}
              </div>

              <Separator />

              {/* Token Breakdown */}
              <div>
                <h4 className="text-sm font-medium mb-2">Token Breakdown</h4>
                <div className="space-y-1">
                  {bundle.tokenBreakdown
                    .filter((t) => t.component !== 'total')
                    .map((t) => (
                      <div key={t.component} className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{t.label}</span>
                        <span className="font-mono">{formatTokens(t.tokens)}</span>
                      </div>
                    ))}
                </div>
              </div>

              <Separator />

              {/* Tier Details */}
              <div>
                <h4 className="text-sm font-medium mb-2">Tier 1 — Project Guidelines</h4>
                {bundle.tier1.claudeMdContent ? (
                  <pre className="max-h-32 overflow-y-auto rounded bg-secondary p-2 text-xs whitespace-pre-wrap">
                    {bundle.tier1.claudeMdContent.slice(0, 500)}
                    {bundle.tier1.claudeMdContent.length > 500 ? '...' : ''}
                  </pre>
                ) : (
                  <p className="text-xs text-muted-foreground">CLAUDE.md not configured for this project.</p>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Tier 2 — Ticket Context</h4>
                <pre className="max-h-32 overflow-y-auto rounded bg-secondary p-2 text-xs whitespace-pre-wrap">
                  {bundle.tier2.ticketContent.slice(0, 500)}
                  {bundle.tier2.ticketContent.length > 500 ? '...' : ''}
                </pre>
              </div>

              {bundle.tier2.epicSummary && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Tier 2 — Epic Summary</h4>
                  <pre className="max-h-24 overflow-y-auto rounded bg-secondary p-2 text-xs whitespace-pre-wrap">
                    {bundle.tier2.epicSummary}
                  </pre>
                </div>
              )}

              {bundle.tier2.relatedPatterns.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Tier 2 — Related Patterns</h4>
                  <div className="space-y-1">
                    {bundle.tier2.relatedPatterns.map((p) => (
                      <div key={p.id} className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="text-xs">{p.type}</Badge>
                        <span className="font-medium">{p.patternName}</span>
                        <span className="text-muted-foreground font-mono">{p.path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bundle.tier2.peerGroups.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Tier 2 — Peer Group Conventions</h4>
                  <div className="space-y-3">
                    {bundle.tier2.peerGroups.map((pg) => (
                      <div key={pg.id} className="rounded bg-secondary p-2">
                        <div className="flex items-center gap-2 text-xs mb-1">
                          <span className="font-medium">{pg.name}</span>
                          <span className="text-muted-foreground">({pg.memberCount} members)</span>
                        </div>
                        <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                          {pg.conventionSummary}
                        </pre>
                        {pg.exemplarPath && (
                          <p className="text-xs font-mono mt-1">Exemplar: {pg.exemplarPath}</p>
                        )}
                        {pg.memberPaths.length > 0 && (
                          <p className="text-xs font-mono mt-0.5 text-muted-foreground">
                            Members: {pg.memberPaths.join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bundle.tier2.dependencies.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Tier 2 — Related Tickets</h4>
                  <div className="space-y-1">
                    {bundle.tier2.dependencies.map((d) => (
                      <div key={d.id} className="flex items-center gap-2 text-xs">
                        <Badge variant="secondary" className="text-xs">{d.status}</Badge>
                        <span>{d.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {bundle.tier3.linkedFiles.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Tier 3 — Linked Files (On-Demand)</h4>
                  <ul className="space-y-0.5">
                    {bundle.tier3.linkedFiles.map((f) => (
                      <li key={f} className="text-xs text-muted-foreground font-mono">{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={estimateTokens.isPending}
                  onClick={() => estimateTokens.mutate({ projectId, ticketId })}
                >
                  <RefreshCw className={cn('mr-1 h-3 w-3', estimateTokens.isPending && 'animate-spin')} />
                  {estimateTokens.isPending ? 'Estimating...' : 'Refresh Estimate'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
