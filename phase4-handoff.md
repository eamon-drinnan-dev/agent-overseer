# Phase 4 Handoff — Steps 0–5 Complete

## What Was Done

### Step 0: Quick Cleanup
- Updated `CLAUDE.md` phase reference
- SDK iterator error handling wrapped in try-catch in `agent-executor.service.ts`

### Step 1: Shared Foundation (`@sentinel/shared`)
- **Enums**: `DEPENDENCY_TYPES`, `DependencyType`; `dispatch_plan` added to `ARTIFACT_TYPES`
- **Types**: `TicketDependency`, `TicketDependencyWithInfo`, `DispatchPlan`, `DispatchPlanGroup`, `DispatchPlanTicketBrief`, `DispatchPlanConflict`, `DispatchPlanDependency`
- **Updated types**: `AgentSession` (+`epicId`), `Project` (+`workspacePaths`), `Ticket` (+`repoPath`)
- **Schemas**: `createTicketDependencySchema`, `dispatchPlanSchema`, `planSprintSchema`
- All re-exported from `packages/shared/src/index.ts`

### Step 2: DB Schema Updates
- `ticket-dependencies` table (new): id, ticketId, dependsOnTicketId, dependencyType, createdAt, UNIQUE constraint
- `agent-sessions`: +epicId column (nullable)
- `projects`: +workspacePaths JSON column (default `[]`)
- `tickets`: +repoPath text column (nullable)
- **NOTE**: Migration file was NOT generated (`pnpm db:generate` not run). Next agent must run this.

### Step 3: Cross-Repo & Ticket Dependencies (spec 4.7)
- **`ticket-dependency.service.ts`**: CRUD + `checkBlocking()` (single-level cycle detection)
- **`ticket-dependencies.ts` routes**: POST/GET/DELETE on `/api/tickets/:id/dependencies`
- **Agent executor**: blocks session start if unmet `blocks` deps exist (409 error)
- **Context bundle**: injects `informs` dependency artifacts as Tier 2 context
- **Client**: `TicketDependencies` component on ticket detail, `use-ticket-dependencies.ts` hooks
- **Project settings**: `workspacePaths` field in settings page
- **Ticket form**: `repoPath` optional override field

### Step 4: Planning Agent & Dispatch Orchestrator (spec 4.8)
- **`conflict-detection.service.ts`**: Jaccard tag similarity (>0.3) + backtick file path overlap
- **`prompt-builder.service.ts`**: `buildPlanningPrompt(projectId, epicId)` with structured dispatch_plan artifact instructions
- **`agent-executor.service.ts`**: `startPlanningSession()` — runs planning prompt, captures + Zod-validates `dispatch_plan` artifact, transitions to `awaiting_review`
- **`dispatch-orchestrator.service.ts`**: group-by-group sequential execution, pause-on-failure, abort, in-memory dispatch tracking with 5min TTL
- **Epic routes**: `plan-sprint`, `dispatch`, `dispatch-status`, `dispatch-abort`, `plan` endpoints
- **Client**: `DispatchPlanReview` (groups, conflicts, approve/reject), `DispatchProgress` (live status, abort), `usePlanSprint` hook, "Plan Sprint" button on epic page

### Step 5: Git Integration (spec 4.1)
- **`git.service.ts`**: `simple-git` for branch ops, `gh` CLI for PR creation
- Branch naming: `<category>/tl-<shortId>-<slug>`
- PR body: ticket info, AC checklist, truncated execution summary
- **Executor integration**: creates branch before execution (best-effort), creates PR after successful completion
- **Client**: `GitInfo` component parses `[Git] Branch:` and `[Git] PR created:` markers from session output

---

## What Needs Doing Next

### Immediate: DB Migration
The schema files were updated but `pnpm db:generate && pnpm db:migrate` was NOT run. **Run this first.**

### Step 6: Validation Agent & Completion Summaries (spec 4.3 + 4.4)
1. Add `startValidationSession()` to `agent-executor.service.ts` (agentType='validation')
2. Validation checks: tests pass, patterns followed, AC met, self-review artifact
3. Result: Complete or Failed with feedback; failed → ticket back to "in_progress"
4. `execution_summary` artifact at end of successful execution (what was done, AC status, git info)
5. Client: validation status on ticket detail, re-trigger button

### Step 7: Pipeline Gates & Automated Transitions (spec 4.5 + 4.6 + 4.2)
1. Transition guards in ticket status update route (prerequisites: plan exists, tests pass, PR created, etc.)
2. Automated transitions: PR merged → "validation", validation passes → "complete"
3. GitHub webhook or polling integration for PR merge detection

---

## Known Issues & Gaps

| Issue | Severity | Location | Notes |
|-------|----------|----------|-------|
| Migration not generated | **P0** | DB schema | Must run `pnpm db:generate && pnpm db:migrate` before server starts |
| `as any` in session status cast | P2 | `dispatch-orchestrator.service.ts:208` | `'complete' as any` to bypass SessionStatus type |
| `_projectId` unused param | P3 | `conflict-detection.service.ts` | Prefixed to suppress lint; may be needed for workspace-scoped conflicts later |
| No validation of `simple-git` availability | P2 | `git.service.ts` | Will throw if git not installed; should degrade gracefully |
| No `gh` CLI availability check | P2 | `git.service.ts` | PR creation will fail silently if `gh` not installed/authed |
| Dispatch in-memory only | P2 | `dispatch-orchestrator.service.ts` | Active dispatches lost on server restart; no persistence layer |
| Planning prompt could exceed context window | P3 | `prompt-builder.service.ts` | Large projects with many tickets may hit token limits |
| GitInfo relies on string markers in output | P3 | `git-info.tsx` | Fragile — if executor log format changes, parsing breaks |

---

## Architecture Reference

```
Epic Detail Page
  ├── "Plan Sprint" → POST /api/epics/:epicId/plan-sprint
  │     └── Creates planning session (agentType='planning', epicId set)
  │         └── Executor runs buildPlanningPrompt(), captures dispatch_plan artifact
  │             └── Session → awaiting_review
  │
  ├── DispatchPlanReview component
  │     ├── Shows plan groups, conflicts, excluded tickets
  │     ├── "Approve & Dispatch" → POST /api/epics/:epicId/dispatch
  │     │     └── Orchestrator: applyPlanToDatabase() → executeGroup() sequentially
  │     │         └── Each ticket: create session → git branch → startSession() → PR on complete
  │     └── "Reject" → POST /api/agent-sessions/:id/review (reject)
  │
  └── DispatchProgress component
        ├── Polls GET /api/epics/:epicId/dispatch-status every 3s
        └── "Abort" → POST /api/epics/:epicId/dispatch-abort

Ticket Detail Page
  ├── TicketDependencies component (blocks/informs/conflicts)
  └── GitInfo component (branch name, PR link from session output)
```

---

## Verification Checklist

- [ ] `pnpm db:generate` — should create migration for ticket_dependencies + new columns
- [ ] `pnpm db:migrate` — migration applies cleanly
- [ ] `pnpm typecheck` — all 3 packages pass (was clean at commit time)
- [ ] `pnpm dev` — server starts, client loads
- [ ] Create a ticket dependency via API → verify blocking check in executor
- [ ] Set per-ticket repoPath → verify executor uses it as cwd
- [ ] Trigger "Plan Sprint" on an epic → verify planning session created
- [ ] Review dispatch plan artifact → approve → verify group-by-group dispatch starts
- [ ] Test abort dispatch → verify sessions are cancelled
