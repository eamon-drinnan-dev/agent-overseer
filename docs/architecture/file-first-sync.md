# File-First Sync Design

## Principle

Everything is also a file. The database is the index, but tickets, epics, plans, and reviews are all markdown files on disk.

## File Locations

```
docs/
  tickets/    # Ticket markdown files
  epics/      # Epic markdown files
  artifacts/  # Plan, review, and validation artifacts
```

## Naming Convention

- Tickets: `docs/tickets/TL-{id}-{slug}.md`
- Epics: `docs/epics/EPIC-{id}-{slug}.md`
- Artifacts: `docs/artifacts/{ticket-id}/{type}-{timestamp}.md`

## Sync Direction

### DB -> File (on create/update via API)
1. When a ticket is created or updated through the API, the file-sync service writes the corresponding `.md` file
2. Frontmatter contains structured metadata (id, status, category, etc.)
3. Body contains the markdown description

### File -> DB (on startup or watch)
1. On server startup, scan `docs/tickets/` and `docs/epics/` for `.md` files
2. Parse frontmatter for metadata
3. Upsert into database
4. Optional: filesystem watcher for live sync

## Markdown Format

```markdown
---
id: abc123
title: Zone Lifecycle State Display
category: feature
status: todo
epicId: xyz789
criticality: critical
---

## Description

Build a component that displays zone lifecycle state...

## Acceptance Criteria

- [ ] Zone state is visible on zone cards
- [ ] Transitions animate smoothly
```

## Conflict Resolution

- Last-write-wins for now
- DB timestamp vs file mtime comparison
- Future: proper merge with diff detection
