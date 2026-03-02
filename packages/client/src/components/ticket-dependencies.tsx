import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  useTicketDependencies,
  useCreateTicketDependency,
  useDeleteTicketDependency,
} from '@/hooks/use-ticket-dependencies';
import { useTickets } from '@/hooks/use-tickets';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DEPENDENCY_TYPES, type DependencyType } from '@sentinel/shared';
import { Plus, Trash2, ArrowRight } from 'lucide-react';

interface TicketDependenciesProps {
  ticketId: string;
  epicId: string;
}

const DEP_LABELS: Record<DependencyType, string> = {
  blocks: 'Blocks',
  informs: 'Informs',
  conflicts: 'Conflicts',
};

const DEP_COLORS: Record<DependencyType, string> = {
  blocks: 'destructive',
  informs: 'secondary',
  conflicts: 'outline',
};

export function TicketDependencies({ ticketId, epicId }: TicketDependenciesProps) {
  const { data: dependencies } = useTicketDependencies(ticketId);
  const { data: allTickets } = useTickets({ epicId });
  const createDep = useCreateTicketDependency();
  const deleteDep = useDeleteTicketDependency();

  const [adding, setAdding] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState('');
  const [selectedType, setSelectedType] = useState<string>('blocks');

  const availableTickets = allTickets?.filter(
    (t) => t.id !== ticketId && !dependencies?.some((d) => d.dependsOnTicketId === t.id && d.ticketId === ticketId),
  ) ?? [];

  function handleAdd() {
    if (!selectedTicket) return;
    createDep.mutate(
      { ticketId, dependsOnTicketId: selectedTicket, dependencyType: selectedType },
      {
        onSuccess: () => {
          setSelectedTicket('');
          setAdding(false);
        },
      },
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">
          Dependencies {dependencies?.length ? `(${dependencies.length})` : ''}
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setAdding(!adding)}>
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>

      {adding && (
        <div className="mt-2 flex items-end gap-2 rounded-md border border-border p-3">
          <div className="flex-1 space-y-1">
            <span className="text-xs text-muted-foreground">Depends on</span>
            <Select value={selectedTicket} onValueChange={setSelectedTicket}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select ticket..." />
              </SelectTrigger>
              <SelectContent>
                {availableTickets.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 space-y-1">
            <span className="text-xs text-muted-foreground">Type</span>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPENDENCY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {DEP_LABELS[t as DependencyType] ?? t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button size="sm" onClick={handleAdd} disabled={!selectedTicket || createDep.isPending}>
            Add
          </Button>
        </div>
      )}

      {dependencies && dependencies.length > 0 && (
        <div className="mt-2 space-y-1">
          {dependencies.map((dep) => {
            const isOutgoing = dep.ticketId === ticketId;
            const targetId = isOutgoing ? dep.dependsOnTicketId : dep.ticketId;
            return (
              <div
                key={dep.id}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant={DEP_COLORS[dep.dependencyType as DependencyType] as 'destructive' | 'secondary' | 'outline'}>
                    {DEP_LABELS[dep.dependencyType as DependencyType] ?? dep.dependencyType}
                  </Badge>
                  {isOutgoing ? (
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <span className="text-xs text-muted-foreground">from</span>
                  )}
                  <Link
                    to={`/tickets/${targetId}`}
                    className="text-primary hover:underline"
                  >
                    {dep.dependsOnTitle}
                  </Link>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {dep.dependsOnStatus.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => deleteDep.mutate({ ticketId, depId: dep.id })}
                  disabled={deleteDep.isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {(!dependencies || dependencies.length === 0) && !adding && (
        <p className="mt-2 text-xs text-muted-foreground">No dependencies.</p>
      )}
    </div>
  );
}
