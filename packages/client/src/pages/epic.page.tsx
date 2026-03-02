import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEpic, useUpdateEpic, useDeleteEpic } from '@/hooks/use-epics';
import { useTickets } from '@/hooks/use-tickets';
import { useSprints } from '@/hooks/use-sprints';
import { EpicFormDialog } from '@/components/epic-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Pencil, Trash2, ArrowLeft } from 'lucide-react';
import { Label } from '@/components/ui/label';

export function EpicPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: epic, isLoading, isError } = useEpic(id ?? '');
  const { data: tickets } = useTickets({ epicId: id });
  const { data: sprints } = useSprints();
  const updateEpic = useUpdateEpic();
  const deleteEpic = useDeleteEpic();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) return <p className="text-muted-foreground">Loading epic...</p>;
  if (isError) return <p className="text-destructive">Failed to load epic. Please try again.</p>;
  if (!epic) return <p className="text-muted-foreground">Epic not found.</p>;

  return (
    <div className="max-w-3xl">
      <div className="mb-4">
        <Link to="/epics" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Epics
        </Link>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{epic.title}</h2>
          <div className="mt-2 flex gap-2">
            <Badge variant="secondary">{epic.status.replace(/_/g, ' ')}</Badge>
            <Badge variant="outline">{epic.criticality}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
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

      <div className="mt-4 h-2 rounded-full bg-secondary">
        <div
          className="h-2 rounded-full bg-primary transition-all"
          style={{ width: `${epic.progressPct}%` }}
        />
      </div>
      <p className="mt-1 text-right text-xs text-muted-foreground">
        {epic.progressPct}% complete
      </p>

      <div className="mt-4 flex items-center gap-3">
        <Label htmlFor="reviewPlans" className="text-sm text-muted-foreground cursor-pointer">
          Require plan review for standard tickets
        </Label>
        <input
          id="reviewPlans"
          type="checkbox"
          checked={!!epic.reviewPlans}
          onChange={(e) => {
            updateEpic.mutate({ id: epic.id, reviewPlans: e.target.checked });
          }}
          className="rounded"
        />
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-muted-foreground">Description</h3>
        <div className="mt-2 whitespace-pre-wrap text-sm">
          {epic.descriptionMd || 'No description.'}
        </div>
      </div>

      {tickets && tickets.length > 0 && (
        <div className="mt-8">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Tickets ({tickets.length})
          </h3>
          <div className="space-y-2">
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                className="flex items-center justify-between rounded-md border border-border p-3 text-sm hover:bg-secondary/50"
              >
                <span>{ticket.title}</span>
                <Badge variant="secondary">{ticket.status.replace(/_/g, ' ')}</Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      <EpicFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        epic={epic}
        sprints={sprints}
        isPending={updateEpic.isPending}
        onSubmit={(data) => {
          updateEpic.mutate(
            { id: epic.id, ...data },
            { onSuccess: () => setEditOpen(false) },
          );
        }}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Epic</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{epic.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteEpic.isPending}
              onClick={() => {
                deleteEpic.mutate(epic.id, {
                  onSuccess: () => navigate('/epics'),
                });
              }}
            >
              {deleteEpic.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
