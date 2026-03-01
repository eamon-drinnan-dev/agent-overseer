import type { FastifyInstance } from 'fastify';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { ticketPatterns, patternRegistry, tickets } from '../db/schema/index.js';
import { createPatternService } from '../services/pattern.service.js';
import { extractTicketKeywords, findMatchingPatterns } from '../services/pattern-matching.js';

export async function ticketPatternRoutes(app: FastifyInstance) {
  // GET /api/tickets/:ticketId/patterns — list linked patterns with full details
  app.get<{ Params: { ticketId: string } }>(
    '/api/tickets/:ticketId/patterns',
    async (request) => {
      const links = await app.db
        .select()
        .from(ticketPatterns)
        .where(eq(ticketPatterns.ticketId, request.params.ticketId));

      const results = [];
      for (const link of links) {
        const patternRows = await app.db
          .select()
          .from(patternRegistry)
          .where(eq(patternRegistry.id, link.patternId));
        const pattern = patternRows[0];
        if (pattern) {
          results.push({
            ...pattern,
            pinned: link.pinned,
            autoMatched: link.autoMatched,
            linkId: link.id,
          });
        }
      }
      return results;
    },
  );

  // POST /api/tickets/:ticketId/patterns/:patternId/pin — pin a pattern to a ticket
  app.post<{ Params: { ticketId: string; patternId: string } }>(
    '/api/tickets/:ticketId/patterns/:patternId/pin',
    async (request, reply) => {
      const { ticketId, patternId } = request.params;

      // Check if link already exists
      const existing = await app.db
        .select()
        .from(ticketPatterns)
        .where(and(eq(ticketPatterns.ticketId, ticketId), eq(ticketPatterns.patternId, patternId)));

      if (existing.length > 0 && existing[0]) {
        // Update existing to pinned
        await app.db
          .update(ticketPatterns)
          .set({ pinned: true })
          .where(eq(ticketPatterns.id, existing[0].id));
        return reply.status(200).send({ ok: true });
      }

      // Create new pinned link
      await app.db.insert(ticketPatterns).values({
        id: nanoid(),
        ticketId,
        patternId,
        pinned: true,
        autoMatched: false,
        createdAt: new Date().toISOString(),
      });
      return reply.status(201).send({ ok: true });
    },
  );

  // DELETE /api/tickets/:ticketId/patterns/:patternId/pin — unpin a pattern
  app.delete<{ Params: { ticketId: string; patternId: string } }>(
    '/api/tickets/:ticketId/patterns/:patternId/pin',
    async (request, reply) => {
      const { ticketId, patternId } = request.params;
      await app.db
        .delete(ticketPatterns)
        .where(and(eq(ticketPatterns.ticketId, ticketId), eq(ticketPatterns.patternId, patternId)));
      return reply.status(204).send();
    },
  );

  // POST /api/tickets/:ticketId/patterns/auto-match — trigger auto-matching
  app.post<{ Params: { ticketId: string }; Body: { projectId: string } }>(
    '/api/tickets/:ticketId/patterns/auto-match',
    async (request) => {
      const { ticketId } = request.params;
      const { projectId } = request.body as { projectId: string };

      // Fetch ticket
      const ticketRows = await app.db.select().from(tickets).where(eq(tickets.id, ticketId));
      const ticket = ticketRows[0];
      if (!ticket) throw Object.assign(new Error('Ticket not found'), { statusCode: 404 });

      // Fetch all patterns for project
      const patternService = createPatternService(app.db);
      const allPatterns = await patternService.listByProject(projectId);

      // Extract keywords and find matches
      const keywords = extractTicketKeywords({
        title: ticket.title,
        bodyMd: ticket.bodyMd,
        category: ticket.category,
        acceptanceCriteria: ticket.acceptanceCriteria as Array<{ id: string; description: string; met: boolean }>,
      });

      const matches = findMatchingPatterns(allPatterns, keywords);

      // Clear old auto-matched (non-pinned) entries
      const existingLinks = await app.db
        .select()
        .from(ticketPatterns)
        .where(eq(ticketPatterns.ticketId, ticketId));

      for (const link of existingLinks) {
        if (link.autoMatched && !link.pinned) {
          await app.db.delete(ticketPatterns).where(eq(ticketPatterns.id, link.id));
        }
      }

      // Insert new auto-matched entries (skip if already pinned)
      const pinnedIds = new Set(
        existingLinks.filter((l) => l.pinned).map((l) => l.patternId),
      );

      const results = [];
      for (const match of matches) {
        if (pinnedIds.has(match.id)) {
          // Update existing pinned entry to also mark as auto-matched
          const link = existingLinks.find((l) => l.patternId === match.id);
          if (link) {
            await app.db
              .update(ticketPatterns)
              .set({ autoMatched: true })
              .where(eq(ticketPatterns.id, link.id));
          }
          results.push({ ...match, pinned: true, autoMatched: true });
          continue;
        }

        await app.db.insert(ticketPatterns).values({
          id: nanoid(),
          ticketId,
          patternId: match.id,
          pinned: false,
          autoMatched: true,
          createdAt: new Date().toISOString(),
        });
        results.push({ ...match, pinned: false, autoMatched: true });
      }

      return results;
    },
  );
}
