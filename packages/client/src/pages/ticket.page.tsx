import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  useTicket,
  useTicketArtifacts,
  useUpdateTicket,
  useUpdateTicketStatus,
  useDeleteTicket,
} from '@/hooks/use-tickets';
import { useEpics } from '@/hooks/use-epics';
import { TicketFormDialog } from '@/components/ticket-form';
import { RelatedPatterns } from '@/components/related-patterns';
import { ContextBundlePreview } from '@/components/context-bundle-preview';
import { DeployAgentDialog } from '@/components/agent/deploy-agent-dialog';
import { SessionHistory } from '@/components/agent/session-history';
import { AgentStatusBadge } from '@/components/agent/agent-status-badge';
import { TicketDependencies } from '@/components/ticket-dependencies';
import { GitInfo } from '@/components/git-info';
import { ValidationResultPanel } from '@/components/agent/validation-result-panel';
import { useTicketAgentSessions, useDeployValidation } from '@/hooks/use-agent-sessions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { VALID_TRANSITIONS, parseValidationResult } from '@sentinel/shared';
import type { TicketStatus, Criticality } from '@sentinel/shared';
import { Pencil, Trash2, ArrowLeft, ArrowRight } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  todo: 'To Do',
  in_progress: 'In Progress',
  in_review: 'In Review',
  validation: 'Validation',
  complete: 'Complete',
  failed: 'Failed',
};

export function TicketPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: ticket, isLoading, isError } = useTicket(id ?? '');
  const { data: epics } = useEpics();
  const { data: agentSessions } = useTicketAgentSessions(id ?? '');
  const { data: artifacts } = useTicketArtifacts(id);
  const updateTicket = useUpdateTicket();
  const deployValidation = useDeployValidation();
  const updateStatus = useUpdateTicketStatus();
  const deleteTicket = useDeleteTicket();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const activeAgentSession = agentSessions?.find(
    (s) => s.status !== 'complete' && s.status !== 'failed',
  );

  if (isLoading) return <p className="text-muted-foreground">Loading ticket...</p>;
  if (isError) return <p className="text-destructive">Failed to load ticket. Please try again.</p>;
  if (!ticket) return <p className="text-muted-foreground">Ticket not found.</p>;

  const validTransitions = VALID_TRANSITIONS[ticket.status as TicketStatus] ?? [];
  const epic = epics?.find((e) => e.id === ticket.epicId);
  const effectiveCriticality = (ticket.criticalityOverride ?? epic?.criticality ?? 'standard') as Criticality;

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Board
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{ticket.title}</h2>
          <div className="mt-2 flex gap-2">
            <Badge variant="secondary">{STATUS_LABELS[ticket.status] ?? ticket.status}</Badge>
            <Badge variant="outline">{ticket.category.replace(/_/g, ' ')}</Badge>
            {ticket.criticalityOverride && (
              <Badge variant="destructive">{ticket.criticalityOverride}</Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!activeAgentSession && (
            <DeployAgentDialog ticketId={ticket.id} ticketTitle={ticket.title} criticality={effectiveCriticality} />
          )}
          {!activeAgentSession && ticket.status === 'in_review' && (
            <>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => deployValidation.mutate({ ticketId: ticket.id })}
                disabled={deployValidation.isPending}
              >
                {deployValidation.isPending ? 'Deploying...' : 'Run Validation'}
              </Button>
              {agentSessions?.some(s => s.prUrl) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus.mutate({ id: ticket.id, status: 'validation' })}
                  disabled={updateStatus.isPending || !artifacts?.some(a => a.type === 'execution_summary')}
                  title={!artifacts?.some(a => a.type === 'execution_summary') ? 'Execution summary required' : 'Mark PR as merged and trigger validation'}
                >
                  PR Merged
                </Button>
              )}
            </>
          )}
          {activeAgentSession && (
            <AgentStatusBadge status={activeAgentSession.status} />
          )}
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {validTransitions.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Move to:</span>
          {validTransitions.map((nextStatus) => {
            // Gate hint: validation → complete requires passing validation artifact
            let gateBlocked = false;
            let gateTooltip: string | undefined;
            if (ticket.status === 'validation' && nextStatus === 'complete') {
              const valArtifact = artifacts?.find(a => a.type === 'validation');
              const parsed = valArtifact ? parseValidationResult(valArtifact.contentMd) : null;
              gateBlocked = !parsed || parsed.result !== 'PASS';
              if (gateBlocked) gateTooltip = 'Validation must pass first';
            }
            // Gate hint: in_review → validation requires execution_summary
            if (ticket.status === 'in_review' && nextStatus === 'validation') {
              if (!artifacts?.some(a => a.type === 'execution_summary')) {
                gateBlocked = true;
                gateTooltip = 'Execution summary required';
              }
            }

            return (
              <Button
                key={nextStatus}
                variant="outline"
                size="sm"
                disabled={updateStatus.isPending || gateBlocked}
                onClick={() => updateStatus.mutate({ id: ticket.id, status: nextStatus })}
                title={gateTooltip}
              >
                {STATUS_LABELS[nextStatus] ?? nextStatus}
                <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            );
          })}
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-muted-foreground">Description</h3>
        <div className="mt-2 whitespace-pre-wrap text-sm">
          {ticket.bodyMd || 'No description.'}
        </div>
      </div>

      {ticket.acceptanceCriteria.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground">Acceptance Criteria</h3>
          <ul className="mt-2 space-y-1">
            {ticket.acceptanceCriteria.map((ac) => (
              <li key={ac.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={ac.met} readOnly className="rounded" />
                <span>{ac.description}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dependencies */}
      <TicketDependencies ticketId={ticket.id} epicId={ticket.epicId} />

      {/* Related Patterns + Context Bundle */}
      {epic?.projectId && (
        <>
          <RelatedPatterns ticketId={ticket.id} projectId={epic.projectId} />
          <ContextBundlePreview projectId={epic.projectId} ticketId={ticket.id} />
        </>
      )}

      {/* Git Info */}
      {agentSessions && <GitInfo sessions={agentSessions} />}

      {/* Agent Session History */}
      {agentSessions && agentSessions.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Agent Sessions ({agentSessions.length})
          </h3>
          <SessionHistory sessions={agentSessions} />
        </div>
      )}

      {/* Validation Results */}
      {artifacts?.filter(a => a.type === 'validation').map((artifact) => (
        <div key={artifact.id} className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Validation Result
            <span className="ml-2 text-xs font-normal">
              {new Date(artifact.createdAt).toLocaleString()}
            </span>
          </h3>
          <ValidationResultPanel artifactContent={artifact.contentMd} />
        </div>
      ))}

      {/* Execution Summaries */}
      {artifacts?.filter(a => a.type === 'execution_summary').map((artifact) => (
        <div key={artifact.id} className="mt-6">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Execution Summary
            <span className="ml-2 text-xs font-normal">
              {new Date(artifact.createdAt).toLocaleString()}
            </span>
          </h3>
          <div className="rounded-lg border border-border p-4">
            <pre className="text-sm whitespace-pre-wrap">{artifact.contentMd}</pre>
          </div>
        </div>
      ))}

      <TicketFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        ticket={ticket}
        epics={epics ?? []}
        isPending={updateTicket.isPending}
        onSubmit={(data) => {
          updateTicket.mutate(
            { id: ticket.id, ...data },
            { onSuccess: () => setEditOpen(false) },
          );
        }}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Ticket</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{ticket.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteTicket.isPending}
              onClick={() => {
                deleteTicket.mutate(ticket.id, {
                  onSuccess: () => navigate('/'),
                });
              }}
            >
              {deleteTicket.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
