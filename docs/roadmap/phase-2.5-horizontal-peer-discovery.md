# Phase 2.5: Horizontal Peer Discovery

**Goal**: Prevent architectural drift by giving agents awareness of horizontally-aligned files that share the same pattern conventions.

**Timeframe**: 1-2 days (focused enhancement to existing Context Engine)

**Depends on**: Phase 2 complete (Pattern Registry exists)

**Motivation**: The Pattern Registry (Phase 2) solves vertical context — "what pattern should I follow?" Peer Groups solve horizontal context — "what else already follows this pattern, and what conventions do they share?" Without this, agents create structurally correct but conventionally inconsistent code.

---

## Requirements

### 2.5.1 Peer Groups — Data Model

New `peer_groups` table:
- `id` (text PK)
- `projectId` (FK to projects)
- `patternId` (nullable FK to pattern_registry — the exemplar pattern this group extends)
- `name` (text, human label e.g. "Entity Stores")
- `description` (text, what these files are)
- `conventionSummary` (text, 3-5 line curated summary of shared conventions)
- `lastUpdated` (text, ISO timestamp)

New nullable column on `pattern_registry`:
- `peerGroupId` (FK to peer_groups) — indicates this pattern entry is a member of a peer group

#### Key Constraints
- A pattern can belong to at most one peer group
- A peer group can have 0-N members
- The `patternId` on peer_groups points to the exemplar (the "best example" member), which must also be a member
- Convention summaries are manually curated, not auto-generated

### 2.5.2 Shared Package Updates

- [ ] `PeerGroup` type: `{ id, projectId, patternId, name, description, conventionSummary, lastUpdated }`
- [ ] `PeerGroupWithMembers` type: extends `PeerGroup` with `members: PatternEntry[]`
- [ ] `createPeerGroupSchema` (Zod): name, description, conventionSummary, patternId (optional)
- [ ] Update `ContextBundleTier2` type: add `peerGroups` array
- [ ] Peer group entry in bundle: `{ id, name, conventionSummary, exemplarPath, memberCount, memberPaths (graduated) }`

### 2.5.3 Server — Peer Group Service

- [ ] `peer-group.service.ts`: CRUD operations
  - `create(projectId, data)` — create group, optionally link members
  - `getById(id)` — with members populated
  - `listByProject(projectId)` — all groups with member counts
  - `update(id, data)` — update name, description, convention summary
  - `delete(id)` — unlinks members (sets `peerGroupId = null`), then deletes
  - `addMember(groupId, patternId)` — sets `peerGroupId` on pattern entry
  - `removeMember(patternId)` — clears `peerGroupId` on pattern entry

### 2.5.4 Server — Context Bundle Integration

Update `context-bundle.service.ts`:

- [ ] After resolving related patterns for a ticket, check if any matched pattern belongs to a peer group
- [ ] For each matched peer group, load the group + members
- [ ] Apply graduated loading rules:

| Members | Include in Tier 2 |
|---------|-------------------|
| 1-2 | Convention summary + all member paths |
| 3-5 | Convention summary + exemplar path only |
| 6+ | Convention summary only |

- [ ] Add peer group data to `ContextBundleTier2.peerGroups`
- [ ] Include peer group token estimate in budget breakdown

### 2.5.5 Server — Prompt Builder Integration

Update `prompt-builder.service.ts`:

- [ ] `bundleToMarkdown()`: render peer groups as a new section:

```markdown
## Peer Group Conventions

### Entity Stores (3 members)
Convention:
- Named `use{Entity}Store` with create pattern
- Actions: add, update, remove, reset, setAll
- Selectors: useById(id), useByStatus(status), useFiltered(predicate)

Exemplar: `src/stores/droneStore.ts`
Read this file during planning to see the convention in practice.
```

- [ ] Development agent prompt: horizontal audit instructions injected when peer groups are present
- [ ] Validation agent prompt: peer group conventions included for compliance checking

### 2.5.6 Server — API Routes

- [ ] `POST /api/projects/:projectId/peer-groups` — create
- [ ] `GET /api/projects/:projectId/peer-groups` — list with member counts
- [ ] `GET /api/peer-groups/:id` — detail with members
- [ ] `PUT /api/peer-groups/:id` — update
- [ ] `DELETE /api/peer-groups/:id` — delete
- [ ] `POST /api/peer-groups/:id/members/:patternId` — add member
- [ ] `DELETE /api/peer-groups/:id/members/:patternId` — remove member

### 2.5.7 Client — Peer Group Management

Extend the existing Patterns management page:

- [ ] "Peer Groups" tab or section alongside pattern list
- [ ] Create peer group dialog: name, description, convention summary (textarea), link exemplar pattern
- [ ] Peer group detail: edit convention, add/remove member patterns (from existing registry)
- [ ] Visual indicator on pattern cards showing peer group membership
- [ ] Context bundle preview: show peer group conventions in the ticket detail view

### 2.5.8 Agent Workflow Updates

No code changes — these are prompt/instruction updates:

- [ ] Update `docs/agents/development-agent.md`: add Horizontal Audit step between PLAN and EXECUTE
- [ ] Update `docs/agents/validation-agent.md`: add peer convention compliance to checklist
- [ ] Both changes are ~5 lines each — lightweight prompt additions

---

## DB Migration

Single migration (next available number):

```sql
CREATE TABLE peer_groups (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id),
  pattern_id TEXT REFERENCES pattern_registry(id),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  convention_summary TEXT NOT NULL DEFAULT '',
  last_updated TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE pattern_registry ADD COLUMN peer_group_id TEXT REFERENCES peer_groups(id);
```

---

## Implementation Order

1. Shared: types + schemas
2. DB migration
3. Server: peer-group service + routes
4. Server: context-bundle integration (graduated loading)
5. Server: prompt-builder integration (markdown rendering)
6. Client: peer group management UI
7. Docs: agent instruction updates
8. Test: create a peer group, verify it appears in context bundles and agent prompts

---

## Design Decisions

- **Convention summaries are human-curated**: Auto-generation would require reading all members and summarizing — expensive and unreliable. The human writes 5 lines when creating the group. This is the same philosophy as the Pattern Registry itself.
- **Graduated loading, not all-or-nothing**: Token budget discipline. 200 tokens for a convention summary vs 6,000 for dumping all peer source files.
- **Peer groups extend patterns, not replace them**: A pattern can exist without a peer group (standalone exemplar). Peer groups are an opt-in layer for patterns that have multiple implementations.
- **Flag drift, don't fix it**: The horizontal audit tells agents to note pre-existing inconsistencies but not fix them in the current ticket. Scope discipline prevents ticket creep.
- **One peer group per pattern entry**: Keeps the model simple. If a file legitimately belongs to two conventions, it should have two pattern entries with different tags.

---

## Success Metrics

| Metric | Baseline (without) | Target (with) |
|--------|---------------------|---------------|
| Horizontal consistency violations caught in validation | Manual only | Convention-checkable |
| Agent plan references to peer files | Incidental | Systematic |
| Token overhead per ticket | 0 | ~200-300 tokens |
| Convention summary maintenance | N/A | ~5 min/sprint |
