import { cn } from '@/lib/utils';
import type { Ticket } from '@sentinel/shared';
import { TicketCategory } from '@sentinel/shared';
import { Link } from 'react-router-dom';

const categoryColors: Record<string, string> = {
  [TicketCategory.Feature]: 'bg-green-500',
  [TicketCategory.TechDebt]: 'bg-blue-500',
  [TicketCategory.PapercutAndPolish]: 'bg-yellow-500',
  [TicketCategory.Bug]: 'bg-red-500',
  [TicketCategory.Infrastructure]: 'bg-gray-500',
  [TicketCategory.Documentation]: 'bg-purple-500',
};

export function TicketCard({ ticket }: { ticket: Ticket }) {
  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className="block rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start gap-2">
        <span
          className={cn('mt-1 h-2.5 w-2.5 rounded-full', categoryColors[ticket.category] ?? 'bg-gray-400')}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-tight truncate">{ticket.title}</p>
          <p className="mt-1 text-xs text-muted-foreground capitalize">
            {ticket.category.replace(/_/g, ' ')}
          </p>
        </div>
      </div>
      {ticket.criticalityOverride && (
        <span className="mt-2 inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
          {ticket.criticalityOverride}
        </span>
      )}
    </Link>
  );
}
