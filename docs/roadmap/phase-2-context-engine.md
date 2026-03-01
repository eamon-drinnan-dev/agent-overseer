# Phase 2: Context Engine

**Goal**: Build the context system that makes agents effective — vertical context resolution, pattern registry, and token-aware context bundles.

**Timeframe**: Weeks 3-4

**Depends on**: Phase 1 complete

---

## Requirements

### 2.1 Pattern Registry
- [ ] YAML-based pattern registry file (`pattern-registry.yaml`)
- [ ] Manual curation UI for adding/editing patterns
- [ ] Pattern attributes: path, type (component/hook/utility/service), pattern name, tags
- [ ] Search patterns by tag or type
- [ ] API endpoints for CRUD on pattern entries

### 2.2 Context Bundle Generation
- [ ] Assemble context bundle per ticket containing:
  - Ticket content + acceptance criteria
  - Parent epic description and goals
  - Related patterns (from registry, matched by tags/type)
  - Dependency tickets (status + summary)
  - Dependent tickets (what's blocked by this)
  - Project guidelines (CLAUDE.md)
  - Agent instruction template
  - Git context (target branch, base branch)
- [ ] Context bundle preview in Ticket Detail View
- [ ] Export context bundle as markdown file

### 2.3 Token Estimation & Budget
- [ ] Estimate token count for each context component
- [ ] Configurable token budget (default ~80K)
- [ ] Warning when bundle approaches or exceeds budget
- [ ] Flag tickets whose scope would exceed budget
- [ ] Suggest decomposition into subtasks when over budget

### 2.4 Vertical Context Resolution
- [ ] Auto-match related patterns when ticket involves known entity types
- [ ] Tag-based similarity matching between ticket content and registry
- [ ] Manual override: pin/unpin specific patterns for a ticket
- [ ] "Similar implementations" section in ticket detail

### 2.5 Auto-Scan (Stretch)
- [ ] Scan codebase for components, hooks, utilities
- [ ] Auto-populate pattern registry from filesystem
- [ ] Detect pattern types from file structure and exports
- [ ] Incremental scan on file changes

---

## Out of Scope for Phase 2
- Agent execution (Phase 3)
- Git integration (Phase 4)
- Cross-project pattern sharing
