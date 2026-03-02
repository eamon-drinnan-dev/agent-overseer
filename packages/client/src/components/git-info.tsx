import { Badge } from '@/components/ui/badge';
import { GitBranch, GitPullRequest } from 'lucide-react';
import type { AgentSession } from '@sentinel/shared';

interface GitInfoProps {
  sessions: AgentSession[];
}

interface ParsedGitInfo {
  branchName: string | null;
  prUrl: string | null;
}

function parseGitInfo(outputLog: string | null): ParsedGitInfo {
  if (!outputLog) return { branchName: null, prUrl: null };

  const branchMatch = outputLog.match(/\[Git\] Branch: ([^\s(]+)/);
  const prMatch = outputLog.match(/\[Git\] PR created: (https?:\/\/[^\s]+)/);

  return {
    branchName: branchMatch?.[1] ?? null,
    prUrl: prMatch?.[1] ?? null,
  };
}

export function GitInfo({ sessions }: GitInfoProps) {
  // Find the most recent session with git info
  const gitInfos = sessions
    .map((s) => ({ session: s, git: parseGitInfo(s.outputLog) }))
    .filter((x) => x.git.branchName || x.git.prUrl)
    .sort((a, b) => b.session.createdAt.localeCompare(a.session.createdAt));

  const latest = gitInfos[0];
  if (!latest) return null;

  const { branchName, prUrl } = latest.git;

  return (
    <div className="mt-6">
      <h3 className="text-sm font-semibold text-muted-foreground">Git</h3>
      <div className="mt-2 space-y-2">
        {branchName && (
          <div className="flex items-center gap-2 text-sm">
            <GitBranch className="h-4 w-4 text-muted-foreground" />
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{branchName}</code>
          </div>
        )}
        {prUrl && (
          <div className="flex items-center gap-2 text-sm">
            <GitPullRequest className="h-4 w-4 text-muted-foreground" />
            <a
              href={prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              {prUrl.replace(/^https?:\/\/github\.com\//, '')}
            </a>
            <Badge variant="secondary" className="text-[10px]">PR</Badge>
          </div>
        )}
      </div>
    </div>
  );
}
