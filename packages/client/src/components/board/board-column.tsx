import type { Ticket, TicketStatus } from '@sentinel/shared';
import { TicketCard } from './ticket-card';

interface BoardColumnProps {
  title: string;
  status: TicketStatus;
  tickets: Ticket[];
}

export function BoardColumn({ title, tickets }: BoardColumnProps) {
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-lg bg-secondary/50">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {tickets.length}
        </span>
      </div>
      <div className="flex-1 space-y-2 overflow-auto p-2">
        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
        {tickets.length === 0 && (
          <p className="py-8 text-center text-xs text-muted-foreground">No tickets</p>
        )}
      </div>
    </div>
  );
}
