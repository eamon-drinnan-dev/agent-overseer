import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { AppDatabase } from '../db/index.js';
import { createContextBundleService } from './context-bundle.service.js';
import type { ContextBundle } from '@sentinel/shared';

const __dirname = dirname(fileURLToPath(import.meta.url));

function bundleToMarkdown(bundle: ContextBundle): string {
  const sections: string[] = [];

  // Tier 1: CLAUDE.md
  if (bundle.tier1.claudeMdContent) {
    sections.push('## Project Standards (CLAUDE.md)\n');
    sections.push(bundle.tier1.claudeMdContent);
    sections.push('');
  }

  // Tier 2: Epic context
  if (bundle.tier2.epicSummary) {
    sections.push(bundle.tier2.epicSummary);
    sections.push('');
  }

  // Tier 2: Related patterns
  if (bundle.tier2.relatedPatterns.length > 0) {
    sections.push('## Related Patterns\n');
    for (const p of bundle.tier2.relatedPatterns) {
      sections.push(`- **${p.patternName}** (${p.type}): \`${p.path}\` [${p.tags.join(', ')}]${p.pinned ? ' (pinned)' : ''}`);
    }
    sections.push('');
  }

  // Tier 2: Dependencies (sibling tickets)
  if (bundle.tier2.dependencies.length > 0) {
    sections.push('## Related Tickets\n');
    for (const d of bundle.tier2.dependencies) {
      sections.push(`- [${d.status}] **${d.title}**: ${d.summary}`);
    }
    sections.push('');
  }

  return sections.join('\n');
}

function getAgentInstructions(): string {
  try {
    const docsPath = join(__dirname, '..', '..', '..', '..', 'docs', 'agents', 'development-agent.md');
    return readFileSync(docsPath, 'utf-8');
  } catch {
    // Fallback if docs not found
    return `# Development Agent Instructions
You are a Development Agent. Follow the mandatory 4-phase workflow:
1. PLAN - Produce a written implementation plan
2. EXECUTE - Implement according to your plan
3. SELF-REVIEW - Review all changes and verify acceptance criteria
4. SUBMIT - Produce a final summary`;
  }
}

const ARTIFACT_INSTRUCTIONS = `
## Output Artifact Markers

You MUST wrap your phase outputs in these markers so the platform can capture them:

### Plan Artifact
When you complete your plan, wrap it in:
\`\`\`
===ARTIFACT_START:plan===
(Your full implementation plan here)
===ARTIFACT_END:plan===
\`\`\`

### Execution Summary Artifact
After executing, wrap your summary in:
\`\`\`
===ARTIFACT_START:execution_summary===
(Summary of what was implemented, files changed, tests added)
===ARTIFACT_END:execution_summary===
\`\`\`

### Review Artifact
After self-review, wrap your review in:
\`\`\`
===ARTIFACT_START:review===
(Review findings, AC verification, test coverage assessment)
===ARTIFACT_END:review===
\`\`\`

IMPORTANT: Always use these exact markers. The platform relies on them to capture your outputs.
`;

export function createPromptBuilderService(db: AppDatabase) {
  const contextBundleService = createContextBundleService(db);

  return {
    async buildDevelopmentPrompt(projectId: string, ticketId: string): Promise<string> {
      // Generate context bundle
      const bundle = await contextBundleService.generateBundle(projectId, ticketId);
      const contextMarkdown = bundleToMarkdown(bundle);

      // Load agent instructions
      const agentInstructions = getAgentInstructions();

      // Assemble full system prompt
      const sections = [
        agentInstructions,
        '',
        '---',
        '',
        '# Context Bundle',
        '',
        contextMarkdown,
        '',
        '---',
        '',
        ARTIFACT_INSTRUCTIONS,
        '',
        '---',
        '',
        '# Assigned Ticket',
        '',
        bundle.tier2.ticketContent,
      ];

      return sections.join('\n');
    },

    async buildPlanOnlyPrompt(projectId: string, ticketId: string): Promise<string> {
      const fullPrompt = await this.buildDevelopmentPrompt(projectId, ticketId);
      return fullPrompt + `

---

# Current Phase: PLAN

You are in the PLAN phase only. Produce your implementation plan and wrap it in artifact markers.
Do NOT proceed to execution. Stop after producing the plan artifact.`;
    },

    async buildExecutionPrompt(projectId: string, ticketId: string, planContent: string): Promise<string> {
      const fullPrompt = await this.buildDevelopmentPrompt(projectId, ticketId);
      return fullPrompt + `

---

# Approved Plan

The following plan has been reviewed and approved. Execute it now.

${planContent}

---

# Current Phase: EXECUTE → SELF-REVIEW → SUBMIT

Proceed with execution according to the approved plan above.
After execution, perform self-review and produce the execution_summary and review artifacts.`;
    },
  };
}
