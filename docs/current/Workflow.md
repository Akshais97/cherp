# Workflow.md — Agency Command Center ERP v2.1

## 1. Purpose

This document defines the **Phase 1 workflow behavior** for the Agency Command Center ERP.

It is the source of truth for:

- client onboarding behavior
- scope template resolution
- workflow generation
- task lifecycle rules
- blocker lifecycle rules
- completion calculations
- dashboard derivations
- tenant safety rules
- workflow transaction boundaries

This file defines **behavior**, not database schema.

Schema belongs in:

- `Data_Models.md`
- `System_Designs.md`

---

## 2. Phase 1 Scope

Phase 1 delivers the operational foundation required to replace manual spreadsheets with a controlled ERP workflow system.

Included:

- client onboarding
- scope template selection
- Month 1 workflow generation
- task checklist generation
- task status tracking
- blocker logging and resolution
- internal dashboard derivations
- basic RBAC enforcement
- activity logging

Excluded from Phase 1:

- event buses
- CQRS
- workflow engines
- recurring workflow automation
- background orchestration
- AI-generated workflows
- dependency enforcement
- SLA timers
- auto-escalation
- Gantt/Kanban views
- client portal workflow mutation

Phase 1 must stay simple, deterministic, and transaction-safe.

---

## 3. Core Workflow Principle

The ERP is a **workflow orchestration system**.

All operational work follows this hierarchy:

```txt
Tenant
→ Client
→ Workflow
→ Task
→ Blocker
→ Activity Log
```

Rules:

- A workflow cannot exist without a client.
- A task cannot exist without a workflow.
- A blocker cannot exist without a task.
- Every operational entity must belong to a tenant.
- Every mutation must be traceable through an activity log.

---

## 4. Architectural Rules

The workflow module must follow a modular monolith architecture.

Required implementation boundaries:

| Layer | Responsibility |
|---|---|
| Controller | Accept HTTP requests, validate auth context, call services |
| Service | Own business rules and workflow orchestration |
| Repository | Own Prisma/database access |
| DTO / Validation | Validate request payload shape before business logic |
| Activity Log Service | Record auditable mutations |

Rules:

- Controllers must not contain business logic.
- Controllers must not directly call Prisma.
- Services must not bypass repositories.
- Repositories must not contain workflow business rules.
- Cross-module access must happen through injected services, not direct database shortcuts.
- Tenant filtering must be enforced before every read or write.

---

## 5. Tenant Safety Rules

Every workflow operation must execute inside the authenticated tenant context.

Before any mutation, the system must verify:

```txt
entity.tenant_id === currentTenant.id
```

Relationship ownership must also be verified.

Example:

```txt
Task
→ belongs to Workflow
→ belongs to Client
→ belongs to Tenant
```

If ownership validation fails, the system must reject the operation.

No cross-tenant read, write, dashboard count, or aggregate is allowed.

---

## 6. Client Onboarding Workflow

Client onboarding is the main entry point into the ERP workflow system.

Onboarding must perform these steps:

```txt
Validate Request
→ Create Client
→ Resolve Scope Template
→ Create Month 1 Workflow
→ Generate Tasks
→ Calculate Initial Completion
→ Write Activity Logs
→ Commit Transaction
```

This entire process must run inside a single database transaction.

If any step fails:

```txt
ROLLBACK
```

No partial client, workflow, or task data may remain.

---

## 7. Scope Template Resolution

Template selection is based on:

- `industry`
- `service_type`

Resolution priority:

1. Exact `industry + service_type` match
2. Same `industry` fallback
3. Same `service_type` fallback
4. Manual PM selection

Rules:

- Only active templates can be selected.
- The selected template is stored on the client/workflow.
- Generated workflow tasks become independent records.
- Future template edits must not modify already-generated workflows.

This protects historical accuracy.

---

## 8. Workflow Generation Rules

During Phase 1 onboarding, the system generates only:

```txt
Month 1 Workflow
```

Default values:

| Field | Default |
|---|---|
| `status` | `active` |
| `month_number` | `1` |
| `completion_percentage` | `0` |
| `auto_generated` | `true` |

Workflow title format:

```txt
<Client Name> — Month <Number>
```

Example:

```txt
Bright Homes — Month 1
```

Future month planning is not automated in Phase 1.

---

## 9. Workflow State Machine

Allowed workflow states:

```txt
draft
active
paused
completed
archived
```

Allowed transitions:

| From | To | Rule |
|---|---|---|
| `draft` | `active` | Workflow is ready for execution |
| `active` | `paused` | Client/work halted temporarily |
| `paused` | `active` | Work resumes |
| `active` | `completed` | All tasks complete and no open blockers |
| `completed` | `archived` | Admin-only archival |
| `paused` | `archived` | Admin-only archival |

Rules:

- Completed workflows should be treated as immutable.
- Archived workflows must not appear in active operational views.
- A workflow cannot be completed while open blockers exist.

---

## 10. Task Generation Rules

Tasks are generated from:

```txt
scope_templates.default_tasks
```

Each generated task must include:

- tenant ID
- workflow ID
- title
- description, if available
- status
- priority
- sort order
- due date, if available

Default values:

| Field | Default |
|---|---|
| `status` | `pending` |
| `priority` | `medium` |
| `is_subtask` | `false` |

Task order must follow:

```txt
sort_order ASC
```

---

## 11. Task State Machine

Allowed task states:

```txt
pending
in_progress
blocked
completed
```

Allowed transitions:

| From | To | Rule |
|---|---|---|
| `pending` | `in_progress` | Work starts |
| `in_progress` | `completed` | User completes task |
| `pending` | `blocked` | Blocker is created |
| `in_progress` | `blocked` | Blocker is created |
| `blocked` | `in_progress` | All blockers resolved |
| `blocked` | `completed` | Not allowed directly |

Completion rules:

When a task is completed, the system must set:

```txt
completed_at
completed_by
```

A task cannot be completed if it has an open blocker.

---

## 12. Blocker Lifecycle Rules

A blocker represents an obstacle preventing task progress.

Allowed blocker states:

```txt
open
resolved
```

Severity levels:

```txt
high
medium
low
```

When a blocker is created, the system must:

```txt
Create Blocker
→ Link to Task
→ Link to Client
→ Set Task Status = blocked
→ Write Activity Log
```

When a blocker is resolved, the system must:

```txt
Set Blocker Status = resolved
→ Set resolved_by
→ Set resolved_at
→ Set Task Status = in_progress
→ Write Activity Log
```

Rules:

- A blocker must always reference a task.
- A blocker must always reference the affected client.
- A task remains blocked while any open blocker exists.
- Resolving one blocker must not unblock the task if another open blocker still exists.

---

## 13. Completion Calculation

Workflow completion percentage is calculated as:

```txt
(completed_tasks / total_tasks) × 100
```

Rules:

- Only tasks belonging to the workflow are counted.
- Deleted/archived tasks are excluded if soft-delete is implemented.
- Blocked tasks are not counted as complete.
- Completion must recalculate after task creation, task completion, or blocker-driven status changes.

A workflow can move to `completed` only when:

```txt
all required tasks are completed
AND
open_blocker_count = 0
```

---

## 14. Dashboard Derivation Rules

The dashboard is derived from source tables.

It is not the source of truth.

Dashboard values derive from:

- clients
- workflows
- tasks
- blockers
- activity logs

Phase 1 health status:

| Status | Rule |
|---|---|
| `On Track` | completion `>= 70%` |
| `At Risk` | completion `50%–69%` |
| `Off Track` | completion `< 50%` |

Open blocker count:

```txt
COUNT(blockers WHERE status = open)
```

Upcoming deadlines:

```txt
tasks WHERE due_date <= today + 7 days
AND status != completed
```

Overdue tasks:

```txt
tasks WHERE due_date < today
AND status != completed
```

---

## 15. Activity Logging Rules

Every workflow mutation must create an activity log.

Required for:

- client onboarding
- workflow creation
- task creation
- task status change
- task completion
- blocker creation
- blocker resolution
- client status change

Minimum activity log fields:

```txt
tenant_id
user_id
action_type
entity_type
entity_id
created_at
```

Recommended fields:

```txt
before_values
after_values
```

Activity logs must be append-only.

---

## 16. Authorization Rules

Workflow permissions must follow RBAC.

| Role | Allowed |
|---|---|
| Super Admin | Full access |
| Project Manager | Onboard clients, manage workflows, assign tasks, resolve blockers |
| Team Member | View/update assigned tasks, create blockers |
| Client | View dashboard only |

Rules:

- Team members cannot onboard clients.
- Clients cannot mutate operational workflow data.
- Users can only access data inside their tenant.
- Sensitive financial fields must be restricted to authorized roles.

---

## 17. Transaction Rules

The following operations must run inside transactions:

- client onboarding
- workflow generation
- batch task generation
- blocker creation
- blocker resolution
- workflow completion

A transaction must guarantee:

```txt
all-or-nothing persistence
```

No half-created workflow state is allowed.

---

## 18. Idempotency Rules

The system must prevent duplicate workflow generation.

Repeated requests must not create:

- duplicate clients from the same onboarding request
- duplicate Month 1 workflows
- duplicate generated task sets
- duplicate blockers from accidental double-submit

Recommended safeguards:

- request idempotency key
- unique workflow constraint per `client_id + month_number`
- frontend submit lock
- backend duplicate validation

---

## 19. Object Safety Rules

All data entering workflow services must pass validation before business logic.

Validation layers:

```txt
React Form Validation
→ API DTO Validation
→ Service-Level Business Validation
→ Repository/Database Constraints
```

Rules:

- invalid payloads must never reach workflow orchestration logic.
- tenant ID must come from auth context, not request body.
- system-generated fields must not be client-controlled.
- status transitions must be validated by services.

---

## 20. Performance Targets

Phase 1 targets:

| Area | Target |
|---|---|
| Dashboard load | `< 2 seconds` for up to 50 active clients |
| Client list load | `< 1 second` for up to 100 clients |
| Scope template preview | `< 200ms` after industry/service selection |
| Task completion update | visible within `< 1 minute` |

---

## 21. Phase 2 Readiness

Phase 1 must prepare for, but not implement:

- task dependencies
- subtasks
- comments
- attachments
- time tracking
- notifications
- escalation rules
- client portal mutation
- reporting hub
- team capacity

Existing Phase 1 models may include fields for future readiness, but Phase 1 services must not activate unfinished behavior.

---

## 22. Anti-Patterns Not Allowed

The workflow module must avoid:

- fat controllers
- direct Prisma calls from controllers
- tenant ID accepted from request body
- business logic inside repositories
- hidden automatic workflow generation outside onboarding
- background side effects in Phase 1
- silent status changes without activity logs
- dashboard values stored as source-of-truth
- cross-tenant aggregate queries
- modifying generated workflows when templates change

---

## 23. Final Rule

Phase 1 workflow behavior must prioritize:

```txt
Correctness > Cleverness
Consistency > Automation
Traceability > Convenience
Maintainability > Premature Scaling
```

The system should be simple enough to debug, strict enough to trust, and modular enough to extend in later phases.