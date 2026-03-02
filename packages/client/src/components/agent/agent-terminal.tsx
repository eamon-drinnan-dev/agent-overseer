import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useAgentStore } from '@/stores/agent.store';

interface OutputEntry {
  id: string;
  timestamp: string;
  type: 'text' | 'tool_use' | 'tool_result' | 'status' | 'error' | 'artifact';
  content: string;
  phase?: string;
  toolName?: string;
}

interface AgentTerminalProps {
  outputLog: OutputEntry[];
  className?: string;
}

const typeColors: Record<string, string> = {
  text: 'text-foreground',
  tool_use: 'text-blue-400',
  tool_result: 'text-cyan-400',
  status: 'text-yellow-400',
  error: 'text-red-400',
  artifact: 'text-green-400',
};

export function AgentTerminal({ outputLog, className }: AgentTerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { autoScroll, showToolCalls } = useAgentStore();

  useEffect(() => {
    if (autoScroll && containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [outputLog.length, autoScroll]);

  const filteredLog = showToolCalls
    ? outputLog
    : outputLog.filter((e) => e.type !== 'tool_use' && e.type !== 'tool_result');

  return (
    <div
      ref={containerRef}
      className={cn(
        'overflow-y-auto rounded-lg border border-border bg-[#0d1117] p-4 font-mono text-sm',
        className,
      )}
    >
      {filteredLog.length === 0 ? (
        <p className="text-muted-foreground">Waiting for output...</p>
      ) : (
        filteredLog.map((entry) => (
          <div key={entry.id} className="mb-1">
            <span className="text-muted-foreground text-xs mr-2">
              {new Date(entry.timestamp).toLocaleTimeString()}
            </span>
            {entry.type === 'tool_use' && (
              <span className={cn(typeColors.tool_use, 'font-semibold')}>
                [{entry.toolName}] {entry.content}
              </span>
            )}
            {entry.type === 'tool_result' && (
              <span className={cn(typeColors.tool_result)}>
                [{entry.toolName} result] {entry.content.slice(0, 200)}{entry.content.length > 200 ? '...' : ''}
              </span>
            )}
            {entry.type === 'status' && (
              <span className={cn(typeColors.status, 'font-semibold')}>{entry.content}</span>
            )}
            {entry.type === 'error' && (
              <span className={cn(typeColors.error, 'font-semibold')}>ERROR: {entry.content}</span>
            )}
            {entry.type === 'artifact' && (
              <span className={cn(typeColors.artifact, 'font-semibold')}>{entry.content}</span>
            )}
            {entry.type === 'text' && (
              <span className={cn(typeColors.text, 'whitespace-pre-wrap')}>{entry.content}</span>
            )}
          </div>
        ))
      )}
    </div>
  );
}
