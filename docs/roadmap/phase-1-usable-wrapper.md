# Phase 1: Usable Wrapper

**Goal**: Replace the multi-tab, multi-terminal chaos with a single local web app you actually use daily for ticket management.

**Timeframe**: Weeks 1-2

---

## Requirements

### 1.1 Local Web App Shell
- [ ] Fastify backend serving API on port 3001
- [ ] React + Vite frontend on port 5173 with proxy to API
- [ ] SQLite database with Drizzle ORM for all entities
- [ ] Health check endpoint (`GET /api/health`)
- [ ] Concurrent dev startup via `pnpm dev`

### 1.2 Board View (Primary View)
- [ ] Kanban columns: To Do | In Progress | In Review | Validation | Complete
- [ ] Ticket cards showing: title, category icon, criticality badge
- [ ] Click ticket card to navigate to detail view
- [ ] Filter by: Epic, category, criticality
- [ ] Search bar for ticket title filtering
- [ ] Responsive horizontal scroll for columns

### 1.3 Ticket CRUD
- [ ] Create ticket with: title, markdown body, category, epic assignment
- [ ] Edit ticket fields inline or via form
- [ ] Delete ticket with confirmation
- [ ] Acceptance criteria as editable checklist
- [ ] Category selection from 6 buckets (Feature, Tech Debt, Papercut & Polish, Bug, Infrastructure, Documentation)
- [ ] Status transitions enforced per pipeline rules

### 1.4 Epic Hierarchy
- [ ] Create/edit/delete epics
- [ ] Criticality levels (Critical, Standard, Minor) set per epic
- [ ] Per-ticket criticality override
- [ ] Epic detail view with progress bar (% tickets complete)
- [ ] Epic list view

### 1.5 Sprint Management
- [ ] Create/edit sprints with name, date range, goal
- [ ] Assign epics to sprints
- [ ] Basic sprint view (list of associated epics/tickets)

### 1.6 File-First Design
- [ ] Tickets stored as `.md` files in `docs/tickets/`
- [ ] Epics stored as `.md` files in `docs/epics/`
- [ ] Bidirectional sync: DB <-> filesystem
- [ ] Files are the source of truth; DB is the index
- [ ] All content accessible and version-controlled even without the platform

### 1.7 Navigation & Layout
- [ ] Sidebar with navigation: Board, Epics, Agents (placeholder), Settings
- [ ] Collapsible sidebar
- [ ] Breadcrumb header
- [ ] Responsive layout

---

## Out of Scope for Phase 1
- Agent integration (Phase 3)
- Context bundles and pattern registry (Phase 2)
- Git integration (Phase 4)
- Sprint dashboard metrics (Post-MVP)
- Multi-agent concurrency (Post-MVP)
