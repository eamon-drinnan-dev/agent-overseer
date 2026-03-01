import { useState } from 'react';
import {
  usePatterns,
  useCreatePattern,
  useUpdatePattern,
  useDeletePattern,
} from '@/hooks/use-patterns';
import { useProjectStore } from '@/stores/project.store';
import { PatternFormDialog } from '@/components/pattern-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { PatternEntry } from '@sentinel/shared';
import { Plus, Pencil, Trash2 } from 'lucide-react';

export function PatternsPage() {
  const projectId = useProjectStore((s) => s.activeProjectId);
  const { data: patterns, isLoading, isError } = usePatterns();
  const createPattern = useCreatePattern();
  const updatePattern = useUpdatePattern();
  const deletePattern = useDeletePattern();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPattern, setEditPattern] = useState<PatternEntry | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<PatternEntry | undefined>();

  if (!projectId) {
    return <p className="text-muted-foreground">Select a project to view patterns.</p>;
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Patterns</h2>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Pattern
        </Button>
      </div>

      {isError ? (
        <p className="text-destructive">Failed to load patterns. Please try again.</p>
      ) : isLoading ? (
        <p className="text-muted-foreground">Loading patterns...</p>
      ) : patterns && patterns.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {patterns.map((pattern) => (
            <div
              key={pattern.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate">{pattern.patternName}</h3>
                  <p className="mt-1 text-xs text-muted-foreground truncate font-mono">
                    {pattern.path}
                  </p>
                </div>
                <div className="flex gap-1 ml-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setEditPattern(pattern)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setDeleteTarget(pattern)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Badge variant="outline" className="text-xs">
                  {pattern.type}
                </Badge>
                {pattern.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No patterns yet. Register patterns to help agents understand your codebase.
        </p>
      )}

      {/* Create Dialog */}
      <PatternFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isPending={createPattern.isPending}
        onSubmit={(data) => {
          createPattern.mutate(data, {
            onSuccess: () => setCreateOpen(false),
          });
        }}
      />

      {/* Edit Dialog */}
      <PatternFormDialog
        open={!!editPattern}
        onOpenChange={(open) => { if (!open) setEditPattern(undefined); }}
        isPending={updatePattern.isPending}
        pattern={editPattern}
        onSubmit={(data) => {
          if (editPattern) {
            updatePattern.mutate(
              { id: editPattern.id, ...data },
              { onSuccess: () => setEditPattern(undefined) },
            );
          }
        }}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(undefined); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Pattern</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deleteTarget?.patternName}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deletePattern.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deletePattern.mutate(deleteTarget.id, {
                    onSuccess: () => setDeleteTarget(undefined),
                  });
                }
              }}
            >
              {deletePattern.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
