import { useMemo } from 'react';
import { TicketStatus, type Ticket, type Epic } from '@sentinel/shared';
import { BoardColumn } from './board-column';
import { BoardFilters } from './board-filters';
import { useBoardStore } from '@/stores/board.store';

const columns: { title: string; status: (typeof TicketStatus)[keyof typeof TicketStatus] }[] = [
  { title: 'To Do', status: TicketStatus.ToDo },
  { title: 'In Progress', status: TicketStatus.InProgress },
  { title: 'In Review', status: TicketStatus.InReview },
  { title: 'Validation', status: TicketStatus.Validation },
  { title: 'Complete', status: TicketStatus.Complete },
];

interface BoardViewProps {
  tickets: Ticket[];
  epics?: Epic[];
}

export function BoardView({ tickets, epics }: BoardViewProps) {
  const filters = useBoardStore((s) => s.filters);

  const epicMap = useMemo(() => {
    const map = new Map<string, Epic>();
    epics?.forEach((e) => map.set(e.id, e));
    return map;
  }, [epics]);

  const filtered = useMemo(() => {
    let result = tickets;
    if (filters.epicId) {
      result = result.filter((t) => t.epicId === filters.epicId);
    }
    if (filters.category) {
      result = result.filter((t) => t.category === filters.category);
    }
    if (filters.criticality) {
      result = result.filter((t) => {
        const effective = t.criticalityOverride ?? epicMap.get(t.epicId)?.criticality;
        return effective === filters.criticality;
      });
    }
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }
    return result;
  }, [tickets, filters, epicMap]);

  return (
    <div>
      <BoardFilters />
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <BoardColumn
            key={col.status}
            title={col.title}
            status={col.status}
            tickets={filtered.filter((t) => t.status === col.status)}
          />
        ))}
      </div>
    </div>
  );
}
