# ADR-004: Drizzle ORM for Database Layer

**Status**: Accepted
**Date**: 2026-02-28

## Context
Need an ORM that provides type safety, migration management, and good DX for SQLite.

## Decision
Use Drizzle ORM with better-sqlite3 driver.

## Rationale
- Full TypeScript type inference from schema definitions
- SQL-like query builder (no magic, predictable queries)
- Built-in migration generation and runner
- Drizzle Studio for visual database inspection
- Lightweight — minimal runtime overhead

## Consequences
- Schema defined in TypeScript files under `packages/server/src/db/schema/`
- Migrations generated via `drizzle-kit generate`
- All column types explicitly mapped (JSON columns use `$type<>()`)
