import { execFile } from 'child_process';
import { promisify } from 'util';
import { simpleGit, type SimpleGit } from 'simple-git';

const execFileAsync = promisify(execFile);

/**
 * Slugify a string for use in branch names.
 */
function slugify(text: string, maxLen = 40): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLen);
}

export interface GitBranchInfo {
  branchName: string;
  created: boolean;
}

export interface GitPrInfo {
  prUrl: string;
  prNumber: number;
}

export function createGitService() {
  function getGit(cwd: string): SimpleGit {
    return simpleGit({ baseDir: cwd });
  }

  return {
    /**
     * Create a feature branch for a ticket.
     * Naming convention: <category>/tl-<shortId>-<slug>
     */
    async createBranch(
      cwd: string,
      ticketId: string,
      ticketTitle: string,
      category: string,
    ): Promise<GitBranchInfo> {
      const git = getGit(cwd);
      const shortId = ticketId.slice(0, 8);
      const slug = slugify(ticketTitle);
      const branchName = `${category}/tl-${shortId}-${slug}`;

      // Check if branch already exists
      const branches = await git.branchLocal();
      if (branches.all.includes(branchName)) {
        await git.checkout(branchName);
        return { branchName, created: false };
      }

      // Create and checkout
      await git.checkoutLocalBranch(branchName);
      return { branchName, created: true };
    },

    /**
     * Create a pull request using the gh CLI.
     * Returns PR URL and number.
     */
    async createPullRequest(
      cwd: string,
      branchName: string,
      ticketId: string,
      ticketTitle: string,
      epicTitle: string,
      acList: Array<{ description: string; met: boolean }>,
      executionSummary: string | null,
    ): Promise<GitPrInfo | null> {
      const git = getGit(cwd);

      // Push branch to remote
      try {
        await git.push('origin', branchName, ['--set-upstream']);
      } catch (pushErr) {
        // If remote doesn't exist or push fails, PR creation is not possible
        return null;
      }

      // Build PR body
      const acText = acList.length > 0
        ? acList.map((ac) => `- [${ac.met ? 'x' : ' '}] ${ac.description}`).join('\n')
        : 'No acceptance criteria defined.';

      const body = [
        `## Ticket: ${ticketTitle}`,
        `**ID:** ${ticketId}`,
        epicTitle ? `**Epic:** ${epicTitle}` : '',
        '',
        '## Acceptance Criteria',
        acText,
        '',
        executionSummary ? `## Execution Summary\n${executionSummary.slice(0, 2000)}` : '',
        '',
        '---',
        '*Created by Sentinel Agent*',
      ].filter(Boolean).join('\n');

      // Use gh CLI to create PR
      try {
        const { stdout } = await execFileAsync('gh', [
          'pr', 'create',
          '--title', `[Agent] ${ticketTitle}`,
          '--body', body,
          '--head', branchName,
        ], { cwd });

        // Parse PR URL from output
        const prUrl = stdout.trim();
        const prNumberMatch = prUrl.match(/\/pull\/(\d+)/);
        return {
          prUrl,
          prNumber: prNumberMatch ? parseInt(prNumberMatch[1]!, 10) : 0,
        };
      } catch {
        // gh CLI not available or PR creation failed
        return null;
      }
    },

    /**
     * Get the current branch name.
     */
    async getCurrentBranch(cwd: string): Promise<string> {
      const git = getGit(cwd);
      const status = await git.status();
      return status.current ?? 'unknown';
    },

    /**
     * Check if there are uncommitted changes.
     */
    async hasChanges(cwd: string): Promise<boolean> {
      const git = getGit(cwd);
      const status = await git.status();
      return !status.isClean();
    },

    /**
     * Checkout the main/default branch.
     */
    async checkoutMain(cwd: string): Promise<void> {
      const git = getGit(cwd);
      const branches = await git.branchLocal();
      const mainBranch = branches.all.includes('main') ? 'main' : 'master';
      await git.checkout(mainBranch);
    },

    /**
     * Delete a branch (local + remote).
     */
    async deleteBranch(cwd: string, branchName: string): Promise<void> {
      const git = getGit(cwd);
      try {
        await git.checkout('main');
      } catch {
        await git.checkout('master');
      }
      await git.deleteLocalBranch(branchName, true);
      try {
        await git.push('origin', `:${branchName}`);
      } catch { /* remote branch may not exist */ }
    },
  };
}
