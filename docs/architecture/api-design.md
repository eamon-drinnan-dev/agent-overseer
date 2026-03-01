# API Design

## Base URL
`http://localhost:3001/api`

## Endpoints

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects` | List all projects |
| POST | `/projects` | Create project |
| GET | `/projects/:id` | Get project |
| PATCH | `/projects/:id` | Update project |
| DELETE | `/projects/:id` | Delete project |

### Epics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/:projectId/epics` | List epics for project |
| POST | `/projects/:projectId/epics` | Create epic |
| GET | `/projects/:projectId/epics/:id` | Get epic |
| PATCH | `/projects/:projectId/epics/:id` | Update epic |
| DELETE | `/projects/:projectId/epics/:id` | Delete epic |

### Tickets
| Method | Path | Description |
|--------|------|-------------|
| GET | `/tickets?epicId=&status=&category=` | List tickets with filters |
| POST | `/tickets` | Create ticket |
| GET | `/tickets/:id` | Get ticket |
| PATCH | `/tickets/:id` | Update ticket |
| PATCH | `/tickets/:id/status` | Update ticket status (validates transitions) |
| DELETE | `/tickets/:id` | Delete ticket |
| GET | `/tickets/:id/artifacts` | List ticket artifacts |
| POST | `/tickets/:id/artifacts` | Create ticket artifact |

### Sprints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/:projectId/sprints` | List sprints |
| POST | `/projects/:projectId/sprints` | Create sprint |
| GET | `/projects/:projectId/sprints/:id` | Get sprint |
| PATCH | `/projects/:projectId/sprints/:id` | Update sprint |
| DELETE | `/projects/:projectId/sprints/:id` | Delete sprint |

### Patterns (Phase 2)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/projects/:projectId/patterns` | List patterns |
| POST | `/projects/:projectId/patterns` | Create pattern |

### Agent Sessions (Phase 3)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/agent-sessions` | List sessions |
| POST | `/agent-sessions` | Create session |
| GET | `/agent-sessions/:id` | Get session |

### WebSocket
| Path | Description |
|------|-------------|
| `/ws/agent-output` | Real-time agent output stream |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |

## Conventions
- All responses are JSON
- Dates are ISO 8601 strings
- IDs are nanoid strings
- Validation errors return 400 with Zod error details
- Not found returns 404
- Status transition violations return 400
