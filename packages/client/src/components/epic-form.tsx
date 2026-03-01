import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { CRITICALITIES, EPIC_STATUSES } from '@sentinel/shared';
import type { Epic, Sprint, Criticality, EpicStatus } from '@sentinel/shared';

interface EpicFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    descriptionMd: string;
    criticality: string;
    status?: string;
    sprintId?: string | null;
  }) => void;
  isPending: boolean;
  epic?: Epic;
  sprints?: Sprint[];
}

export function EpicFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  epic,
  sprints,
}: EpicFormProps) {
  const [title, setTitle] = useState(epic?.title ?? '');
  const [descriptionMd, setDescriptionMd] = useState(epic?.descriptionMd ?? '');
  const [criticality, setCriticality] = useState<Criticality>(epic?.criticality ?? 'standard');
  const [status, setStatus] = useState<EpicStatus>(epic?.status ?? 'planning');
  const [sprintId, setSprintId] = useState(epic?.sprintId ?? '');

  // Reset form state when dialog opens/closes or epic changes
  useEffect(() => {
    if (open) {
      setTitle(epic?.title ?? '');
      setDescriptionMd(epic?.descriptionMd ?? '');
      setCriticality(epic?.criticality ?? 'standard');
      setStatus(epic?.status ?? 'planning');
      setSprintId(epic?.sprintId ?? '');
    }
  }, [open, epic]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: {
      title: string;
      descriptionMd: string;
      criticality: string;
      status?: string;
      sprintId?: string | null;
    } = {
      title,
      descriptionMd,
      criticality,
    };
    if (epic) {
      data.status = status;
      data.sprintId = sprintId || null;
    }
    onSubmit(data);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{epic ? 'Edit Epic' : 'Create Epic'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="epic-title">Title</Label>
            <Input
              id="epic-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Epic title"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="epic-description">Description (Markdown)</Label>
            <Textarea
              id="epic-description"
              value={descriptionMd}
              onChange={(e) => setDescriptionMd(e.target.value)}
              placeholder="Describe the epic..."
              rows={5}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Criticality</Label>
              <Select value={criticality} onValueChange={(v) => setCriticality(v as Criticality)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CRITICALITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {epic && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as EpicStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EPIC_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {sprints && sprints.length > 0 && (
            <div className="space-y-2">
              <Label>Sprint (optional)</Label>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger>
                  <SelectValue placeholder="No sprint" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No sprint</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Saving...' : epic ? 'Update Epic' : 'Create Epic'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
