import { useState } from 'react';
import { useSprints, useCreateSprint, useDeleteSprint } from '@/hooks/use-sprints';
import { useProjectStore } from '@/stores/project.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Plus, Trash2, Calendar } from 'lucide-react';

export function SettingsPage() {
  const projectId = useProjectStore((s) => s.activeProjectId);
  const { data: sprints } = useSprints();
  const createSprint = useCreateSprint();
  const deleteSprint = useDeleteSprint();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [goalMd, setGoalMd] = useState('');

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createSprint.mutate(
      {
        name,
        startDate: startDate || null,
        endDate: endDate || null,
        goalMd,
      },
      {
        onSuccess: () => {
          setName('');
          setStartDate('');
          setEndDate('');
          setGoalMd('');
          setCreateOpen(false);
        },
      },
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
      <div className="mt-6 space-y-6">
        {/* Sprint Management */}
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Sprints</h3>
            <Button
              size="sm"
              variant="outline"
              disabled={!projectId}
              onClick={() => setCreateOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Sprint
            </Button>
          </div>
          {!projectId ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Select a project to manage sprints.
            </p>
          ) : sprints && sprints.length > 0 ? (
            <div className="mt-3 space-y-2">
              {sprints.map((sprint) => (
                <div
                  key={sprint.id}
                  className="flex items-center justify-between rounded-md border border-border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{sprint.name}</p>
                    {(sprint.startDate || sprint.endDate) && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {sprint.startDate ?? '?'} — {sprint.endDate ?? '?'}
                      </p>
                    )}
                    {sprint.goalMd && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                        {sprint.goalMd}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteId(sprint.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">No sprints yet.</p>
          )}
        </div>

        {/* Project Configuration */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-medium">Project Configuration</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Project settings will be configurable here.
          </p>
        </div>

        {/* Agent Configuration */}
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-medium">Agent Configuration</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Agent concurrency, review gates, and API keys.
          </p>
        </div>
      </div>

      {/* Create Sprint Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Sprint</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sprint-name">Name</Label>
              <Input
                id="sprint-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Sprint 1"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sprint-goal">Goal</Label>
              <Textarea
                id="sprint-goal"
                value={goalMd}
                onChange={(e) => setGoalMd(e.target.value)}
                placeholder="Sprint goal..."
                rows={3}
              />
            </div>
            <Button type="submit" disabled={createSprint.isPending} className="w-full">
              {createSprint.isPending ? 'Creating...' : 'Create Sprint'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Sprint Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sprint</DialogTitle>
            <DialogDescription>
              Are you sure? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteSprint.isPending}
              onClick={() => {
                if (deleteId) {
                  deleteSprint.mutate(deleteId, {
                    onSuccess: () => setDeleteId(null),
                  });
                }
              }}
            >
              {deleteSprint.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
