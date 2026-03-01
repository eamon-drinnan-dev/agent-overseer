# Agent Overseer (Sentinel)

## Project
Agentic Dev Hub — an AI-first project management platform for solo engineers orchestrating multiple LLM agents across a single codebase.

## Defaults
- Default model: claude-opus-4-6
- Use TypeScript unless otherwise specified
- Use pnpm for package management

# currentDate
Today's date is 2026-02-28.

## Architecture
- **Monorepo**: pnpm workspaces with 3 packages
- **Frontend**: React 19 + Vite 6 + Tailwind v4 + shadcn/ui + Zustand + TanStack Query
- **Backend**: Fastify 5 + Drizzle ORM + SQLite (better-sqlite3)
- **Shared**: TypeScript types, Zod schemas, enums (source-level exports, no build step)

## Package Structure
```
packages/
  shared/    # @sentinel/shared — types, enums, Zod schemas, API constants
  server/    # @sentinel/server — Fastify API + SQLite database
  client/    # @sentinel/client — React SPA
```

## Key Commands
- `pnpm dev` — Start both server (:3001) and client (:5173)
- `pnpm typecheck` — Typecheck all packages
- `pnpm db:generate` — Generate Drizzle migrations
- `pnpm db:migrate` — Run database migrations

## Conventions
- Enums use `as const` objects with derived types (see `packages/shared/src/enums.ts`)
- Database schema in `packages/server/src/db/schema/`
- Routes in `packages/server/src/routes/`, services in `packages/server/src/services/`
- Drizzle enum columns require `as TicketInsert['column']` casting
- File-first design: tickets/epics are `.md` files synced to SQLite

## Current Phase
Phase 1: Usable Wrapper (see `docs/roadmap/phase-1-usable-wrapper.md`)

## Key References
- `sentinel-guardrails.md` — Context architecture, agent governance, quality gates, anti-patterns
- `instruction-bloat-research.md` — Research on LLM instruction performance thresholds
- `agentic-dev-hub-spec.md` — Full product specification
