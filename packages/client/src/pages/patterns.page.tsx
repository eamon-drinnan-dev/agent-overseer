import { useState } from 'react';
import {
  usePatterns,
  useCreatePattern,
  useUpdatePattern,
  useDeletePattern,
} from '@/hooks/use-patterns';
import {
  usePeerGroups,
  useCreatePeerGroup,
  useUpdatePeerGroup,
  useDeletePeerGroup,
  useAddPeerGroupMember,
  useRemovePeerGroupMember,
} from '@/hooks/use-peer-groups';
import { useProjectStore } from '@/stores/project.store';
import { PatternFormDialog } from '@/components/pattern-form';
import { PeerGroupFormDialog } from '@/components/peer-group-form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { PatternEntry, PeerGroupWithMembers } from '@sentinel/shared';
import { Plus, Pencil, Trash2, Users, X, UserPlus, Info } from 'lucide-react';

export function PatternsPage() {
  const projectId = useProjectStore((s) => s.activeProjectId);
  const { data: patterns, isLoading, isError } = usePatterns();
  const { data: peerGroups, isLoading: pgLoading } = usePeerGroups();
  const createPattern = useCreatePattern();
  const updatePattern = useUpdatePattern();
  const deletePattern = useDeletePattern();
  const createPeerGroup = useCreatePeerGroup();
  const updatePeerGroup = useUpdatePeerGroup();
  const deletePeerGroup = useDeletePeerGroup();
  const addMember = useAddPeerGroupMember();
  const removeMember = useRemovePeerGroupMember();

  const [createOpen, setCreateOpen] = useState(false);
  const [editPattern, setEditPattern] = useState<PatternEntry | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<PatternEntry | undefined>();
  const [pgCreateOpen, setPgCreateOpen] = useState(false);
  const [pgEditTarget, setPgEditTarget] = useState<PeerGroupWithMembers | undefined>();
  const [pgDeleteTarget, setPgDeleteTarget] = useState<PeerGroupWithMembers | undefined>();
  const [pgDetailTarget, setPgDetailTarget] = useState<PeerGroupWithMembers | undefined>();
  const [addMemberPatternId, setAddMemberPatternId] = useState<string>('');

  if (!projectId) {
    return <p className="text-muted-foreground">Select a project to view patterns.</p>;
  }

  // Build a map from peer group ID to name for badge display
  const pgNameMap = new Map<string, string>();
  peerGroups?.forEach((pg) => pgNameMap.set(pg.id, pg.name));

  // Patterns not in any peer group (for "Add Member" select)
  const ungroupedPatterns = (patterns ?? []).filter((p) => !p.peerGroupId);

  return (
    <div>
      {/* Patterns Section */}
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
                {pattern.peerGroupId && pgNameMap.has(pattern.peerGroupId) && (
                  <Badge variant="default" className="text-xs gap-1">
                    <Users className="h-3 w-3" />
                    {pgNameMap.get(pattern.peerGroupId)}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No patterns yet. Register patterns to help agents understand your codebase.
        </p>
      )}

      <Separator className="my-8" />

      {/* Peer Groups Section */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Peer Groups</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p>
                  Peer groups link patterns that should stay consistent with each
                  other. Each group has a curated convention summary (~5 lines)
                  that agents receive instead of reading all peer files —
                  precision context, not a firehose.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
        <Button size="sm" onClick={() => setPgCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Peer Group
        </Button>
      </div>

      {pgLoading ? (
        <p className="text-muted-foreground">Loading peer groups...</p>
      ) : peerGroups && peerGroups.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {peerGroups.map((pg) => (
            <div
              key={pg.id}
              className="rounded-lg border border-border bg-card p-4 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setPgDetailTarget(pg)}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium truncate">{pg.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground truncate">
                    {pg.description || 'No description'}
                  </p>
                </div>
                <div className="flex gap-1 ml-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setPgEditTarget(pg)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setPgDeleteTarget(pg)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <Badge variant="outline" className="text-xs gap-1">
                  <Users className="h-3 w-3" />
                  {pg.memberCount} members
                </Badge>
                {pg.patternId && (
                  <Badge variant="secondary" className="text-xs">
                    has exemplar
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">
                {pg.conventionSummary}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">
          No peer groups yet. Create peer groups to help agents maintain horizontal consistency.
        </p>
      )}

      {/* Pattern Create Dialog */}
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

      {/* Pattern Edit Dialog */}
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

      {/* Pattern Delete Confirmation */}
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

      {/* Peer Group Create Dialog */}
      <PeerGroupFormDialog
        open={pgCreateOpen}
        onOpenChange={setPgCreateOpen}
        isPending={createPeerGroup.isPending}
        patterns={patterns ?? []}
        onSubmit={(data) => {
          createPeerGroup.mutate(data, {
            onSuccess: () => setPgCreateOpen(false),
          });
        }}
      />

      {/* Peer Group Edit Dialog */}
      <PeerGroupFormDialog
        open={!!pgEditTarget}
        onOpenChange={(open) => { if (!open) setPgEditTarget(undefined); }}
        isPending={updatePeerGroup.isPending}
        peerGroup={pgEditTarget}
        patterns={patterns ?? []}
        onSubmit={(data) => {
          if (pgEditTarget) {
            updatePeerGroup.mutate(
              { id: pgEditTarget.id, ...data },
              { onSuccess: () => setPgEditTarget(undefined) },
            );
          }
        }}
      />

      {/* Peer Group Delete Confirmation */}
      <Dialog open={!!pgDeleteTarget} onOpenChange={(open) => { if (!open) setPgDeleteTarget(undefined); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Peer Group</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{pgDeleteTarget?.name}&quot;? Member patterns will be unlinked but not deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPgDeleteTarget(undefined)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deletePeerGroup.isPending}
              onClick={() => {
                if (pgDeleteTarget) {
                  deletePeerGroup.mutate(pgDeleteTarget.id, {
                    onSuccess: () => setPgDeleteTarget(undefined),
                  });
                }
              }}
            >
              {deletePeerGroup.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Peer Group Detail Dialog */}
      <Dialog open={!!pgDetailTarget} onOpenChange={(open) => { if (!open) { setPgDetailTarget(undefined); setAddMemberPatternId(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{pgDetailTarget?.name}</DialogTitle>
            <DialogDescription>{pgDetailTarget?.description}</DialogDescription>
          </DialogHeader>
          {pgDetailTarget && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-1">Convention Summary</h4>
                <pre className="text-xs bg-secondary rounded p-3 whitespace-pre-wrap">
                  {pgDetailTarget.conventionSummary}
                </pre>
              </div>

              <Separator />

              <div>
                <h4 className="text-sm font-medium mb-2">
                  Members ({pgDetailTarget.memberCount})
                </h4>
                {pgDetailTarget.members.length > 0 ? (
                  <div className="space-y-1">
                    {pgDetailTarget.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between text-xs rounded px-2 py-1.5 hover:bg-secondary"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-medium truncate">{m.patternName}</span>
                          <span className="text-muted-foreground font-mono truncate">
                            {m.path}
                          </span>
                          {pgDetailTarget.patternId === m.id && (
                            <Badge variant="default" className="text-[10px] shrink-0">
                              exemplar
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          disabled={removeMember.isPending}
                          onClick={() =>
                            removeMember.mutate(
                              { groupId: pgDetailTarget.id, patternId: m.id },
                              {
                                onSuccess: () => {
                                  // Refresh detail
                                  setPgDetailTarget((prev) =>
                                    prev
                                      ? {
                                          ...prev,
                                          members: prev.members.filter((x) => x.id !== m.id),
                                          memberCount: prev.memberCount - 1,
                                          patternId: prev.patternId === m.id ? null : prev.patternId,
                                        }
                                      : undefined,
                                  );
                                },
                              },
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No members yet.</p>
                )}
              </div>

              {ungroupedPatterns.length > 0 && (
                <div className="flex gap-2">
                  <Select
                    value={addMemberPatternId}
                    onValueChange={setAddMemberPatternId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add a pattern..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ungroupedPatterns.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.patternName} ({p.path})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    disabled={!addMemberPatternId || addMember.isPending}
                    onClick={() => {
                      if (addMemberPatternId && pgDetailTarget) {
                        addMember.mutate(
                          {
                            groupId: pgDetailTarget.id,
                            patternId: addMemberPatternId,
                          },
                          {
                            onSuccess: () => {
                              const added = patterns?.find(
                                (p) => p.id === addMemberPatternId,
                              );
                              if (added) {
                                setPgDetailTarget((prev) =>
                                  prev
                                    ? {
                                        ...prev,
                                        members: [
                                          ...prev.members,
                                          {
                                            id: added.id,
                                            patternName: added.patternName,
                                            path: added.path,
                                            type: added.type,
                                          },
                                        ],
                                        memberCount: prev.memberCount + 1,
                                      }
                                    : undefined,
                                );
                              }
                              setAddMemberPatternId('');
                            },
                          },
                        );
                      }
                    }}
                  >
                    <UserPlus className="mr-1 h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
