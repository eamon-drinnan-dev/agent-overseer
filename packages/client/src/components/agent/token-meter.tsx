import { cn } from '@/lib/utils';

interface TokenMeterProps {
  inputTokens: number;
  outputTokens: number;
  costUsd?: string | null;
  className?: string;
}

export function TokenMeter({ inputTokens, outputTokens, costUsd, className }: TokenMeterProps) {
  const total = inputTokens + outputTokens;

  function formatTokens(n: number) {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <div className={cn('flex items-center gap-3 text-xs font-mono text-muted-foreground', className)}>
      <span title="Input tokens">In: {formatTokens(inputTokens)}</span>
      <span title="Output tokens">Out: {formatTokens(outputTokens)}</span>
      <span title="Total tokens">Tot: {formatTokens(total)}</span>
      {costUsd && <span title="Estimated cost">${costUsd}</span>}
    </div>
  );
}
