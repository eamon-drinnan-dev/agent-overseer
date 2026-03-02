import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/index.js';
import { tickets, epics, projects, patternRegistry, ticketArtifacts, peerGroups } from '../db/schema/index.js';
import { createContextBundleService } from './context-bundle.service.js';
import { createConflictDetectionService } from './conflict-detection.service.js';
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

  // Tier 2: Peer group conventions
  if (bundle.tier2.peerGroups.length > 0) {
    sections.push('## Peer Group Conventions\n');
    for (const pg of bundle.tier2.peerGroups) {
      sections.push(`### ${pg.name} (${pg.memberCount} members)`);
      sections.push('Convention:');
      sections.push(pg.conventionSummary);
      if (pg.exemplarPath) {
        sections.push(`\nExemplar: \`${pg.exemplarPath}\``);
        sections.push('Read this file during planning to see the convention in practice.');
      }
      if (pg.memberPaths.length > 0) {
        sections.push(`\nMembers: ${pg.memberPaths.map((p) => `\`${p}\``).join(', ')}`);
      }
      sections.push('');
    }
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
You are a Development Agent. Follow the mandatory 5-phase workflow:
1. PLAN - Produce a written implementation plan
2. HORIZONTAL AUDIT - If peer group conventions are in the context, read one peer and verify your plan matches
3. EXECUTE - Implement according to your plan
4. SELF-REVIEW - Review all changes and verify acceptance criteria
5. SUBMIT - Produce a final summary`;
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

const DISPATCH_PLAN_ARTIFACT_INSTRUCTIONS = `
## Output Artifact Markers

You MUST output a single dispatch plan artifact wrapped in these markers:

\`\`\`
===ARTIFACT_START:dispatch_plan===
{
  "version": 1,
  "epicId": "<epic-id>",
  "generatedAt": "<ISO timestamp>",
  "summary": "Brief summary of the plan",
  "groups": [
    {
      "groupIndex": 1,
      "label": "Group 1 — Foundation",
      "tickets": [
        {
          "ticketId": "<id>",
          "title": "Ticket title",
          "repoPath": null,
          "agentBrief": "Brief instructions for the agent",
          "model": null,
          "complexity": "medium"
        }
      ],
      "dependsOnGroups": []
    }
  ],
  "dependencies": [
    { "ticketId": "<id>", "dependsOnTicketId": "<id>", "reason": "Why", "type": "blocks" }
  ],
  "conflicts": [
    { "ticketIdA": "<id>", "ticketIdB": "<id>", "reason": "Why", "severity": "medium" }
  ],
  "totalTickets": 5,
  "excluded": []
}
===ARTIFACT_END:dispatch_plan===
\`\`\`

Rules:
- Groups are executed sequentially: group N+1 starts only after group N completes.
- Tickets within the same group can run in parallel.
- Use "blocks" dependencies for hard ordering requirements.
- Use "informs" dependencies for context sharing (no ordering constraint).
- Set \`repoPath\` per ticket only if it differs from the project default.
- Set \`model\` to null to use the criticality-based default.
- Exclude tickets that are already complete/failed or not actionable.

IMPORTANT: Output valid JSON inside the markers. The platform will validate it with a schema.
`;

function getValidationAgentInstructions(): string {
  try {
    const docsPath = join(__dirname, '..', '..', '..', '..', 'docs', 'agents', 'validation-agent.md');
    return readFileSync(docsPath, 'utf-8');
  } catch {
    return `# Validation Agent Instructions
You are a Validation Agent. Review completed work for quality, architectural alignment, and standards compliance.
Produce a structured JSON validation artifact with result: PASS or FAIL.`;
  }
}

const VALIDATION_ARTIFACT_INSTRUCTIONS = `
## Output Artifact Markers

You MUST wrap your validation report in these exact markers:

\`\`\`
===ARTIFACT_START:validation===
{
  "result": "PASS",
  "criteria": [
    { "name": "tests", "status": "pass", "details": "..." },
    { "name": "patterns", "status": "pass", "details": "..." },
    { "name": "acceptance_criteria", "status": "pass", "details": "...", "items": [{ "description": "...", "met": true, "notes": "..." }] },
    { "name": "architectural_drift", "status": "pass", "details": "..." },
    { "name": "storybook", "status": "skip", "details": "No UI components" },
    { "name": "self_review", "status": "pass", "details": "..." },
    { "name": "plan_adherence", "status": "pass", "details": "..." },
    { "name": "peer_conventions", "status": "pass", "details": "Peer group conventions respected" }
  ],
  "summary": "Overall assessment paragraph",
  "feedback": "If FAIL, actionable feedback here"
}
===ARTIFACT_END:validation===
\`\`\`

Rules:
- Output valid JSON inside the markers.
- Every criterion must have status: "pass", "fail", or "skip".
- Use "skip" only when a criterion is not applicable.
- Overall result is "PASS" only if no criterion has status "fail".
- If result is "FAIL", the feedback field must contain specific actionable instructions.
`;

export function createPromptBuilderService(db: AppDatabase) {
  const contextBundleService = createContextBundleService(db);
  const conflictService = createConflictDetectionService(db);

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

    /** Build a planning agent prompt for an entire epic (sprint planning). */
    async buildPlanningPrompt(projectId: string, epicId: string): Promise<string> {
      // Load project
      const projectRows = await db.select().from(projects).where(eq(projects.id, projectId));
      const project = projectRows[0];
      if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404 });

      // Load epic
      const epicRows = await db.select().from(epics).where(eq(epics.id, epicId));
      const epic = epicRows[0];
      if (!epic) throw Object.assign(new Error('Epic not found'), { statusCode: 404 });

      // Load all candidate tickets (non-terminal)
      const allTickets = await db.select().from(tickets).where(eq(tickets.epicId, epicId));
      const candidateTickets = allTickets.filter((t) => t.status !== 'complete' && t.status !== 'failed');
      const ticketIds = candidateTickets.map((t) => t.id);

      // Load patterns for this project
      const allPatterns = await db.select().from(patternRegistry).where(eq(patternRegistry.projectId, projectId));

      // Detect conflicts
      const conflicts = ticketIds.length > 0
        ? await conflictService.detectConflicts(projectId, ticketIds)
        : [];

      // Load workspace paths
      const workspacePaths = (project.workspacePaths ?? []) as string[];

      // CLAUDE.md
      let claudeMdContent: string | null = null;
      if (project.claudeMdPath) {
        try { claudeMdContent = readFileSync(project.claudeMdPath, 'utf-8'); } catch { /* */ }
      }

      // Build ticket summaries
      const ticketSections = candidateTickets.map((t) => {
        const ac = (t.acceptanceCriteria ?? []) as Array<{ id: string; description: string; met: boolean }>;
        const acText = ac.map((a) => `  - [${a.met ? 'x' : ' '}] ${a.description}`).join('\n');
        return [
          `### ${t.title} (id: ${t.id})`,
          `- Category: ${t.category}`,
          `- Status: ${t.status}`,
          t.criticalityOverride ? `- Criticality override: ${t.criticalityOverride}` : null,
          t.repoPath ? `- Repo path: ${t.repoPath}` : null,
          t.bodyMd ? `\n${t.bodyMd.slice(0, 500)}${t.bodyMd.length > 500 ? '...' : ''}` : null,
          acText ? `\nAcceptance Criteria:\n${acText}` : null,
        ].filter(Boolean).join('\n');
      }).join('\n\n');

      // Build conflict section
      const conflictSection = conflicts.length > 0
        ? conflicts.map((c) => `- ${c.ticketIdA} ↔ ${c.ticketIdB}: ${c.reason} (${c.severity})`).join('\n')
        : 'No conflicts detected.';

      // Build pattern summary (with peer group info)
      const patternSection = allPatterns.length > 0
        ? allPatterns.map((p) => {
            let line = `- **${p.patternName}** (${p.type}): \`${p.path}\` [${p.tags.join(', ')}]`;
            if (p.peerGroupId) line += ` (peer group: ${p.peerGroupId})`;
            return line;
          }).join('\n')
        : 'No patterns registered.';

      // Build peer group summary for planning context
      const allPeerGroups = await db.select().from(peerGroups).where(eq(peerGroups.projectId, projectId));
      const peerGroupSection = allPeerGroups.length > 0
        ? allPeerGroups.map((pg) => `- **${pg.name}**: ${pg.conventionSummary.split('\n')[0]}`).join('\n')
        : 'No peer groups registered.';

      const sections = [
        '# Planning Agent — Sprint Dispatch Planning',
        '',
        'You are a Planning Agent. Your job is to analyze an epic\'s tickets and produce a structured dispatch plan.',
        '',
        '---',
        '',
        claudeMdContent ? `## Project Standards (CLAUDE.md)\n\n${claudeMdContent}\n\n---\n` : '',
        `## Epic: ${epic.title} (id: ${epic.id})`,
        `- Status: ${epic.status}`,
        `- Criticality: ${epic.criticality}`,
        epic.descriptionMd ? `\n${epic.descriptionMd}` : '',
        '',
        `## Project`,
        `- Repo path: ${project.repoPath}`,
        workspacePaths.length > 0 ? `- Additional workspace paths: ${workspacePaths.join(', ')}` : '',
        '',
        '---',
        '',
        `## Candidate Tickets (${candidateTickets.length})`,
        '',
        ticketSections || 'No actionable tickets.',
        '',
        '---',
        '',
        `## Detected Conflicts`,
        '',
        conflictSection,
        '',
        '---',
        '',
        `## Pattern Registry (${allPatterns.length})`,
        '',
        patternSection,
        '',
        '---',
        '',
        `## Peer Groups (${allPeerGroups.length})`,
        '',
        peerGroupSection,
        '',
        '---',
        '',
        DISPATCH_PLAN_ARTIFACT_INSTRUCTIONS,
        '',
        '---',
        '',
        '# Instructions',
        '',
        'Analyze the candidate tickets and produce a dispatch plan that:',
        '1. Groups tickets into execution waves — group N+1 depends on group N completing.',
        '2. Identifies blocking dependencies between tickets.',
        '3. Notes informational dependencies for context sharing.',
        '4. Flags detected conflicts and separates conflicting tickets into different groups.',
        '5. Assigns complexity estimates (low/medium/high) per ticket.',
        '6. Writes concise agent briefs summarizing what each agent should focus on.',
        '7. Excludes tickets that are not actionable (already complete/failed).',
        '',
        'Output ONLY the dispatch_plan artifact. Do not execute any code.',
      ];

      return sections.join('\n');
    },

    /** Build a validation agent prompt for reviewing a completed ticket. */
    async buildValidationPrompt(projectId: string, ticketId: string): Promise<string> {
      // Generate context bundle
      const bundle = await contextBundleService.generateBundle(projectId, ticketId);
      const contextMarkdown = bundleToMarkdown(bundle);

      // Load validation instructions
      const validationInstructions = getValidationAgentInstructions();

      // Fetch existing artifacts for this ticket
      const artifactRows = await db.select().from(ticketArtifacts).where(eq(ticketArtifacts.ticketId, ticketId));
      const planArtifact = artifactRows.find((a) => a.type === 'plan');
      const execSummary = artifactRows.find((a) => a.type === 'execution_summary');
      const reviewArtifact = artifactRows.find((a) => a.type === 'review');

      const sections = [
        validationInstructions,
        '',
        '---',
        '',
        '# Context Bundle',
        '',
        contextMarkdown,
        '',
        '---',
        '',
        VALIDATION_ARTIFACT_INSTRUCTIONS,
        '',
        '---',
        '',
        '# Assigned Ticket',
        '',
        bundle.tier2.ticketContent,
        '',
        '---',
        '',
        '# Development Artifacts to Review',
        '',
        planArtifact ? `## Approved Plan\n\n${planArtifact.contentMd}\n` : '## Plan\nNo plan artifact found.\n',
        execSummary ? `## Execution Summary\n\n${execSummary.contentMd}\n` : '## Execution Summary\nNo execution summary found.\n',
        reviewArtifact ? `## Self-Review\n\n${reviewArtifact.contentMd}\n` : '## Self-Review\nNo self-review artifact found.\n',
        '',
        '---',
        '',
        '# Instructions',
        '',
        'Review the development artifacts above against the validation checklist.',
        'Examine the codebase in the working directory to verify:',
        '1. Tests exist and pass (run the test suite)',
        '2. Implementation follows the patterns in the context bundle',
        '3. Each acceptance criterion is individually addressed',
        '4. No architectural drift from established patterns',
        '5. UI components have Storybook stories (if applicable)',
        '6. Self-review artifact exists from the development agent',
        '7. Implementation matches the approved plan',
        '8. Peer group conventions are respected (if applicable)',
        '',
        'Output your validation report as a JSON artifact using the exact markers above.',
      ];

      return sections.join('\n');
    },
  };
}
