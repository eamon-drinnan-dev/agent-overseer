import { mkdirSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { eq } from 'drizzle-orm';
import type { AppDatabase } from '../db/index.js';
import { projects, epics, tickets } from '../db/schema/index.js';

type EpicRow = typeof epics.$inferSelect;
type TicketRow = typeof tickets.$inferSelect;
type EpicInsert = typeof epics.$inferInsert;
type TicketInsert = typeof tickets.$inferInsert;

// --- Frontmatter parsing ---

function toFrontmatter(data: Record<string, unknown>): string {
  const lines = ['---'];
  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      lines.push(`${key}:`);
      for (const item of value) {
        if (typeof item === 'object') {
          lines.push(`  - ${JSON.stringify(item)}`);
        } else {
          lines.push(`  - ${String(item)}`);
        }
      }
    } else {
      lines.push(`${key}: ${String(value)}`);
    }
  }
  lines.push('---');
  return lines.join('\n');
}

function parseFrontmatter(content: string): { meta: Record<string, string>; body: string } {
  const meta: Record<string, string> = {};
  if (!content.startsWith('---')) return { meta, body: content };

  const endIndex = content.indexOf('---', 3);
  if (endIndex === -1) return { meta, body: content };

  const frontmatter = content.slice(3, endIndex).trim();
  const body = content.slice(endIndex + 3).trim();

  for (const line of frontmatter.split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    if (key && !line.startsWith('  ')) {
      meta[key] = value;
    }
  }

  return { meta, body };
}

// --- Sync functions ---

function epicToMarkdown(epic: EpicRow): string {
  const fm = toFrontmatter({
    id: epic.id,
    title: epic.title,
    criticality: epic.criticality,
    status: epic.status,
    projectId: epic.projectId,
    sprintId: epic.sprintId,
    progressPct: epic.progressPct,
    createdAt: epic.createdAt,
    updatedAt: epic.updatedAt,
  });
  return `${fm}\n\n${epic.descriptionMd}`;
}

function ticketToMarkdown(ticket: TicketRow): string {
  const fm = toFrontmatter({
    id: ticket.id,
    title: ticket.title,
    category: ticket.category,
    status: ticket.status,
    epicId: ticket.epicId,
    criticalityOverride: ticket.criticalityOverride,
    assignedAgentId: ticket.assignedAgentId,
    estimatedTokens: ticket.estimatedTokens,
    acceptanceCriteria: ticket.acceptanceCriteria,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
  });
  return `${fm}\n\n${ticket.bodyMd}`;
}

export function createFileSyncService(db: AppDatabase) {
  async function getRepoPath(projectId: string): Promise<string | null> {
    const results = await db.select().from(projects).where(eq(projects.id, projectId));
    return results[0]?.repoPath ?? null;
  }

  return {
    /** Write an epic to its .md file */
    async syncEpicToFile(epic: EpicRow): Promise<string> {
      const repoPath = await getRepoPath(epic.projectId);
      if (!repoPath) return '';

      const dir = join(repoPath, 'docs', 'epics');
      mkdirSync(dir, { recursive: true });
      const filePath = join(dir, `${epic.id}.md`);
      writeFileSync(filePath, epicToMarkdown(epic), 'utf-8');

      // Update filePath in DB if not set
      if (!epic.filePath) {
        await db
          .update(epics)
          .set({ filePath })
          .where(eq(epics.id, epic.id));
      }

      return filePath;
    },

    /** Write a ticket to its .md file */
    async syncTicketToFile(ticket: TicketRow): Promise<string> {
      const epicResults = await db.select().from(epics).where(eq(epics.id, ticket.epicId));
      const epic = epicResults[0];
      if (!epic) return '';

      const repoPath = await getRepoPath(epic.projectId);
      if (!repoPath) return '';

      const dir = join(repoPath, 'docs', 'tickets');
      mkdirSync(dir, { recursive: true });
      const filePath = join(dir, `${ticket.id}.md`);
      writeFileSync(filePath, ticketToMarkdown(ticket), 'utf-8');

      // Update filePath in DB if not set
      if (!ticket.filePath) {
        await db
          .update(tickets)
          .set({ filePath })
          .where(eq(tickets.id, ticket.id));
      }

      return filePath;
    },

    /** Scan filesystem for .md files and upsert to DB */
    async syncFilesToDb(projectId: string): Promise<{ epics: number; tickets: number }> {
      const repoPath = await getRepoPath(projectId);
      if (!repoPath) return { epics: 0, tickets: 0 };

      let epicCount = 0;
      let ticketCount = 0;

      // Sync epics
      const epicsDir = join(repoPath, 'docs', 'epics');
      if (existsSync(epicsDir)) {
        const files = readdirSync(epicsDir).filter((f) => f.endsWith('.md'));
        for (const file of files) {
          const content = readFileSync(join(epicsDir, file), 'utf-8');
          const { meta, body } = parseFrontmatter(content);
          if (!meta['id'] || !meta['title']) continue;

          const existing = await db.select().from(epics).where(eq(epics.id, meta['id']));
          if (existing[0]) {
            await db
              .update(epics)
              .set({
                title: meta['title'],
                descriptionMd: body,
                criticality: (meta['criticality'] ?? 'standard') as EpicInsert['criticality'],
                status: (meta['status'] ?? 'planning') as EpicInsert['status'],
                updatedAt: new Date().toISOString(),
                filePath: join(epicsDir, file),
              })
              .where(eq(epics.id, meta['id']));
          } else {
            await db.insert(epics).values({
              id: meta['id'],
              title: meta['title'],
              descriptionMd: body,
              criticality: (meta['criticality'] ?? 'standard') as EpicInsert['criticality'],
              status: (meta['status'] ?? 'planning') as EpicInsert['status'],
              projectId,
              progressPct: parseInt(meta['progressPct'] ?? '0', 10),
              filePath: join(epicsDir, file),
              createdAt: meta['createdAt'] ?? new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          epicCount++;
        }
      }

      // Sync tickets
      const ticketsDir = join(repoPath, 'docs', 'tickets');
      if (existsSync(ticketsDir)) {
        const files = readdirSync(ticketsDir).filter((f) => f.endsWith('.md'));
        for (const file of files) {
          const content = readFileSync(join(ticketsDir, file), 'utf-8');
          const { meta, body } = parseFrontmatter(content);
          if (!meta['id'] || !meta['title'] || !meta['epicId']) continue;

          const existing = await db.select().from(tickets).where(eq(tickets.id, meta['id']));
          if (existing[0]) {
            await db
              .update(tickets)
              .set({
                title: meta['title'],
                bodyMd: body,
                category: (meta['category'] ?? 'feature') as TicketInsert['category'],
                status: (meta['status'] ?? 'todo') as NonNullable<TicketInsert['status']>,
                updatedAt: new Date().toISOString(),
                filePath: join(ticketsDir, file),
              })
              .where(eq(tickets.id, meta['id']));
          } else {
            await db.insert(tickets).values({
              id: meta['id'],
              title: meta['title'],
              bodyMd: body,
              category: (meta['category'] ?? 'feature') as TicketInsert['category'],
              status: (meta['status'] ?? 'todo') as NonNullable<TicketInsert['status']>,
              epicId: meta['epicId'],
              filePath: join(ticketsDir, file),
              createdAt: meta['createdAt'] ?? new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
          }
          ticketCount++;
        }
      }

      return { epics: epicCount, tickets: ticketCount };
    },

    /** Sync all DB records to filesystem for a project */
    async syncDbToFiles(projectId: string): Promise<void> {
      const epicRows = await db.select().from(epics).where(eq(epics.projectId, projectId));
      for (const epic of epicRows) {
        await this.syncEpicToFile(epic);
      }

      // For tickets, we need to find all tickets belonging to this project's epics
      for (const epic of epicRows) {
        const ticketRows = await db.select().from(tickets).where(eq(tickets.epicId, epic.id));
        for (const ticket of ticketRows) {
          await this.syncTicketToFile(ticket);
        }
      }
    },
  };
}
