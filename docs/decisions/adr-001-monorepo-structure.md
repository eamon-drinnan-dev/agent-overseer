# ADR-001: pnpm Monorepo with Workspaces

**Status**: Accepted
**Date**: 2026-02-28

## Context
Need to structure a project with separate frontend, backend, and shared type packages.

## Decision
Use pnpm workspaces with three packages: `@sentinel/shared`, `@sentinel/server`, `@sentinel/client`.

## Rationale
- Clean separation of concerns with shared types as source-of-truth
- pnpm workspaces are fast, disk-efficient, and well-supported
- Source-level imports for shared package (no build step needed)
- Each package can have independent tooling and build config

## Consequences
- Must use `workspace:*` protocol for internal dependencies
- Root-level scripts coordinate cross-package operations
- Shared package uses source exports (consumed directly by Vite and tsx)
