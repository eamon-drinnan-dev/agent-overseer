# Context System

The context system is the core differentiator of Sentinel. It ensures agents receive structured context bundles rather than just task descriptions.

## Context Bundle Structure

When an agent picks up a ticket, it receives a bundle containing:

1. **Ticket context**: Full ticket content, acceptance criteria, category, criticality
2. **Vertical context**: Parent epic, related patterns from the registry
3. **Horizontal context**: Dependency tickets (status), dependent tickets
4. **Project context**: Sprint summary, CLAUDE.md, agent instruction templates
5. **Git context**: Target branch, base branch

## Pattern Registry

A lightweight index of components, hooks, utilities, and their architectural role. Used to inject "related patterns" — examples of how similar things have been built.

**Format**: YAML file + database entries
**Resolution**: Tag-based matching between ticket content and registry entries
**Curation**: Manual initially, auto-scan later (Phase 2 stretch goal)

## Token Budget Management

- Configurable budget per ticket (default ~80K tokens)
- Each context component has an estimated token count
- Bundles that exceed budget trigger warnings
- Platform suggests decomposition for over-budget tickets
- Summarization of large files to fit budget (via Claude API)

## Implementation Notes

- Context bundles are computed at deployment time, not stored
- Bundle preview available in Ticket Detail View before deployment
- Exported as markdown for Claude Code consumption
- File-first: all context sources are readable from filesystem
