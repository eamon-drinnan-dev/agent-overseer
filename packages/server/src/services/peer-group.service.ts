import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import type { AppDatabase } from '../db/index.js';
import { peerGroups, patternRegistry } from '../db/schema/index.js';
import type { CreatePeerGroupInput, UpdatePeerGroupInput, PeerGroupWithMembers } from '@sentinel/shared';

type PeerGroupInsert = typeof peerGroups.$inferInsert;

export function createPeerGroupService(db: AppDatabase) {
  async function loadMembers(groupId: string) {
    const members = await db
      .select({
        id: patternRegistry.id,
        patternName: patternRegistry.patternName,
        path: patternRegistry.path,
        type: patternRegistry.type,
      })
      .from(patternRegistry)
      .where(eq(patternRegistry.peerGroupId, groupId));
    return members;
  }

  async function toWithMembers(
    group: typeof peerGroups.$inferSelect,
  ): Promise<PeerGroupWithMembers> {
    const members = await loadMembers(group.id);
    return { ...group, members, memberCount: members.length };
  }

  return {
    async listByProject(projectId: string): Promise<PeerGroupWithMembers[]> {
      const groups = await db
        .select()
        .from(peerGroups)
        .where(eq(peerGroups.projectId, projectId));
      return Promise.all(groups.map(toWithMembers));
    },

    async getById(id: string): Promise<PeerGroupWithMembers | null> {
      const rows = await db.select().from(peerGroups).where(eq(peerGroups.id, id));
      const group = rows[0];
      if (!group) return null;
      return toWithMembers(group);
    },

    async create(input: CreatePeerGroupInput): Promise<PeerGroupWithMembers> {
      const id = nanoid();
      const now = new Date().toISOString();
      const values: PeerGroupInsert = {
        id,
        projectId: input.projectId,
        patternId: input.patternId ?? null,
        name: input.name,
        description: input.description ?? '',
        conventionSummary: input.conventionSummary,
        lastUpdated: now,
      };
      await db.insert(peerGroups).values(values);

      // Auto-enroll exemplar as a member
      if (input.patternId) {
        await db
          .update(patternRegistry)
          .set({ peerGroupId: id, lastUpdated: now })
          .where(eq(patternRegistry.id, input.patternId));
      }

      return (await this.getById(id))!;
    },

    async update(
      id: string,
      input: UpdatePeerGroupInput,
    ): Promise<PeerGroupWithMembers | null> {
      const existing = await db.select().from(peerGroups).where(eq(peerGroups.id, id));
      if (!existing[0]) return null;

      const now = new Date().toISOString();
      const set: Partial<PeerGroupInsert> = { lastUpdated: now };
      if (input.name !== undefined) set.name = input.name;
      if (input.description !== undefined) set.description = input.description;
      if (input.conventionSummary !== undefined)
        set.conventionSummary = input.conventionSummary;
      if (input.patternId !== undefined) {
        set.patternId = input.patternId;
        // Auto-enroll new exemplar as member
        if (input.patternId) {
          await db
            .update(patternRegistry)
            .set({ peerGroupId: id, lastUpdated: now })
            .where(eq(patternRegistry.id, input.patternId));
        }
      }

      await db.update(peerGroups).set(set).where(eq(peerGroups.id, id));
      return this.getById(id);
    },

    async delete(id: string): Promise<void> {
      // Clear membership on all member patterns
      const members = await db
        .select({ id: patternRegistry.id })
        .from(patternRegistry)
        .where(eq(patternRegistry.peerGroupId, id));
      for (const m of members) {
        await db
          .update(patternRegistry)
          .set({ peerGroupId: null })
          .where(eq(patternRegistry.id, m.id));
      }
      // Delete the group
      await db.delete(peerGroups).where(eq(peerGroups.id, id));
    },

    async addMember(groupId: string, patternId: string): Promise<void> {
      const now = new Date().toISOString();
      await db
        .update(patternRegistry)
        .set({ peerGroupId: groupId, lastUpdated: now })
        .where(eq(patternRegistry.id, patternId));
    },

    async removeMember(groupId: string, patternId: string): Promise<void> {
      const now = new Date().toISOString();
      // Clear membership
      await db
        .update(patternRegistry)
        .set({ peerGroupId: null, lastUpdated: now })
        .where(eq(patternRegistry.id, patternId));

      // If removed pattern was the exemplar, null it out
      const group = await db.select().from(peerGroups).where(eq(peerGroups.id, groupId));
      if (group[0]?.patternId === patternId) {
        await db
          .update(peerGroups)
          .set({ patternId: null, lastUpdated: now })
          .where(eq(peerGroups.id, groupId));
      }
    },

    async getPeerGroupsForPatterns(
      patternIds: string[],
    ): Promise<Map<string, PeerGroupWithMembers>> {
      if (patternIds.length === 0) return new Map();

      // Get all patterns with their peerGroupId
      const patterns = await db.select().from(patternRegistry);
      const relevantPatterns = patterns.filter(
        (p) => patternIds.includes(p.id) && p.peerGroupId,
      );

      // Deduplicate peer group IDs
      const groupIds = [...new Set(relevantPatterns.map((p) => p.peerGroupId!))];
      if (groupIds.length === 0) return new Map();

      const result = new Map<string, PeerGroupWithMembers>();
      for (const gId of groupIds) {
        const group = await this.getById(gId);
        if (group) result.set(gId, group);
      }
      return result;
    },
  };
}
