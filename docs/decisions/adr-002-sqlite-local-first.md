# ADR-002: SQLite with Local-First Design

**Status**: Accepted
**Date**: 2026-02-28

## Context
Need a database for a solo-engineer tool. Must be portable, fast, and require no external dependencies.

## Decision
Use SQLite via better-sqlite3 with Drizzle ORM for schema management and queries.

## Rationale
- Zero configuration, no separate database server
- Single file, easily backed up and version-controlled
- WAL mode for concurrent read performance
- Drizzle ORM provides type-safe queries and migration management
- Perfectly suited for a single-user local application

## Consequences
- No multi-user concurrent writes (acceptable for solo tool)
- Database file is `.gitignored` but structure is version-controlled via migrations
- All data also exists as filesystem files (file-first design)
