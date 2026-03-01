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
import { TICKET_CATEGORIES, CRITICALITIES } from '@sentinel/shared';
import type { Ticket, Epic, TicketCategory, Criticality } from '@sentinel/shared';
import { Plus, X } from 'lucide-react';
import { nanoid } from 'nanoid';

interface TicketFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    title: string;
    bodyMd: string;
    category: string;
    epicId: string;
    criticalityOverride?: string | null;
    acceptanceCriteria?: Array<{ id: string; description: string; met: boolean }>;
  }) => void;
  isPending: boolean;
  ticket?: Ticket;
  epics: Epic[];
}

export function TicketFormDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  ticket,
  epics,
}: TicketFormProps) {
  const [title, setTitle] = useState(ticket?.title ?? '');
  const [bodyMd, setBodyMd] = useState(ticket?.bodyMd ?? '');
  const [category, setCategory] = useState<TicketCategory>(
    ticket?.category ?? 'feature',
  );
  const [epicId, setEpicId] = useState(ticket?.epicId ?? '');
  const [criticalityOverride, setCriticalityOverride] = useState<Criticality | ''>(
    ticket?.criticalityOverride ?? '',
  );
  const [criteria, setCriteria] = useState<Array<{ id: string; description: string; met: boolean }>>(
    ticket?.acceptanceCriteria ?? [],
  );

  // Reset form state when dialog opens/closes or ticket changes
  useEffect(() => {
    if (open) {
      setTitle(ticket?.title ?? '');
      setBodyMd(ticket?.bodyMd ?? '');
      setCategory(ticket?.category ?? 'feature');
      setEpicId(ticket?.epicId ?? '');
      setCriticalityOverride(ticket?.criticalityOverride ?? '');
      setCriteria(ticket?.acceptanceCriteria ?? []);
    }
  }, [open, ticket]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      title,
      bodyMd,
      category,
      epicId,
      criticalityOverride: criticalityOverride || null,
      acceptanceCriteria: criteria.length > 0 ? criteria : undefined,
    });
  }

  function addCriterion() {
    setCriteria([...criteria, { id: nanoid(8), description: '', met: false }]);
  }

  function removeCriterion(id: string) {
    setCriteria(criteria.filter((c) => c.id !== id));
  }

  function updateCriterion(id: string, description: string) {
    setCriteria(criteria.map((c) => (c.id === id ? { ...c, description } : c)));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{ticket ? 'Edit Ticket' : 'Create Ticket'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ticket-title">Title</Label>
            <Input
              id="ticket-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ticket title"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="ticket-body">Description (Markdown)</Label>
            <Textarea
              id="ticket-body"
              value={bodyMd}
              onChange={(e) => setBodyMd(e.target.value)}
              placeholder="Describe the task..."
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Epic</Label>
              <Select value={epicId} onValueChange={setEpicId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select epic" />
                </SelectTrigger>
                <SelectContent>
                  {epics.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Criticality Override (optional)</Label>
            <Select
              value={criticalityOverride}
              onValueChange={(v) => setCriticalityOverride(v as Criticality | '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Inherit from epic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Inherit from epic</SelectItem>
                {CRITICALITIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Acceptance Criteria</Label>
              <Button type="button" variant="ghost" size="sm" onClick={addCriterion}>
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            </div>
            {criteria.map((c) => (
              <div key={c.id} className="flex items-center gap-2">
                <Input
                  value={c.description}
                  onChange={(e) => updateCriterion(c.id, e.target.value)}
                  placeholder="Criterion description"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => removeCriterion(c.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button type="submit" disabled={isPending || !epicId} className="w-full">
            {isPending ? 'Saving...' : ticket ? 'Update Ticket' : 'Create Ticket'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
