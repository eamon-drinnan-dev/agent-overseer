# ADR-003: Tailwind CSS v4 + shadcn/ui

**Status**: Accepted
**Date**: 2026-02-28

## Context
Need a UI framework for building a professional, consistent interface quickly.

## Decision
Use Tailwind CSS v4 with the Vite plugin and shadcn/ui for component primitives.

## Rationale
- Tailwind v4 is faster and requires no config file
- shadcn/ui provides accessible, composable components (not a library — owns the code)
- Consistent with modern React development patterns
- OKLCH color system for perceptually uniform theming

## Consequences
- Components are owned source code, not external dependency
- Theme customization via CSS custom properties in `index.css`
- Must run `npx shadcn@latest add <component>` to add new UI primitives
