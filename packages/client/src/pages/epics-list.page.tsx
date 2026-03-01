import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useEpics, useCreateEpic } from '@/hooks/use-epics';
import { useSprints } from '@/hooks/use-sprints';
import { useProjectStore } from '@/stores/project.store';
import { EpicFormDialog } from '@/components/epic-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';

export function EpicsListPage() {
  const projectId = useProjectStore((s) => s.activeProjectId);
  const { data: epics, isLoading, isError } = useEpics();
  const { data: sprints } = useSprints();
  const createEpic = useCreateEpic();
  const [createOpen, setCreateOpen] = useState(false);

  if (!projectId) {
    return <p className="text-muted-foreground">Select a project to view epics.</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Epics</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Epic
        </Button>
      </div>
      {isError ? (
        <p className="text-destructive">Failed to load epics. Please try again.</p>
      ) : isLoading ? (
        <p className="text-muted-foreground">Loading epics...</p>
      ) : epics && epics.length > 0 ? (
        <div className="space-y-3">
          {epics.map((epic) => (
            <Link
              key={epic.id}
              to={`/epics/${epic.id}`}
              className="block rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{epic.title}</h3>
                <div className="flex gap-2">
                  <Badge variant="secondary">{epic.status.replace(/_/g, ' ')}</Badge>
                  <Badge variant="outline">{epic.criticality}</Badge>
                </div>
              </div>
              <div className="mt-3 h-2 rounded-full bg-secondary">
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${epic.progressPct}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-muted-foreground">
                {epic.progressPct}% complete
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No epics yet. Create one to get started.</p>
      )}

      <EpicFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isPending={createEpic.isPending}
        sprints={sprints}
        onSubmit={(data) => {
          createEpic.mutate(data, {
            onSuccess: () => setCreateOpen(false),
          });
        }}
      />
    </div>
  );
}
