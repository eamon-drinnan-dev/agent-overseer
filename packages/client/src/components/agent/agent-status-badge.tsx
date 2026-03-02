import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { AgentSessionStatus } from '@sentinel/shared';

const statusConfig: Record<string, { label: string; className: string }> = {
  idle: { label: 'Idle', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  planning: { label: 'Planning', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  awaiting_review: { label: 'Awaiting Review', className: 'bg-amber-100 text-amber-700 border-amber-200' },
  executing: { label: 'Executing', className: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  reviewing: { label: 'Reviewing', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  complete: { label: 'Complete', className: 'bg-green-100 text-green-700 border-green-200' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700 border-red-200' },
};

export function AgentStatusBadge({ status, className }: { status: AgentSessionStatus | string; className?: string }) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {(status === 'planning' || status === 'executing') && (
        <span className="mr-1.5 inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
      )}
      {config.label}
    </Badge>
  );
}
