import { readFileSync } from 'fs';
import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/index.js';
import { tickets, epics, projects, patternRegistry, ticketPatterns, ticketDependencies, ticketArtifacts, peerGroups } from '../db/schema/index.js';
import { and } from 'drizzle-orm';
import { estimateTokens, DEFAULT_TOKEN_BUDGET } from './token-estimation.js';
import type { ContextBundle, TokenEstimate } from '@sentinel/shared';

export function createContextBundleService(db: AppDatabase) {
  return {
    async generateBundle(projectId: string, ticketId: string): Promise<ContextBundle> {
      // Fetch ticket
      const ticketRows = await db.select().from(tickets).where(eq(tickets.id, ticketId));
      const ticket = ticketRows[0];
      if (!ticket) throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });

      // Fetch parent epic
      const epicRows = await db.select().from(epics).where(eq(epics.id, ticket.epicId));
      const epic = epicRows[0] ?? null;

      // Fetch project
      const projectRows = await db.select().from(projects).where(eq(projects.id, projectId));
      const project = projectRows[0];
      if (!project) throw Object.assign(new Error('Project not found'), { statusCode: 404 });

      // Tier 1: CLAUDE.md
      let claudeMdContent: string | null = null;
      if (project.claudeMdPath) {
        try {
          claudeMdContent = readFileSync(project.claudeMdPath, 'utf-8');
        } catch {
          // File not found or not readable — leave as null
        }
      }
      const claudeMdTokens = estimateTokens(claudeMdContent ?? '');

      // Tier 2: Ticket content
      const acList = (ticket.acceptanceCriteria ?? []) as Array<{ id: string; description: string; met: boolean }>;
      const acText = acList
        .map((ac) => `- [${ac.met ? 'x' : ' '}] ${ac.description}`)
        .join('\n');
      const ticketContent = [
        `# ${ticket.title}`,
        '',
        ticket.bodyMd,
        '',
        acText ? `## Acceptance Criteria\n${acText}` : '',
      ].filter(Boolean).join('\n');
      const ticketTokens = estimateTokens(ticketContent);

      // Tier 2: Epic summary (first ~500 chars)
      let epicSummary: string | null = null;
      let epicTokens = 0;
      if (epic) {
        const desc = epic.descriptionMd ?? '';
        epicSummary = desc.length > 500 ? desc.slice(0, 500) + '...' : desc;
        epicSummary = `## Epic: ${epic.title}\n${epicSummary}`;
        epicTokens = estimateTokens(epicSummary);
      }

      // Tier 2: Related patterns (from ticket_patterns junction)
      const linkedPatterns = await db
        .select()
        .from(ticketPatterns)
        .where(eq(ticketPatterns.ticketId, ticketId));

      const relatedPatterns: ContextBundle['tier2']['relatedPatterns'] = [];

      for (const lp of linkedPatterns) {
        const patternRows = await db.select().from(patternRegistry).where(eq(patternRegistry.id, lp.patternId));
        const pattern = patternRows[0];
        if (pattern) {
          relatedPatterns.push({
            id: pattern.id,
            patternName: pattern.patternName,
            path: pattern.path,
            type: pattern.type,
            tags: pattern.tags,
            pinned: lp.pinned,
            autoMatched: lp.autoMatched,
          });
        }
      }

      const patternsText = relatedPatterns
        .map((p) => `- **${p.patternName}** (${p.type}): \`${p.path}\` [${p.tags.join(', ')}]`)
        .join('\n');
      const patternsTokens = estimateTokens(patternsText);

      // Tier 2: Peer groups (graduated loading)
      const peerGroupEntries: ContextBundle['tier2']['peerGroups'] = [];
      // Collect peerGroupIds from the matched patterns
      const matchedPatternIds = relatedPatterns.map((p) => p.id);
      if (matchedPatternIds.length > 0) {
        const fullPatterns = await Promise.all(
          matchedPatternIds.map((pid) =>
            db.select().from(patternRegistry).where(eq(patternRegistry.id, pid)).then((r) => r[0]),
          ),
        );
        const peerGroupIds = [
          ...new Set(
            fullPatterns
              .filter((p) => p?.peerGroupId)
              .map((p) => p!.peerGroupId!),
          ),
        ];

        for (const pgId of peerGroupIds) {
          const pgRows = await db.select().from(peerGroups).where(eq(peerGroups.id, pgId));
          const pg = pgRows[0];
          if (!pg) continue;

          const members = await db
            .select({ id: patternRegistry.id, path: patternRegistry.path })
            .from(patternRegistry)
            .where(eq(patternRegistry.peerGroupId, pgId));

          const memberCount = members.length;

          // Find exemplar path
          let exemplarPath: string | null = null;
          if (pg.patternId) {
            const exemplar = members.find((m) => m.id === pg.patternId);
            exemplarPath = exemplar?.path ?? null;
          }

          // Graduated loading
          let memberPaths: string[];
          if (memberCount <= 2) {
            memberPaths = members.map((m) => m.path);
          } else if (memberCount <= 5) {
            memberPaths = exemplarPath ? [exemplarPath] : [];
          } else {
            memberPaths = [];
          }

          peerGroupEntries.push({
            id: pg.id,
            name: pg.name,
            conventionSummary: pg.conventionSummary,
            exemplarPath,
            memberCount,
            memberPaths,
          });
        }
      }

      const peerGroupsText = peerGroupEntries
        .map((pg) => {
          const lines = [`### ${pg.name} (${pg.memberCount} members)`, pg.conventionSummary];
          if (pg.exemplarPath) lines.push(`Exemplar: ${pg.exemplarPath}`);
          if (pg.memberPaths.length > 0) lines.push(`Members: ${pg.memberPaths.join(', ')}`);
          return lines.join('\n');
        })
        .join('\n\n');
      const peerGroupsTokens = estimateTokens(peerGroupsText);

      // Tier 2: Same-epic tickets as horizontal context (dependencies)
      const dependencies: ContextBundle['tier2']['dependencies'] = [];
      if (epic) {
        const siblingTickets = await db.select().from(tickets).where(eq(tickets.epicId, epic.id));
        for (const sibling of siblingTickets) {
          if (sibling.id === ticketId) continue;
          const summary = sibling.bodyMd.length > 200
            ? sibling.bodyMd.slice(0, 200) + '...'
            : sibling.bodyMd;
          dependencies.push({
            id: sibling.id,
            title: sibling.title,
            status: sibling.status,
            summary,
          });
        }
      }

      // Inject artifacts from 'informs' dependencies as additional Tier 2 context
      const informsDeps = await db
        .select()
        .from(ticketDependencies)
        .where(
          and(
            eq(ticketDependencies.ticketId, ticketId),
            eq(ticketDependencies.dependencyType, 'informs'),
          ),
        );
      for (const dep of informsDeps) {
        const depArtifacts = await db
          .select()
          .from(ticketArtifacts)
          .where(
            and(
              eq(ticketArtifacts.ticketId, dep.dependsOnTicketId),
              eq(ticketArtifacts.type, 'execution_summary'),
            ),
          );
        for (const art of depArtifacts) {
          const depTicketRows = await db.select().from(tickets).where(eq(tickets.id, dep.dependsOnTicketId));
          const depTicket = depTicketRows[0];
          const summary = art.contentMd.length > 500 ? art.contentMd.slice(0, 500) + '...' : art.contentMd;
          dependencies.push({
            id: dep.dependsOnTicketId,
            title: depTicket ? `[Informs] ${depTicket.title}` : `[Informs] ${dep.dependsOnTicketId}`,
            status: depTicket?.status ?? 'complete',
            summary,
          });
        }
      }

      const depsText = dependencies
        .map((d) => `- [${d.status}] ${d.title}: ${d.summary}`)
        .join('\n');
      const dependenciesTokens = estimateTokens(depsText);

      // Tier 3: Linked files from patterns
      const linkedFiles = relatedPatterns.map((p) => p.path);

      // Token breakdown
      const tokenBreakdown: TokenEstimate[] = [
        { component: 'tier1_claudemd', tokens: claudeMdTokens, label: 'CLAUDE.md' },
        { component: 'tier2_ticket', tokens: ticketTokens, label: 'Ticket Content' },
        { component: 'tier2_epic', tokens: epicTokens, label: 'Epic Summary' },
        { component: 'tier2_patterns', tokens: patternsTokens, label: 'Related Patterns' },
        { component: 'tier2_peer_groups', tokens: peerGroupsTokens, label: 'Peer Groups' },
        { component: 'tier2_dependencies', tokens: dependenciesTokens, label: 'Dependencies' },
      ];
      const totalTokens = tokenBreakdown.reduce((sum, t) => sum + t.tokens, 0);
      tokenBreakdown.push({ component: 'total', tokens: totalTokens, label: 'Total' });

      const budgetLimit = DEFAULT_TOKEN_BUDGET;

      return {
        ticketId,
        ticketTitle: ticket.title,
        projectId,
        tier1: { claudeMdContent, claudeMdTokens },
        tier2: {
          ticketContent,
          ticketTokens,
          epicSummary,
          epicTokens,
          relatedPatterns,
          patternsTokens,
          dependencies,
          dependenciesTokens,
          peerGroups: peerGroupEntries,
          peerGroupsTokens,
        },
        tier3: { linkedFiles },
        tokenBreakdown,
        totalTokens,
        budgetLimit,
        overBudget: totalTokens > budgetLimit,
        generatedAt: new Date().toISOString(),
      };
    },

    async estimateAndSaveTokens(projectId: string, ticketId: string): Promise<number> {
      const bundle = await this.generateBundle(projectId, ticketId);
      await db
        .update(tickets)
        .set({ estimatedTokens: bundle.totalTokens, updatedAt: new Date().toISOString() })
        .where(eq(tickets.id, ticketId));
      return bundle.totalTokens;
    },
  };
}
