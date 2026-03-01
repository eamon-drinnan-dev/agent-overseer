# Phase 3: Agent Integration

**Goal**: Connect the platform to Claude Code for automated ticket execution with full pipeline discipline.

**Timeframe**: Weeks 5-6

**Depends on**: Phase 2 complete (context bundles must work)

---

## Requirements

### 3.1 "Deploy Agent" Flow
- [ ] "Deploy Agent" button on Epic and Sprint views
- [ ] Platform identifies eligible tickets (dependencies met, not blocked)
- [ ] Agent receives assembled context bundle for highest-priority eligible ticket
- [ ] Ticket auto-transitions to "In Progress" on deployment

### 3.2 Claude Code Subprocess
- [ ] Spawn Claude Code CLI as subprocess with:
  - Pre-injected context bundle as initial prompt
  - Working directory set to project repo
  - Plan mode enforced via prompt structure
- [ ] Configurable Claude Code CLI path
- [ ] Session management (start, pause, resume, kill)

### 3.3 Agent Output Streaming
- [ ] WebSocket connection for real-time agent output
- [ ] Agent Terminal View showing live output
- [ ] Collapsible/expandable per active agent
- [ ] Status indicator: Planning | Executing | Reviewing | Idle
- [ ] Token usage meter (input/output)

### 3.4 Plan Artifact Capture
- [ ] Capture agent's plan output as a TicketArtifact (type: plan)
- [ ] Display plan artifact in Ticket Detail View
- [ ] Gate: plan artifact must exist before execution phase

### 3.5 Mandatory Agent Workflow
- [ ] Phase 1 (Plan): Read context, produce written plan
- [ ] Phase 2 (Execute): Implement according to plan
- [ ] Phase 3 (Self-Review): Diff review, verify acceptance criteria
- [ ] Phase 4 (Submit): Create PR with structured description
- [ ] Each phase produces an artifact stored on the ticket

### 3.6 Review Gates (Criticality-Based)
- [ ] Critical: Human must approve plan before execution
- [ ] Standard: Configurable (auto-approve or human review)
- [ ] Minor: Auto-approve plans
- [ ] "I want to review plans for this Epic" toggle

### 3.7 Agent Types
- [ ] Development Agent: full pipeline execution
- [ ] Triage Agent: backlog review, priority suggestions (stub)
- [ ] Validation Agent: post-execution review (stub)
- [ ] Planning Agent: sprint planning, ticket decomposition (stub)

---

## Out of Scope for Phase 3
- Multi-agent concurrency (Post-MVP)
- Git integration beyond basic branch naming (Phase 4)
- Agent performance analytics (Post-MVP)
