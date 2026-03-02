# Agentic Development Hub — Product Specification

## Working Name: **Sentinel** (or TBD)

*A semi-automated, AI-first project management platform designed for solo engineers orchestrating multiple LLM agents across a single codebase.*

---

## 1. Problem Statement

Modern agentic development (Claude Code, Cursor, etc.) is powerful but operationally chaotic for a solo engineer managing a complex project:

- **Context fragmentation**: Planning happens in Claude.ai, execution in VSCode terminals, tracking in mental models or scattered markdown files.
- **No pipeline visibility**: Agent work is invisible until it's done or broken. There's no Jira-like flow showing tickets moving through stages.
- **Vertical context blindness**: Agents consistently handle horizontal context (state → component) but fail to reference analogous existing implementations, causing architectural drift.
- **Manual orchestration overhead**: Every agent session requires spinning up context, pointing to docs, enforcing Plan mode, reviewing output — multiplied by N concurrent agents.
- **No enforced discipline**: Agents skip tests, forget Storybook, ignore patterns — unless explicitly told every time.

### Goal

Replace the multi-tab, multi-terminal, multi-conversation workflow with a single platform where:
1. Planning is done rigorously upfront (Epics, tickets, acceptance criteria)
2. Agents self-select and execute tickets with full context injection
3. Workflow discipline is enforced architecturally, not by reminder
4. Progress is visible in a clean, animated pipeline view
5. The engineer's role shifts from micro-manager to strategic overseer

---

## 2. Core Concepts

### 2.1 Hierarchy

```
Project
  └── Epic (major milestone, carries criticality level)
        └── Ticket (unit of work, inherits Epic criticality)
              └── Subtask (optional decomposition)
```

### 2.2 Ticket Categories (Buckets)

Each ticket belongs to exactly one category:

| Category | Description | Icon |
|----------|-------------|------|
| **Feature** | New functionality or capability | 🟢 |
| **Tech Debt** | Refactoring, cleanup, structural improvements | 🔵 |
| **Papercut & Polish** | UI tweaks, spacing, copy, minor UX fixes | 🟡 |
| **Bug** | Broken behavior, regressions | 🔴 |
| **Infrastructure** | CI/CD, tooling, config, dependencies | ⚙️ |
| **Documentation** | Docs, ADRs, README updates | 📄 |

### 2.3 Ticket Lifecycle (Pipeline)

```
To Do → In Progress → In Review → Validation → Complete
                                      ↓
                                   Failed → In Progress (re-enter)
```

Each transition is gated by enforceable conditions (see §5).

### 2.4 Criticality Levels

Set at the Epic level, inherited by all child tickets. Affects agent behavior:

| Level | Meaning | Agent Behavior |
|-------|---------|---------------|
| **Critical** | Core functionality, demo-path, architectural | Full plan review, multi-agent validation, comprehensive tests, human review gate |
| **Standard** | Important but lower-risk work | Plan review, single-agent validation, standard test coverage |
| **Minor** | Low-risk polish, docs, small fixes | Abbreviated plan, self-validation permitted, minimal test additions |

The user can override criticality at the individual ticket level.

---

## 3. Rolling Context System

This is the core differentiator. Agents receive structured context bundles, not just task descriptions.

### 3.1 Context Bundle Structure

When an agent picks up a ticket, it receives:

```yaml
ticket_context:
  # The ticket itself
  ticket: TL-142.md
  acceptance_criteria: [...]
  category: feature
  criticality: critical

  # Vertical context (CRITICAL)
  parent_epic: EPIC-012.md        # Full Epic description + goals
  related_patterns:                # Similar existing implementations
    - src/components/ZoneCard.tsx  # "Build EntityCard similar to this"
    - src/hooks/useZoneLifecycle.ts
  architectural_standards:
    - docs/architecture/component-patterns.md
    - docs/architecture/state-management.md

  # Horizontal context
  dependencies:                    # Tickets this depends on
    - TL-140: "Zone state machine (COMPLETE)"
    - TL-141: "Entity type registry (IN PROGRESS)"
  dependents:                      # Tickets that depend on this
    - TL-145: "Zone-entity intersection UI"

  # Project context
  active_sprint_summary: sprint-03-summary.md
  project_guidelines: CLAUDE.md
  agent_instructions: docs/agents/development-agent.md

  # Git context
  target_branch: develop
  base_branch: feature/epic-012-zone-lifecycle
```

### 3.2 Vertical Context Resolution

The platform maintains a **Pattern Registry** — a lightweight index of components, hooks, utilities, and their architectural role:

```yaml
# Auto-generated and manually curated
patterns:
  - path: src/components/ZoneCard/ZoneCard.tsx
    type: component
    pattern: card-with-lifecycle-state
    tags: [zone, card, lifecycle, state-machine]
    
  - path: src/hooks/useEntityTracking.ts
    type: hook
    pattern: real-time-subscription-hook
    tags: [entity, telemetry, subscription]
```

When a ticket involves building a new component, the platform queries this registry for analogous implementations and injects them as `related_patterns`. This solves the vertical context problem — agents see *how we've already built similar things*.

### 3.3 Context Window Management

**Hard rule**: A ticket's total context bundle must fit within a target token budget (configurable, default ~80K tokens). If a ticket's scope would exceed this:

1. The platform flags it during planning
2. Suggests decomposition into subtasks or linked tickets
3. Each sub-ticket gets a focused context slice

The platform tracks estimated token counts for each context component and warns when bundles approach limits.

---

## 4. Agent Orchestration

### 4.1 Agent Deployment Flow

```
User clicks "Deploy Agent" on an Epic or Sprint
  → Platform identifies eligible tickets (dependencies met, not blocked)
  → Agent receives context bundle for highest-priority eligible ticket
  → Agent enters PLAN phase (mandatory)
  → Plan is logged and optionally reviewed (based on criticality)
  → Agent enters EXECUTE phase
  → Agent enters REVIEW phase (self-review of own output)
  → Agent enters TEST phase (run tests, create missing ones)
  → Ticket moves to Validation
  → Validation agent (or human) reviews
  → Complete or Failed (with feedback for re-entry)
```

### 4.2 Mandatory Agent Workflow

Every agent, every ticket, no exceptions:

```
┌─────────────────────────────────────────────────────────┐
│ PHASE 1: PLAN                                           │
│  - Read full context bundle                             │
│  - Review related_patterns for architectural alignment  │
│  - Produce a written plan (stored as artifact)          │
│  - Identify files to create/modify                      │
│  - Identify tests to create/update                      │
│  - Identify Storybook stories to create/update          │
│  - Flag any concerns or ambiguities                     │
├─────────────────────────────────────────────────────────┤
│ GATE: Plan review (auto-approve for Minor, human for    │
│       Critical, configurable for Standard)              │
├─────────────────────────────────────────────────────────┤
│ PHASE 2: EXECUTE                                        │
│  - Implement according to plan                          │
│  - Follow architectural standards from context          │
│  - Match patterns from related_patterns                 │
│  - Create/update tests                                  │
│  - Create/update Storybook stories (if UI)              │
├─────────────────────────────────────────────────────────┤
│ PHASE 3: SELF-REVIEW                                    │
│  - Diff review of all changes                           │
│  - Verify acceptance criteria are met                   │
│  - Verify test coverage                                 │
│  - Verify no architectural drift from patterns          │
│  - Produce execution summary artifact                   │
├─────────────────────────────────────────────────────────┤
│ PHASE 4: SUBMIT                                         │
│  - Create PR with structured description                │
│  - Link to ticket, Epic, and acceptance criteria        │
│  - Ticket moves to "In Review"                          │
├─────────────────────────────────────────────────────────┤
│ PHASE 5: VALIDATION                                     │
│  - Separate validation agent (or human) reviews         │
│  - Checks: tests pass, patterns followed, no drift,    │
│    acceptance criteria met, Storybook exists             │
│  - Result: Complete or Failed (with actionable feedback) │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Agent Types

| Agent | Role | When Used |
|-------|------|-----------|
| **Development Agent** | Executes tickets through the full pipeline | Primary workhorse |
| **Triage Agent** | Reviews backlog, suggests priority, decomposes large tickets | On-demand or scheduled |
| **Validation Agent** | Reviews completed work for quality, drift, standards | Post-execution |
| **Planning Agent** | Synthesizes sprint goals, generates ticket details from Epics, produces dispatch plans with conflict detection and group sequencing for multi-agent orchestration | Sprint planning phase, pre-dispatch |

### 4.4 Agent Output Format

Every completed ticket produces a structured summary:

```markdown
## Ticket TL-142: Zone Lifecycle State Display

**Status**: Complete
**Agent**: dev-agent-session-abc123
**Duration**: 12 min (Plan: 3m, Execute: 7m, Review: 2m)
**Token Usage**: ~45K input, ~12K output

### What was done
- Created `ZoneLifecycleIndicator.tsx` — displays zone state with animated transitions
- Created `ZoneLifecycleIndicator.stories.tsx` — 4 stories covering all lifecycle states
- Updated `ZoneCard.tsx` — integrated lifecycle indicator
- Created `useZoneLifecycleState.test.ts` — 8 test cases

### Acceptance Criteria Status
- [x] Zone state is visible on zone cards
- [x] Transitions animate smoothly (matched EntityStatusBadge pattern)
- [x] All lifecycle states have distinct visual treatment
- [x] Storybook stories cover all states

### Architectural Alignment
- Followed `ZoneCard` component structure per pattern registry
- Used existing `useLifecycleState` hook pattern from entity system
- No new dependencies introduced

### Git
- Branch: `feature/tl-142-zone-lifecycle-display`
- PR: #47
- Commits: 3
```

### 4.5 Agent Permission & Autonomy

Sentinel uses `bypassPermissions: true` when spawning Claude Code via the Agent SDK. Tool-level permission prompts are disabled — Sentinel's governance layer is the permission authority.

**Permission flow:**

1. User deploys agent to a ticket via the UI
2. Sentinel resolves the ticket's criticality (explicit override or inherited from epic)
3. Criticality determines the permission profile:
   - **low/medium**: Agent runs autonomously. Medium requires a plan artifact (logged, not gated).
   - **high/critical**: Agent produces a plan, Sentinel pauses the session, user approves/rejects via the Review Plan dialog before execution proceeds.
4. Agent executes within the project's repo directory (`cwd` set to repo root)
5. Post-execution: Sentinel captures artifacts, runs pipeline gate checks, records the session

**Bash command policy** (advisory, included in agent context bundle):

- *Always safe*: `cat`, `ls`, `grep`, `find`, `git status/diff/log`
- *Usually safe*: `npm run test/build/lint`, `tsc --noEmit`, `pnpm install`
- *Gated*: `git commit`, `git push`, `git checkout -b` — subject to criticality rules
- *Blocked*: `rm -rf`, `git push --force`, `curl | sh`, network calls to external services

**Phase-based scoping**: Planning = read-only, Execution = read/write, Review = read-only. Phase tracked in the agent session record.

See `sentinel-guardrails.md` Section 3.4 for the full permission model specification.

---

## 5. Pipeline Gates

### Transition Rules

| Transition | Gate |
|-----------|------|
| To Do → In Progress | Dependencies met, agent assigned |
| In Progress → In Review | Plan artifact exists, execution complete, self-review complete |
| In Review → Validation | Tests pass, PR created, structured summary exists |
| Validation → Complete | Validation agent/human approves |
| Validation → Failed | Feedback attached, ticket re-enters In Progress |

### Non-Negotiable Requirements (enforced at gates)

1. **Tests must exist or be updated** — no ticket completes without test verification
2. **Storybook stories must exist for UI components** — gate check for any ticket touching `src/components/`
3. **Plan artifact must exist** — no execution without a logged plan
4. **Self-review must be logged** — agent must review its own diff before submission
5. **Acceptance criteria must be individually addressed** — each criterion marked pass/fail
6. **No direct commits to main/develop** — all work via PR from feature branch

---

## 6. User Interface

### 6.1 Views

**Board View** (primary)
- Kanban columns: To Do | In Progress | In Review | Validation | Complete
- Tickets as cards with: title, category icon, criticality badge, assigned agent indicator
- Animated transitions as tickets move between columns
- Filterable by: Epic, category, criticality, agent

**Epic View**
- Expanded view of a single Epic
- Progress bar showing ticket completion
- Sprint timeline
- "Deploy Agent" button — kicks off agent assignment for eligible tickets
- Criticality control with propagation preview

**Ticket Detail View**
- Full ticket content (rendered markdown)
- Acceptance criteria checklist
- Context bundle preview (what the agent will see)
- Agent activity log (plan, execution, review artifacts)
- Git integration (branch, PR, commits)
- Status history with timestamps

**Agent Terminal View**
- Live output from active agent sessions
- Collapsible/expandable per agent
- Status indicator: Planning | Executing | Reviewing | Idle
- Token usage meter

**Sprint Dashboard**
- Current sprint overview
- Burndown or throughput metrics
- Category breakdown (how much tech debt vs. features this sprint)
- Agent utilization summary

### 6.2 User Controls

- **Criticality override**: Per-ticket override of inherited Epic criticality
- **Review gate toggle**: "I want to review plans for this Epic" / "Auto-approve plans"
- **Agent concurrency**: Max simultaneous agents (token budget management)
- **Pause/Resume**: Halt all agent work, resume with context preserved
- **Manual ticket creation**: Standard form with markdown body, acceptance criteria, category

---

## 7. Technical Architecture

### 7.1 Stack (Proposed)

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + TypeScript | Matches Tiger Lily stack, reuse patterns |
| State Management | Zustand or Redux Toolkit | Real-time pipeline state |
| UI Framework | Tailwind + shadcn/ui | Fast, professional, consistent |
| Backend | Node.js (Express or Fastify) | Lightweight, good Claude SDK support |
| Database | SQLite (local-first) | No server dependency, portable, fast |
| Git Integration | `simple-git` or GitHub API | Branch/PR management |
| AI Integration | Anthropic Claude API | Agent orchestration |
| Agent Execution | Claude Code CLI (subprocess) | Actual code execution in repo |
| Real-time | WebSocket or SSE | Live agent output streaming |

### 7.2 Data Model (Core)

```
Project
  ├── id, name, repo_path, claude_md_path
  │
  ├── Epic
  │     ├── id, title, description_md, criticality
  │     ├── sprint_id, status, progress_pct
  │     │
  │     └── Ticket
  │           ├── id, title, body_md, category, criticality_override
  │           ├── status, assigned_agent_id, parent_epic_id
  │           ├── acceptance_criteria (JSON array)
  │           ├── context_bundle (computed)
  │           ├── estimated_tokens
  │           │
  │           └── TicketArtifact
  │                 ├── type: plan | execution_summary | review | validation
  │                 ├── content_md
  │                 └── agent_session_id, timestamp
  │
  ├── Sprint
  │     ├── id, name, start_date, end_date
  │     └── goal_md
  │
  ├── PatternRegistry
  │     ├── path, type, pattern_name, tags
  │     └── last_updated
  │
  └── AgentSession
        ├── id, ticket_id, agent_type, status
        ├── started_at, completed_at
        ├── token_usage_input, token_usage_output
        └── output_log
```

### 7.3 File-First Design

Critical principle: **everything is also a file.** The database is the index, but:
- Tickets are `.md` files in `docs/tickets/`
- Epics are `.md` files in `docs/epics/`
- Plans and reviews are `.md` files in `docs/artifacts/`
- The pattern registry is a `.yaml` file
- Agent instructions are `.md` files

This means agents can always read context directly from the filesystem. The platform is an orchestration layer *on top of* files, not a replacement for them. If the platform is down, all content is still accessible and version-controlled.

---

## 8. Integration Points

### 8.1 Claude API

- **Planning Agent**: Uses Claude API for ticket decomposition, sprint planning, triage
- **Context bundle generation**: Claude summarizes large files to fit token budgets
- **Validation Agent**: Uses Claude API to review PRs against acceptance criteria

### 8.2 Claude Code CLI

- **Development Agent execution**: Spawns Claude Code subprocess with:
  - Pre-injected context bundle as initial prompt
  - Working directory set to project repo
  - Plan mode enforced via prompt structure
  - Output streamed to Agent Terminal View
- **Command**: Essentially `claude --context-file <bundle.md> --working-dir <repo>`

### 8.3 GitHub

- Branch creation per ticket (naming: `<type>/tl-<id>-<slug>`)
- PR creation with structured body (acceptance criteria, summary, linked ticket)
- Status sync: PR merged → ticket to Validation
- Issue sync (optional): tickets mirrored as GitHub Issues for external visibility

---

## 9. MVP Scope (Build This First)

### Phase 1: Usable Wrapper (Week 1-2)

The goal is to replace the multi-tab chaos with something you actually use daily:

- [ ] Local web app (React + SQLite)
- [ ] Board view with drag-and-drop status changes
- [ ] Ticket CRUD with markdown editing
- [ ] Epic hierarchy with criticality levels
- [ ] Category buckets with filtering
- [ ] File-first: tickets stored as `.md`, synced to DB
- [ ] Import existing `docs/tickets/` folder from Tiger Lily

### Phase 2: Context Engine (Week 3-4)

- [ ] Pattern registry (manually curated initially, auto-scan later)
- [ ] Context bundle generation per ticket
- [ ] Token estimation and budget warnings
- [ ] Vertical context injection (related patterns)

### Phase 3: Agent Integration (Week 5-6)

- [ ] "Deploy Agent" button that spawns Claude Code with context
- [ ] Agent output streaming to terminal view
- [ ] Plan artifact capture and display
- [ ] Basic gate enforcement (plan exists before execute)

### Phase 4: Pipeline Automation (Week 7-8)

- [ ] Git integration (branch/PR creation)
- [ ] Automated status transitions on Git events
- [ ] Validation agent
- [ ] Completion summaries
- [ ] Cross-repo / workspace support (workspacePaths, per-ticket repoPath, ticket dependencies)
- [ ] Planning agent orchestration (dispatch plans, conflict detection, group sequencing)
- [ ] Dispatch orchestrator (group-by-group execution, pause-on-failure)

### Post-MVP
- [ ] Sprint dashboard with metrics
- [ ] Multi-agent concurrency with token budget management
- [ ] Pattern registry auto-generation via codebase scanning
- [ ] Agent performance analytics (which tickets fail validation, common drift patterns)

---

## 10. Open Questions

1. **Naming**: Sentinel? Forge? Something that communicates "AI-first project management"?
2. **Deployment model**: Electron app vs. local web server vs. hosted? Local-first seems right for a solo engineer with a single project.
3. **Agent memory across sessions**: Should completed ticket summaries feed into future context bundles? (Probably yes, with token budget management.)
4. **Claude Code API stability**: Claude Code CLI is evolving. Need to assess current subprocess API and plan for changes.
5. **Multi-project support**: Spec assumes single project. Is this always the case?
6. **Notification model**: How do you want to be notified when agents complete or fail? Desktop notifications? Dashboard polling?

---

## 11. Strategic Notes

### Relationship to Tiger Lily

This tool is built to accelerate Tiger Lily development. Tiger Lily is project #1. The hub is infrastructure. If it takes more than 2 weeks to reach Phase 1, it's costing more than it saves.

### Potential as a Product

The "AI-first project management for agentic development" space is nascent. If this works well for you, it works well for every solo engineer or small team using Claude Code, Cursor, or similar tools. Worth keeping an eye on, but don't let it become a distraction from the primary mission.

### Dogfooding

Once Phase 1 is live, Tiger Lily development should run through it. Every Tiger Lily ticket, every sprint, every agent session. That's both the validation and the discipline.
