import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
} from '@/components/ui/dialog';
import type { PeerGroupWithMembers, PatternEntry } from '@sentinel/shared';

interface PeerGroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description: string;
    conventionSummary: string;
    patternId: string | null;
  }) => void;
  isPending: boolean;
  peerGroup?: PeerGroupWithMembers;
  patterns?: PatternEntry[];
}

export function PeerGroupFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  peerGroup,
  patterns = [],
}: PeerGroupFormProps) {
  const [name, setName] = useState(peerGroup?.name ?? '');
  const [description, setDescription] = useState(peerGroup?.description ?? '');
  const [conventionSummary, setConventionSummary] = useState(
    peerGroup?.conventionSummary ?? '',
  );
  const [patternId, setPatternId] = useState<string | null>(
    peerGroup?.patternId ?? null,
  );

  useEffect(() => {
    if (open) {
      setName(peerGroup?.name ?? '');
      setDescription(peerGroup?.description ?? '');
      setConventionSummary(peerGroup?.conventionSummary ?? '');
      setPatternId(peerGroup?.patternId ?? null);
    }
  }, [open, peerGroup]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({ name, description, conventionSummary, patternId });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {peerGroup ? 'Edit Peer Group' : 'Create Peer Group'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pg-name">Name</Label>
            <Input
              id="pg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Entity Stores"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pg-description">Description</Label>
            <Input
              id="pg-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Zustand stores for domain entity collections"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pg-convention">Convention Summary</Label>
            <Textarea
              id="pg-convention"
              value={conventionSummary}
              onChange={(e) => setConventionSummary(e.target.value)}
              placeholder={"- Named `use{Entity}Store` with create pattern\n- Actions: add, update, remove, reset, setAll\n- Selectors: useById(id), useByStatus(status)\n- Optimistic updates on mutation\n- Re-export typed hooks from store file"}
              rows={5}
              required
              minLength={10}
            />
            <p className="text-xs text-muted-foreground">
              3-5 lines of checkable conventions shared by all members. This is
              what agents see (~200 tokens) instead of reading all peer files.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Exemplar Pattern</Label>
            <Select
              value={patternId ?? '__none__'}
              onValueChange={(v) => setPatternId(v === '__none__' ? null : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an exemplar pattern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {patterns.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.patternName} ({p.path})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              The exemplar is the best example of this convention. Agents will
              read it during planning.
            </p>
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending
              ? 'Saving...'
              : peerGroup
                ? 'Update Peer Group'
                : 'Create Peer Group'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
