# ADR-005: File-First Design

**Status**: Accepted
**Date**: 2026-02-28

## Context
Agents need to read ticket context from the filesystem. The platform should enhance, not replace, file-based workflows.

## Decision
All tickets, epics, plans, and review artifacts are stored as markdown files on disk. The SQLite database serves as an index for fast queries and UI rendering.

## Rationale
- Agents can always read context directly from files
- All content is version-controlled alongside code
- Platform is an orchestration layer on top of files, not a replacement
- If the platform goes down, all content is still accessible
- Enables manual editing of tickets in any text editor

## Consequences
- Bidirectional sync between DB and filesystem required
- Frontmatter in markdown files carries structured metadata
- Conflict resolution needed (last-write-wins initially)
- File naming conventions must be enforced
