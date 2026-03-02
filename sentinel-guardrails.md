# Sentinel — Architectural Guardrails & Agent Governance

## Document Purpose

This document defines the architectural principles, context management strategies, and agent governance rules for the Sentinel platform. It is informed by current research on LLM context performance, Anthropic's official best practices for Claude Code, and engineering management principles from high-performing teams.

These are the rules of the house. Agents and humans alike operate within these boundaries.

---

## 1. The Context Paradox — What the Research Says

### The Core Finding

**More instructions ≠ better performance. The research confirms your instinct, Eamon.**

Key findings that directly shape Sentinel's architecture:

- **Reasoning degrades at ~3,000 tokens of instruction**, well before context limits are hit. A well-structured 16K prompt with targeted retrieval outperforms a monolithic 128K prompt in both accuracy and relevance.
- **"Lost in the middle" effect**: LLMs retrieve best from the beginning and end of long inputs. Critical information buried in the middle gets undervalued or ignored.
- **Irrelevant context is worse than no context**: LLMs can often *identify* irrelevant information but struggle to *ignore* it during generation. Semantically similar but irrelevant content is the worst offender — it's close enough to confuse the model.
- **Frontier thinking models can follow ~150-200 instructions** with reasonable consistency. Beyond that, instruction-following quality decreases uniformly. Smaller models degrade exponentially.
- **Claude Code's own docs confirm this**: "Bloated CLAUDE.md files cause Claude to ignore your actual instructions." Anthropic's guidance is explicitly < 300 lines for CLAUDE.md, with community consensus at < 150 lines.

### What This Means for Sentinel

The platform's context engine must be a **precision instrument, not a firehose**. The goal is to deliver the *minimum effective context* for each ticket — enough that the agent doesn't make wrong assumptions, little enough that it doesn't drown.

---

## 2. Context Architecture — Progressive Disclosure, Not Monolithic Dumps

### 2.1 The Layered Context Model

Sentinel uses a three-tier context system inspired by Anthropic's own progressive disclosure pattern:

```
Tier 1: ALWAYS LOADED (< 150 lines, ~2K tokens)
  └── Project identity, non-negotiable rules, critical commands
  └── Equivalent to CLAUDE.md — universally applicable, every session

Tier 2: TICKET-SCOPED (loaded per-ticket, ~4-8K tokens)
  └── The ticket itself + acceptance criteria
  └── Parent Epic summary (not full Epic, just goals + constraints)
  └── 1-2 vertical context references (similar implementations)
  └── Active architectural constraints relevant to this ticket

Tier 3: ON-DEMAND (agent pulls when needed, linked not embedded)
  └── Full component source files
  └── Test files for reference
  └── Detailed architectural docs
  └── Sprint context, historical decisions
```

**Critical rule**: Tier 1 + Tier 2 combined should target **< 15K tokens**. This leaves ~185K tokens (on 200K window) for the agent's actual work — reading files, writing code, running tests, iterating. On a future 1M window, this ratio only improves.

### 2.2 What Goes in Each Tier

**Tier 1 — The CLAUDE.md (universal, every session)**

Only include things the agent would get *wrong without*. Apply the Anthropic test: "Would removing this cause Claude to make mistakes?" If no, cut it.

```markdown
# Project: Tiger Lily
# Stack: React 18 + TypeScript + Zustand + Tailwind + Mapbox GL

## Commands
- `npm run dev` — start dev server
- `npm run test` — run vitest
- `npm run test:watch` — watch mode
- `npm run lint` — eslint + prettier check
- `npm run storybook` — launch storybook on :6006

## Non-Negotiable Rules
- TypeScript strict mode. No `any` without explicit justification comment.
- Functional components only. No class components.
- State via Zustand stores in `src/stores/`. No prop drilling beyond 2 levels.
- All components in `src/components/` require co-located test + story files.
- Naming: PascalCase components, camelCase hooks/utils, kebab-case files.
- Imports: absolute paths via `@/` alias. No relative `../../` beyond one level.

## Architecture Quick Reference
- See `docs/architecture/` for detailed patterns (load when relevant)
- See `docs/patterns/registry.yaml` for component pattern index
- Entity types: `src/types/entities/` — extensible via registry
- Zone system: `src/features/zones/` — lifecycle state machine pattern

## Git
- Branch naming: `<type>/tl-<id>-<slug>` (e.g., `feature/tl-142-zone-lifecycle`)
- Commit messages: `<type>(tl-<id>): <description>`
- Never commit directly to main or develop
```

That's ~40 lines. It covers what the agent needs to not make structural mistakes. Everything else is progressive disclosure.

**Tier 2 — The Ticket Context Bundle**

Generated per-ticket by Sentinel. This is the key differentiator:

```markdown
## Ticket: TL-142 — Zone Lifecycle State Display
Category: Feature | Criticality: Critical | Epic: EPIC-012

### Objective
Display zone lifecycle state on zone cards with animated transitions.

### Acceptance Criteria
- [ ] Zone state is visible on zone cards
- [ ] Transitions animate between states
- [ ] All lifecycle states have distinct visual treatment
- [ ] Storybook stories cover all states

### Vertical Context
Build this following the pattern in `src/components/EntityStatusBadge/`.
That component shows entity state with animated transitions — apply the
same structural approach for zone state.

Also reference `src/hooks/useEntityLifecycle.ts` for the hook pattern.

### Dependencies
- TL-140 (Zone state machine) — COMPLETE
- TL-141 (Entity type registry) — COMPLETE

### Constraints
- Must use existing `LifecycleState` enum from `src/types/lifecycle.ts`
- Animation library: framer-motion (already in project)

### For detailed architecture: see `docs/architecture/zone-system.md`
### For full Epic context: see `docs/epics/EPIC-012.md`
```

Note what this does NOT include: the full source of EntityStatusBadge, the full Epic document, the full architecture doc. It *tells the agent where to look* and *why*, so the agent loads those files into context only when it's actively working on the relevant part. This is progressive disclosure.

**Tier 3 — On-Demand References**

The agent reads these as needed during execution. They're never pre-loaded:

- Source files the agent needs to read/modify
- Test files for reference patterns
- Storybook stories for reference patterns
- Full architectural documentation
- Historical ticket summaries

### 2.3 Token Budget Enforcement

Sentinel tracks estimated token counts:

| Component | Target | Hard Limit |
|-----------|--------|------------|
| Tier 1 (CLAUDE.md) | < 2K tokens | 3K tokens |
| Tier 2 (ticket bundle) | < 8K tokens | 12K tokens |
| Combined pre-load | < 10K tokens | 15K tokens |
| Reserved for agent work | ~185K tokens | — |

If a ticket's Tier 2 bundle exceeds 12K tokens, Sentinel flags it and suggests decomposition.

**Future-proofing for 1M context**: The ratios stay the same. A 1M window means ~985K for agent work, not "stuff 10x more instructions in Tier 1." The research is clear: more instructions = worse performance regardless of window size. Larger windows help agents read more *source code* and maintain longer *working memory*, not absorb longer instruction sets.

---

## 3. Agent Workflow Governance

### 3.1 The Mandatory Pipeline

Every ticket, every agent, no exceptions. But the *depth* of each phase scales with criticality.

```
PLAN → GATE → EXECUTE → SELF-REVIEW → SUBMIT → VALIDATE
```

**Phase details by criticality:**

| Phase | Critical | Standard | Minor |
|-------|----------|----------|-------|
| **Plan** | Written plan, list all files to touch, identify tests + stories, flag risks | Written plan, list files + tests | Brief plan in agent log |
| **Gate** | Human reviews plan before execution | Auto-approve, plan logged | Auto-approve |
| **Execute** | Full implementation per plan | Full implementation | Implementation |
| **Self-Review** | Diff review, acceptance criteria check, pattern compliance check | Diff review, acceptance criteria | Quick acceptance check |
| **Submit** | PR with structured body, all criteria addressed | PR with summary | PR with summary |
| **Validate** | Separate validation agent + human review | Validation agent | Self-validation OK |

### 3.2 The Four Rules That Are Always Enforced

These are non-negotiable gates. A ticket cannot move past Submit without all four:

1. **Tests exist or were updated.** If the ticket touches code in `src/`, there must be corresponding test changes. New files require new tests.

2. **Stories exist for UI components.** If the ticket touches files in `src/components/`, Storybook stories must exist or be created. This is a filesystem gate — Sentinel checks for `.stories.tsx` co-located with the component.

3. **No unapproved new dependencies.** `package.json` changes require human approval regardless of criticality level.

4. **Acceptance criteria are individually addressed.** The agent's completion summary must address each criterion with pass/fail. No blanket "all criteria met."

### 3.3 Agent Behavioral Rules

These go in the ticket context bundle (Tier 2), not in CLAUDE.md. They're workflow instructions, not project identity:

```markdown
## Agent Workflow (follow in order)

1. PLAN FIRST. Read this entire ticket bundle before writing any code.
   Review the vertical context references to understand existing patterns.
   Produce a brief plan: what files to create/modify, what tests to write,
   what stories to add. If anything is unclear, flag it — do not guess.

2. HORIZONTAL AUDIT. If the context bundle includes a peer group convention:
   - Read at least one peer member file to verify the convention in practice
   - Check your plan for consistency with the convention summary
   - Note in your plan any conventions you'll follow and any you'll flag
   - If you find existing peers violate the convention, note it — don't fix it

3. EXECUTE per plan. Match the patterns shown in vertical context and
   the conventions documented in any peer group summaries.
   If you find yourself diverging significantly from the referenced pattern,
   stop and note why in your execution log.

4. SELF-REVIEW. After implementation:
   - Run tests (`npm run test`)
   - Check each acceptance criterion individually
   - Review your diff for pattern consistency with vertical context
   - If a peer group was referenced, verify your code matches the convention
   - Note any concerns or deviations

5. SUBMIT. Create a structured summary with:
   - Files created/modified
   - Tests created/modified
   - Stories created/modified (if applicable)
   - Acceptance criteria status (each one, pass/fail)
   - Peer group conventions followed (if applicable)
   - Any flags or concerns
```

This is ~25 lines. Concise, sequential, actionable. No prose, no philosophy.

### 3.4 Agent Permission & Autonomy Model

Sentinel governs the agent, not the tool. Claude Code's `bypassPermissions` flag is set to `true` in the SDK spawn config, and Sentinel's own governance layer (criticality gates, review plans, artifact detection) acts as the permission authority.

**Why not tool-level permissions?** IDE tool-permission prompts (file write, bash command, etc.) are designed for interactive human sessions. An autonomous agent that must wait for human approval on every file write defeats the purpose. Instead, Sentinel scopes what the agent *can do* before spawning it and audits what it *did do* after completion.

#### Criticality → Permission Profile

| Criticality | Scope | Notes |
|-------------|-------|-------|
| **low** | Read/write within repo. Standard bash (build, test, lint). | No human gate required. |
| **medium** | Same as low. Agent must produce a plan artifact before execution. | Plan is logged but not gated. |
| **high** | Same as medium, but plan requires human approval before execution proceeds. | Sentinel pauses the session at the plan phase. |
| **critical** | Reserved for future use. Currently maps to high. | May add restricted-write zones later. |

#### Scope Boundary

Every agent session is scoped to the **project's repository directory**. The spawn config sets `cwd` to the repo root. Agents must not access files outside this boundary — Sentinel does not enforce filesystem sandboxing (that's the OS/container's job), but the context bundle never references paths outside the repo, so well-behaved agents stay in scope.

#### Bash Command Categories

Sentinel classifies commands the agent may run:

| Category | Examples | Policy |
|----------|----------|--------|
| **Always safe** | `cat`, `ls`, `grep`, `find`, `git status`, `git diff`, `git log` | No restriction. |
| **Usually safe** | `npm run test`, `npm run build`, `npm run lint`, `tsc --noEmit`, `pnpm install` (lockfile-only) | Allowed by default. Logged. |
| **Gated** | `git commit`, `git push`, `git checkout -b`, `npm publish` | Requires Sentinel-level gate (criticality-dependent). |
| **Blocked** | `rm -rf`, `git push --force`, `curl | sh`, `chmod`, network calls to external services | Never allowed. Agent instructions explicitly prohibit these. |

These categories are documented in the agent's Tier 2 context bundle (behavioral rules section) — the agent is told what it may and may not run. This is advisory, not enforced at the process level. Phase 4 (Pipeline Automation) may add process-level enforcement via a command allowlist.

#### Phase-Based Scoping

Agent sessions follow a plan → execute → review lifecycle. Permission scope narrows by phase:

- **Planning phase**: Read-only. Agent reads the context bundle, explores the codebase, produces a plan artifact. No file writes, no git operations.
- **Execution phase**: Read/write. Agent implements per the approved plan. Bash commands in the "usually safe" and "gated" categories are available (gated commands subject to criticality rules above).
- **Review phase**: Read-only. Agent reviews its own diff, runs tests, checks acceptance criteria. No new file writes.

Phase transitions are tracked in the agent session record (`phase` field) and visible in the session history UI.

---

## 4. Vertical Context System — The Pattern Registry

### 4.1 Why This Exists

The #1 cause of architectural drift in multi-agent development: agents build things that work in isolation but don't match how similar things were already built. They handle horizontal context (state → component relationship) but not vertical context (this component should look like that other component).

### 4.2 Registry Structure

```yaml
# docs/patterns/registry.yaml
# Maintained manually, reviewed weekly

patterns:
  # Component patterns
  - id: card-with-state
    description: "Card component displaying entity/zone state with lifecycle indicators"
    exemplar: src/components/ZoneCard/ZoneCard.tsx
    also_see:
      - src/components/EntityCard/EntityCard.tsx
    tags: [component, card, state, lifecycle]

  - id: status-badge
    description: "Inline badge showing status with color coding and optional animation"
    exemplar: src/components/EntityStatusBadge/EntityStatusBadge.tsx
    tags: [component, badge, status, animation]

  - id: map-overlay
    description: "Mapbox GL overlay layer with interactive features"
    exemplar: src/features/zones/components/ZoneOverlay.tsx
    tags: [component, map, overlay, mapbox]

  # Hook patterns
  - id: realtime-subscription
    description: "Hook subscribing to real-time data with cleanup"
    exemplar: src/hooks/useEntityTracking.ts
    tags: [hook, realtime, subscription, cleanup]

  - id: lifecycle-state
    description: "Hook managing lifecycle state machine transitions"
    exemplar: src/hooks/useZoneLifecycle.ts
    tags: [hook, lifecycle, state-machine]

  # Store patterns
  - id: entity-store
    description: "Zustand store for a collection of typed entities"
    exemplar: src/stores/entityStore.ts
    tags: [store, zustand, collection, entity]
```

### 4.3 How Sentinel Uses the Registry

When generating a Tier 2 context bundle for a ticket:

1. Sentinel analyzes the ticket's description and acceptance criteria
2. Matches against registry tags
3. Injects the 1-2 most relevant exemplars as vertical context references
4. The reference is a *pointer* ("follow the pattern in X"), not the full source

The agent then reads the exemplar file during execution, seeing it in the context of "this is the pattern to follow" rather than random exploration.

### 4.4 Peer Groups — Horizontal Consistency

The Pattern Registry answers "what should this look like?" (exemplar matching). But it doesn't answer "what else already looks like this?" (peer discovery). Peer groups close that gap.

#### The Problem

An agent building a Zustand store for K9 entities gets the `entity-store` exemplar. Good — it sees the structural pattern. But it doesn't automatically:

- Discover that `droneStore.ts`, `vehicleStore.ts`, and `personnelStore.ts` already exist as peers
- Notice that all three share a `useXByStatus()` selector the K9 store should also have
- Catch that the drone store added a convention last sprint that vehicle's store doesn't have yet (pre-existing drift)

The exemplar says "follow this shape." But the *peer group* says "here are the 4 things that already follow this shape — match them."

#### Peer Group Structure

```yaml
peer_groups:
  - id: entity-stores
    patternId: entity-store          # Links to pattern registry entry
    description: "Zustand stores for domain entity collections"
    convention: |
      - Named `use{Entity}Store` with create pattern
      - Actions: add, update, remove, reset, setAll
      - Selectors: useById(id), useByStatus(status), useFiltered(predicate)
      - Optimistic updates on mutation
      - Re-export typed hooks from store file
    members:
      - src/stores/droneStore.ts
      - src/stores/vehicleStore.ts
      - src/stores/personnelStore.ts

  - id: entity-cards
    patternId: card-with-state
    description: "Card components for domain entities with lifecycle indicators"
    convention: |
      - Props: entity data + onSelect callback
      - StatusBadge in top-right corner
      - Truncated description with tooltip
      - Co-located .test.tsx and .stories.tsx
    members:
      - src/components/DroneCard/DroneCard.tsx
      - src/components/VehicleCard/VehicleCard.tsx
      - src/components/PersonnelCard/PersonnelCard.tsx
```

The `convention` field is the critical innovation — a 3-5 line human-curated summary of what makes these files consistent. This goes into the Tier 2 bundle instead of dumping full peer source files. ~200 tokens instead of ~6,000.

#### Graduated Peer Loading

When a ticket involves creating or modifying something that belongs to a peer group, the context bundle includes:

| Peer Group Size | Bundle Includes | Token Cost |
|-----------------|-----------------|------------|
| 1-2 members | Convention summary + pointers to all members | ~300 tokens |
| 3-5 members | Convention summary + 1 exemplar pointer | ~250 tokens |
| 6+ members | Convention summary only (agent explores if needed) | ~200 tokens |

This scales gracefully. A mature codebase with 12 entity stores doesn't blow the token budget — the agent gets the convention and one exemplar, and can read more peers during execution (Tier 3) if it needs to.

#### How Sentinel Uses Peer Groups

During context bundle generation:

1. Sentinel resolves the ticket's related patterns (existing tag matching)
2. For each matched pattern, checks if it belongs to a peer group
3. If yes, includes the peer group's convention summary in Tier 2
4. Applies graduated loading rules to add member pointers
5. The agent sees: "This is the pattern to follow. Here's a summary of the conventions shared by the 4 existing implementations. Here's one to read closely."

During validation:

1. Validation agent receives the peer group conventions in its context
2. Checks new code against the convention summary — concrete, checkable criteria
3. Can flag both drift (new code diverges from convention) and pre-existing inconsistency (existing peers don't all follow the convention)

### 4.5 Registry Maintenance

- **Manually curated** initially. You add patterns and peer groups as conventions stabilize.
- **Weekly review**: Part of sprint retrospective. Are agents drifting from patterns? Is a peer group convention outdated? Do new files belong to an existing peer group?
- **Peer group hygiene**: When a new file is created that matches a peer group, add it as a member. When a convention evolves, update the summary — it's 5 lines, not a full doc.
- **Future automation**: Sentinel can scan for new files matching existing tag patterns and suggest registry entries or peer group membership.

---

## 5. Context Window Strategy for 200K and Beyond

### 5.1 Current Reality (200K Window)

With 200K tokens and ~10K pre-loaded context:

- An agent can comfortably read 20-30 source files during a session
- A typical feature ticket involves reading 5-10 files, writing 3-5 files
- Tests and stories add another 3-5 file reads/writes
- Self-review reads all modified files again
- **Budget per ticket**: ~50-80K tokens used, leaving headroom for iteration

This means a single agent session can handle most standard tickets without compaction. Complex tickets (touching 15+ files) should be decomposed.

### 5.2 Preparing for 1M Windows

A 1M window doesn't change the instruction architecture (research says keep instructions lean regardless). It changes what agents can do *during execution*:

- Read the entire feature directory before modifying anything
- Maintain full conversation history across a multi-step implementation
- Handle larger tickets without decomposition
- Run multiple test suites and iterate without losing earlier context

**Design for 1M, enforce for 200K**: The ticket decomposition logic should flag tickets that would exceed 200K budgets but allow a "large ticket" mode that assumes 1M when available.

### 5.3 Compaction Strategy

When context fills during execution:

1. **Preserve**: Ticket bundle (Tier 2), current plan, current file modifications
2. **Summarize**: Earlier exploration, file reads that informed decisions
3. **Drop**: Verbose test output (keep pass/fail), intermediate reasoning

Sentinel should inject a compaction hint in the Tier 2 bundle:

```markdown
## If context runs low
Compact with: "Preserve the ticket bundle, current plan, and all file
modifications. Summarize everything else."
```

---

## 6. Quality Gates & Validation

### 6.1 Automated Gates (enforced by Sentinel)

| Gate | Check | Blocks |
|------|-------|--------|
| Tests exist | `.test.ts(x)` file exists for each new/modified source file | Submit |
| Stories exist | `.stories.tsx` exists for each new/modified component | Submit |
| No new deps | `package.json` unchanged OR human-approved | Submit |
| Lint passes | `npm run lint` exits 0 | Submit |
| Tests pass | `npm run test` exits 0 | Submit |
| Plan exists | Plan artifact logged for this ticket | Execute |
| Criteria addressed | Each AC marked pass/fail in summary | Submit |

### 6.2 Validation Agent Checklist

When a validation agent reviews a completed ticket:

```markdown
## Validation Review for [TICKET-ID]

### Pattern Compliance
- [ ] New code follows the referenced vertical context patterns
- [ ] Peer group conventions are respected (if applicable)
- [ ] No new patterns introduced without justification
- [ ] File structure matches project conventions

### Acceptance Criteria
- [ ] Each criterion verified independently
- [ ] Edge cases considered (or explicitly noted as out of scope)

### Test Quality
- [ ] Tests cover the happy path
- [ ] Tests cover at least one error/edge case
- [ ] Tests are not trivially passing (actually assert meaningful behavior)

### Integration Risk
- [ ] Changes don't break existing imports
- [ ] No circular dependencies introduced
- [ ] Store changes don't affect unrelated consumers

### Verdict: PASS / FAIL
If FAIL, provide specific, actionable feedback for re-entry.
```

---

## 7. Sprint & Epic Governance

### 7.1 Epic Structure

```markdown
# EPIC-012: Zone Lifecycle System

## Goal
Implement full zone lifecycle state management with visual indicators,
so operators can track zone status in real-time.

## Criticality: Critical

## Success Criteria
- Zones display current lifecycle state
- State transitions are animated and logged
- ICS-214 documentation captures state changes
- All zone types supported

## Tickets
- TL-140: Zone state machine (COMPLETE)
- TL-141: Entity type registry (COMPLETE)
- TL-142: Zone lifecycle state display (TO DO)
- TL-143: Zone state transition logging (TO DO)
- TL-144: ICS-214 zone state integration (TO DO)

## Architecture Notes
See `docs/architecture/zone-system.md` for the lifecycle state machine
design. The zone system follows the same lifecycle pattern as entities
but with additional states (SEEDED, ACTIVE, STALE, ARCHIVED).
```

### 7.2 Sprint Cadence

- **Sprint length**: 1 week (solo engineer, fast iteration)
- **Sprint planning**: Define which tickets enter the sprint, assign criticality overrides
- **Daily check**: Review agent outputs, validate completed work, adjust priorities
- **Sprint retro**: Review pattern registry, prune CLAUDE.md, assess agent performance

### 7.3 Ticket Categories & Allocation

Target allocation per sprint (flexible, not rigid):

| Category | Target % | Rationale |
|----------|----------|-----------|
| Feature | 50-60% | Primary value delivery |
| Tech Debt | 15-20% | Prevent drift accumulation |
| Papercut & Polish | 10-15% | UI quality for demo-readiness |
| Bug | As needed | Priority override when found |
| Infrastructure | 5-10% | Tooling, CI/CD, config |
| Documentation | 5% | Ongoing, not batched |

---

## 8. File System Structure

```
project-root/
├── CLAUDE.md                          # Tier 1 — universal agent context
├── docs/
│   ├── architecture/                  # Detailed arch docs (Tier 3)
│   │   ├── component-patterns.md
│   │   ├── state-management.md
│   │   └── zone-system.md
│   ├── epics/                         # Epic definitions
│   │   └── EPIC-012.md
│   ├── tickets/                       # Ticket markdown files
│   │   ├── tl-142.md
│   │   └── tl-143.md
│   ├── artifacts/                     # Agent-produced plans & reviews
│   │   ├── tl-142-plan.md
│   │   ├── tl-142-summary.md
│   │   └── tl-142-validation.md
│   ├── patterns/
│   │   └── registry.yaml              # Vertical context registry
│   └── sprints/
│       └── sprint-03.md               # Sprint goals & notes
├── .claude/
│   ├── rules/                         # Scoped rules (loaded by Claude Code)
│   │   ├── testing.md
│   │   └── components.md
│   └── commands/                      # Slash commands
│       ├── plan.md
│       ├── validate.md
│       └── triage.md
└── src/                               # Source code
```

---

## 9. Anti-Patterns to Avoid

### In Context Design
- **Don't**: Dump the entire architecture doc into every ticket bundle
- **Do**: Link to it and summarize the relevant section in 2-3 sentences
- **Don't**: Write 500-line CLAUDE.md files with every possible instruction
- **Do**: Keep CLAUDE.md under 150 lines; use `.claude/rules/` for scoped details
- **Don't**: Include negative instructions without alternatives ("never use X")
- **Do**: Provide the preferred approach ("use Y instead of X")

### In Agent Governance
- **Don't**: Let agents self-determine scope ("implement this Epic")
- **Do**: Give agents exactly one ticket with clear boundaries
- **Don't**: Rely on agents remembering cross-session context
- **Do**: Make every ticket self-contained via the context bundle
- **Don't**: Skip validation on "minor" changes — small changes cause drift
- **Do**: Scale validation depth by criticality, but always validate

### In Project Management
- **Don't**: Create tickets so large they exceed context budgets
- **Do**: Decompose until each ticket is 1-3 hours of focused work
- **Don't**: Batch tech debt into "cleanup sprints"
- **Do**: Allocate 15-20% of every sprint to tech debt
- **Don't**: Let the pattern registry go stale
- **Do**: Review it weekly; it's the immune system against architectural drift

---

## 10. Key Metrics to Track

| Metric | What it tells you | Target |
|--------|-------------------|--------|
| First-pass validation rate | Are context bundles good enough? | > 70% |
| Avg tokens per ticket | Are tickets well-scoped? | 40-80K |
| Pattern drift incidents | Is the registry working? | < 2/sprint |
| Tickets decomposed mid-flight | Were they scoped too large? | < 10% |
| Agent plan → execution deviation | Are plans actionable? | Low deviation |
| Human intervention rate | Is autonomy calibrated right? | < 30% of tickets |

---

## References

- Anthropic, "Best Practices for Claude Code" (2025) — code.claude.com/docs/en/best-practices
- Anthropic, "Using CLAUDE.md Files" (2025) — claude.com/blog/using-claude-md-files
- HumanLayer, "Writing a Good CLAUDE.md" (2025) — humanlayer.dev/blog/writing-a-good-claude-md
- Goldberg et al., "Same Task, More Tokens" (2024) — arxiv.org/html/2402.14848v1
- MLOps Community, "The Impact of Prompt Bloat on LLM Output Quality" (2025)
- Anthropic, "Skill Authoring Best Practices" (2025) — platform.claude.com/docs
