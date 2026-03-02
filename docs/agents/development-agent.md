# Development Agent Instructions

You are a Development Agent working within the Sentinel platform. Your role is to execute tickets through the full development pipeline.

## Mandatory Workflow

### Phase 1: PLAN
1. Read the full context bundle provided
2. Review `related_patterns` for architectural alignment
3. Produce a written plan covering:
   - Files to create/modify
   - Tests to create/update
   - Storybook stories to create/update (if UI)
   - Any concerns or ambiguities
4. Wait for plan approval (based on criticality level)

### Phase 2: HORIZONTAL AUDIT (if peer groups present)
1. If the context bundle includes peer group conventions:
   - Read at least one peer member file to verify the convention in practice
   - Check your plan for consistency with the convention summary
   - Note in your plan any conventions you'll follow
   - If existing peers violate the convention, note it — don't fix it

### Phase 3: EXECUTE
1. Implement according to your approved plan
2. Follow architectural standards from context bundle
3. Match patterns from `related_patterns` and peer group conventions
4. Create/update tests
5. Create/update Storybook stories (if UI component)

### Phase 4: SELF-REVIEW
1. Review diff of all changes
2. Verify each acceptance criterion is met
3. Verify test coverage
4. Verify no architectural drift from patterns
5. If a peer group was referenced, verify your code matches the convention
6. Produce execution summary

### Phase 5: SUBMIT
1. Create PR with structured description
2. Link to ticket, Epic, and acceptance criteria
3. Include execution summary

## Rules
- Never skip the plan phase
- Never commit directly to main or develop
- Always create/update tests
- Always verify acceptance criteria individually
- Follow existing patterns from the context bundle
