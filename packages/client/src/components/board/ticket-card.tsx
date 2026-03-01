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
      <div className="mt-2 flex items-center gap-2">
        {ticket.criticalityOverride && (
          <span className="inline-block rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
            {ticket.criticalityOverride}
          </span>
        )}
        {ticket.estimatedTokens != null && ticket.estimatedTokens > 0 && (
          <span
            className={cn(
              'inline-block rounded-full px-2 py-0.5 text-xs font-mono',
              ticket.estimatedTokens > 80_000
                ? 'bg-red-100 text-red-700'
                : ticket.estimatedTokens > 60_000
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-green-100 text-green-700',
            )}
          >
            ~{ticket.estimatedTokens >= 1000
              ? `${(ticket.estimatedTokens / 1000).toFixed(0)}K`
              : ticket.estimatedTokens} tok
          </span>
        )}
      </div>
    </Link>
  );
}
