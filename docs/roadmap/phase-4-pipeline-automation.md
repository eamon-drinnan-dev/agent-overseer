# Phase 4: Pipeline Automation

**Goal**: Full pipeline automation with Git integration, automated status transitions, validation agent, and completion summaries.

**Timeframe**: Weeks 7-8

**Depends on**: Phase 3 complete

---

## Requirements

### 4.1 Git Integration
- [ ] Branch creation per ticket (naming: `<type>/tl-<id>-<slug>`)
- [ ] PR creation with structured body:
  - Linked ticket and Epic
  - Acceptance criteria checklist
  - Agent execution summary
- [ ] `simple-git` or GitHub API integration
- [ ] Branch cleanup after ticket completion

### 4.2 Automated Status Transitions
- [ ] PR created -> ticket moves to "In Review"
- [ ] PR merged -> ticket moves to "Validation"
- [ ] Webhook or polling for GitHub events
- [ ] Manual override still available

### 4.3 Validation Agent
- [ ] Separate validation agent reviews completed work
- [ ] Checks:
  - Tests pass
  - Architectural patterns followed (no drift)
  - Acceptance criteria met
  - Storybook stories exist for UI components
  - Self-review artifact exists
- [ ] Result: Complete or Failed with actionable feedback
- [ ] Failed tickets re-enter "In Progress" with feedback attached

### 4.4 Completion Summaries
- [ ] Structured summary generated per completed ticket
- [ ] Includes: what was done, AC status, architectural alignment, git info
- [ ] Summary stored as TicketArtifact (type: execution_summary)
- [ ] Visible in Ticket Detail View

### 4.5 Pipeline Gate Enforcement
- [ ] To Do -> In Progress: dependencies met, agent assigned
- [ ] In Progress -> In Review: plan artifact exists, execution complete, self-review done
- [ ] In Review -> Validation: tests pass, PR created, structured summary exists
- [ ] Validation -> Complete: validation agent/human approves
- [ ] Validation -> Failed: feedback attached

### 4.6 Non-Negotiable Gate Checks
- [ ] Tests must exist or be updated
- [ ] Storybook stories for UI components
- [ ] Plan artifact exists
- [ ] Self-review logged
- [ ] Acceptance criteria individually addressed
- [ ] No direct commits to main/develop

### 4.7 Cross-Repo / Workspace Support

**Problem**: `projects.repoPath` is a single string passed as agent `cwd`. No way to give a planning agent visibility across repos or dispatch execution agents to different repos within one project.

#### Schema Changes
- `projects.workspacePaths` — JSON column, array of additional repo paths the planning agent can read from
- `tickets.repoPath` — nullable, overrides project's `repoPath` for per-ticket repo targeting
- `ticket_dependencies` — new table: `id`, `ticketId`, `dependsOnTicketId`, `dependencyType` ('blocks'|'informs'|'conflicts'), unique constraint on pair

#### Requirements
- [ ] Add `workspacePaths` JSON column to `projects` table (default `[]`)
- [ ] Add per-ticket `repoPath` column to `tickets` table (nullable, overrides project default)
- [ ] Create `ticket_dependencies` table with unique constraint on (ticketId, dependsOnTicketId)
- [ ] `ticket-dependency.service.ts`: CRUD + `checkBlocking(ticketId)` + single-level cycle detection
- [ ] Executor: check blocking deps before `startSession()` — reject 409 if unmet
- [ ] Executor: resolve `ticket.repoPath ?? project.repoPath` for agent `cwd`
- [ ] Context bundle: inject artifacts from `informs` dependencies as Tier 2 context
  - e.g., backend `execution_summary` flows into frontend ticket's bundle
  - Falls back to same-epic sibling heuristic when no explicit deps exist
- [ ] API routes: `POST/GET/DELETE /api/tickets/:id/dependencies`
- [ ] Shared package: `DependencyType` enum, `TicketDependency` type, `createTicketDependencySchema`
- [ ] Client: dependency section on Ticket Detail page (add/remove, blocking status indicator)

#### Cross-Repo Execution Flow
```
Planning Agent (cwd = workspace root, sees all repos)
  → Produces dispatch plan with per-ticket repoPath assignments
  → Backend ticket: repoPath = "E:/Dev/backend"
  → Frontend ticket: repoPath = "E:/Dev/frontend", depends on backend (blocks)

Dispatch Orchestrator:
  → Group 1: Backend ticket runs in backend repo
  → Group 1 completes → execution_summary artifact captured
  → Group 2: Frontend ticket runs in frontend repo
     Context bundle includes backend's execution_summary via 'informs' dependency
```

### 4.8 Planning Agent Orchestration

**Problem**: The user manually assesses ticket batches for ordering, conflicts, and scoped briefs before dispatching agents. The `agentType='planning'` exists in the enum but has no implementation.

#### Schema Changes
- `agent_sessions.epicId` — nullable FK to epics, for planning sessions (ticketId=null)
- `ticket_artifacts.epicId` — nullable, for epic-level artifacts like dispatch plans
- `ticket_artifacts.type` enum — add `dispatch_plan`

#### Dispatch Plan Artifact Structure (JSON)
```
DispatchPlan {
  version: 1
  epicId: string
  generatedAt: ISO timestamp
  summary: string (planning rationale)
  groups: DispatchPlanGroup[]
  dependencies: DispatchPlanDependency[]
  conflicts: DispatchPlanConflict[]
  totalTickets: number
  excluded: Array<{ ticketId, reason }>
}

DispatchPlanGroup {
  groupIndex: number (1-indexed)
  label: string (e.g., "Backend API contracts")
  tickets: DispatchPlanTicketBrief[]
  dependsOnGroups: number[]
}

DispatchPlanTicketBrief {
  ticketId, title, repoPath (nullable cross-repo override),
  agentBrief (scoped constraints), model (nullable override),
  complexity: 'low' | 'medium' | 'high'
}

DispatchPlanConflict {
  ticketIdA, ticketIdB, reason, severity: 'low' | 'medium' | 'high'
}

DispatchPlanDependency {
  ticketId, dependsOnTicketId, reason, type: 'blocks' | 'informs'
}
```

#### Requirements

**Planning Agent**
- [ ] Add `dispatch_plan` to `ArtifactType` enum and `ticketArtifacts.type` column enum
- [ ] Add `epicId` column (nullable) to `agent_sessions` and `ticket_artifacts` tables
- [ ] Create `docs/agents/planning-agent-orchestration.md` (structured agent instructions)
- [ ] `buildPlanningPrompt()` in prompt-builder: loads all candidate tickets, their patterns, pre-computed conflicts, workspace paths, existing dependencies
- [ ] `startPlanningSession()` in executor: agentType='planning', epicId set, ticketId=null
- [ ] Captured `dispatch_plan` artifact validated with Zod; invalid structure = session fails

**Conflict Detection**
- [ ] `conflict-detection.service.ts`: `detectConflicts(projectId, ticketIds)`
- [ ] Pattern overlap: Jaccard > 0.3 between two tickets' matched pattern sets = conflict flag
- [ ] File path extraction: regex for backtick-wrapped paths in ticket body/AC, check overlap
- [ ] Returns `ConflictPair[]` as advisory input to the planning agent (supplements, not replaces agent analysis)

**Dispatch Orchestrator**
- [ ] `dispatch-orchestrator.service.ts`: group-by-group execution
- [ ] After approval: creates `ticket_dependencies` from plan, sets `ticket.repoPath` per plan
- [ ] Group N+1 waits for all group N sessions to reach terminal state
- [ ] On any ticket failure: pause dispatch, notify user via WS
- [ ] User actions on pause: skip failed ticket / retry / abort entire dispatch
- [ ] `WsDispatchProgressEvent` for real-time UI updates

**API Routes**
- [ ] `POST /api/epics/:epicId/plan-sprint` — trigger planning agent (202)
- [ ] `POST /api/epics/:epicId/dispatch` — execute approved dispatch plan (202)
- [ ] `GET /api/epics/:epicId/dispatch-status` — current dispatch state

**Client UI**
- [ ] "Plan Sprint" button on Epic detail page
- [ ] Dispatch plan review panel (groups visualization, conflict warnings, per-ticket briefs)
- [ ] "Approve & Dispatch" / "Reject" actions
- [ ] Dispatch progress: group-by-group with per-ticket status badges
- [ ] Failure handling: skip/retry/abort controls

#### Orchestration Flow
```
User clicks "Plan Sprint" on epic
  → POST /api/epics/:epicId/plan-sprint (202)
  → Planning Agent reads all candidate tickets + patterns + conflicts
  → Produces dispatch_plan artifact (structured JSON)
  → Session → awaiting_review

User reviews dispatch plan in UI
  → Sees groups, dependencies, conflicts, per-ticket briefs
  → Approves → POST /api/epics/:epicId/dispatch

Dispatch Orchestrator
  → Creates ticket_dependencies from plan
  → Sets ticket.repoPath from plan's per-ticket assignments
  → Deploys Group 1 tickets concurrently
  → Waits for Group 1 terminal → deploys Group 2
  → On failure: pauses, notifies user (skip/retry/abort)
  → All groups complete → epic dispatch complete
```

#### Design Decisions
- **Dispatch plan as artifact, not table** — reuses ticket_artifacts; avoids new CRUD surface
- **Planning session links to epic, not ticket** — only agent type at epic level; ticketId=null
- **Per-ticket repoPath override** — avoids complex multi-project model; set from dispatch plan
- **Conflict detection is advisory** — agent receives data; user approves final grouping
- **Pause-on-failure** — no auto-recovery; user decides (solo engineer in the loop)
- **Dependencies are lightweight** — single-level cycle check, status query; no graph traversal

---

## Combined Migration (0004)
All 4.7 + 4.8 schema changes in a single migration:
1. `ALTER TABLE projects ADD workspace_paths text DEFAULT '[]' NOT NULL`
2. `ALTER TABLE tickets ADD repo_path text`
3. `CREATE TABLE ticket_dependencies (...)`
4. `ALTER TABLE agent_sessions ADD epic_id text REFERENCES epics(id)`
5. `ALTER TABLE ticket_artifacts ADD epic_id text`
6. Update `ticket_artifacts.type` enum to include `dispatch_plan`

## Implementation Order
1. Shared foundation — enums, types, Zod schemas
2. DB migration 0004
3. Ticket dependencies — service, routes, executor blocking check
4. Cross-repo support — workspacePaths, per-ticket repoPath
5. Conflict detection service
6. Planning agent prompt + instructions doc
7. Planning agent execution path in executor
8. Dispatch orchestrator service + routes
9. Client UI — dependencies, plan sprint, dispatch review, progress

---

## Post-MVP (Future)
- Sprint dashboard with burndown/throughput metrics
- Multi-agent concurrency with token budget management
- Pattern registry auto-generation via codebase scanning
- Agent performance analytics
- Agent memory across sessions
- Desktop notifications for agent completion/failure
