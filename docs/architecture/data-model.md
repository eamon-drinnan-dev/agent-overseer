# Data Model

## Entity Relationship

```
Project
  ├── Epic (1:N)
  │     └── Ticket (1:N)
  │           └── TicketArtifact (1:N)
  │
  ├── Sprint (1:N)
  │     └── Epic (N:1 via sprintId)
  │
  ├── PatternRegistry (1:N)
  │
  └── AgentSession (via ticket)
        └── Ticket (N:1)
```

## Tables

### projects
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | nanoid |
| name | text | Project name |
| repo_path | text | Absolute path to git repo |
| claude_md_path | text? | Path to CLAUDE.md |
| created_at | text | ISO timestamp |
| updated_at | text | ISO timestamp |

### epics
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | nanoid |
| title | text | |
| description_md | text | Markdown content |
| criticality | enum | critical, standard, minor |
| status | enum | planning, active, complete, on_hold |
| project_id | text FK | -> projects.id |
| sprint_id | text? | -> sprints.id |
| progress_pct | integer | 0-100 |
| file_path | text? | Path to .md file |
| created_at | text | |
| updated_at | text | |

### tickets
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | nanoid |
| title | text | |
| body_md | text | Markdown content |
| category | enum | feature, tech_debt, papercut_and_polish, bug, infrastructure, documentation |
| status | enum | todo, in_progress, in_review, validation, complete, failed |
| criticality_override | enum? | Overrides epic criticality |
| epic_id | text FK | -> epics.id |
| assigned_agent_id | text? | -> agent_sessions.id |
| acceptance_criteria | JSON | Array of {id, description, met} |
| estimated_tokens | integer? | Context bundle token estimate |
| file_path | text? | Path to .md file |
| created_at | text | |
| updated_at | text | |

### ticket_artifacts
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | nanoid |
| ticket_id | text FK | -> tickets.id |
| type | enum | plan, execution_summary, review, validation |
| content_md | text | Artifact content |
| agent_session_id | text? | |
| created_at | text | |

### sprints
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | nanoid |
| name | text | |
| project_id | text FK | -> projects.id |
| start_date | text? | ISO date |
| end_date | text? | ISO date |
| goal_md | text | Sprint goal |
| created_at | text | |
| updated_at | text | |

### pattern_registry
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | nanoid |
| project_id | text FK | -> projects.id |
| path | text | File path in repo |
| type | text | component, hook, utility, service |
| pattern_name | text | Human-readable name |
| tags | JSON | String array |
| last_updated | text | |

### agent_sessions
| Column | Type | Notes |
|--------|------|-------|
| id | text PK | nanoid |
| ticket_id | text? FK | -> tickets.id |
| agent_type | enum | development, triage, validation, planning |
| status | enum | planning, executing, reviewing, complete, failed, idle |
| started_at | text? | |
| completed_at | text? | |
| token_usage_input | integer? | |
| token_usage_output | integer? | |
| output_log | text? | Raw output |
| created_at | text | |

## Status Transitions

```
Ticket: ToDo -> InProgress -> InReview -> Validation -> Complete
                                                    -> Failed -> InProgress
```

Each transition is gated (see Phase 4 roadmap for gate details).
