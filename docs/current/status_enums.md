# status_enums.md — Agency Command Center ERP

## 1. Purpose

This file defines the canonical Phase 1 enum values used across frontend, backend, database, and API contracts.

Rules:

- enum values must be lowercase snake_case.
- do not create duplicate spellings.
- do not use display labels as stored values.
- UI labels must be derived from these canonical values.
- backend validation is the source of truth.

---

## 2. User Roles

```ts
type UserRole =
  | 'super_admin'
  | 'project_manager'
  | 'team_member'
  | 'client';
```

| Value | Meaning |
|---|---|
| `super_admin` | Full tenant/platform control |
| `project_manager` | Delivery and workflow management |
| `team_member` | Assigned task execution |
| `client` | Read-only client-side access |

---

## 3. Client Status

```ts
type ClientStatus =
  | 'active'
  | 'paused'
  | 'completed'
  | 'archived';
```

| Value | Meaning |
|---|---|
| `active` | Client engagement is ongoing |
| `paused` | Work temporarily paused |
| `completed` | Contract/work completed |
| `archived` | Hidden from default active views |

Rules:

- archived clients must not appear in default active views.
- changing client status may affect workflow visibility/state.
- archive should be soft delete behavior.

---

## 4. Workflow Status

```ts
type WorkflowStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed';
```

| Value | Meaning |
|---|---|
| `draft` | Workflow exists but execution has not started |
| `active` | Workflow execution is ongoing |
| `paused` | Workflow temporarily halted |
| `completed` | All required work is complete |

Allowed transitions:

```txt
draft → active
active → paused
paused → active
active → completed
```

Rules:

- workflow cannot complete with open blockers.
- completed workflows should be treated as immutable except admin correction.
- Phase 1 auto-generates Month 1 workflow as `active`.

---

## 5. Task Status

```ts
type TaskStatus =
  | 'yet_to_start'
  | 'ongoing'
  | 'blocked'
  | 'completed'
  | 'task_approved_by_manager'
  | 'rework'
  | 'task_approved_by_client';
```

| Value | Meaning |
|---|---|
| `yet_to_start` | Work has not started |
| `ongoing` | Work is in progress |
| `blocked` | Work is blocked by an unresolved issue |
| `completed` | Team member has completed work and it can be reviewed |
| `task_approved_by_manager` | Project manager has approved the completed task |
| `rework` | Project manager or client requested corrections |
| `task_approved_by_client` | Client-side approval is complete |

Allowed transitions:

```txt
yet_to_start → ongoing
yet_to_start → blocked
yet_to_start → completed
ongoing → blocked
ongoing → completed
blocked → ongoing
blocked → rework
completed → task_approved_by_manager
completed → blocked
completed → rework
task_approved_by_manager → task_approved_by_client
task_approved_by_manager → blocked
task_approved_by_manager → rework
rework → ongoing
rework → blocked
rework → completed
```

Rules:

- tasks with open blockers cannot be completed.
- completing a task sets `completed_at` and `completed_by`.
- `blocked` is a task status; the `blockers` table stores the detailed blocker records.
- client-approved tasks are terminal.

---

## 6. Task Priority

```ts
type TaskPriority =
  | 'high'
  | 'medium'
  | 'low';
```

| Value | Meaning |
|---|---|
| `high` | Urgent / important |
| `medium` | Normal priority |
| `low` | Lower urgency |

Default:

```txt
medium
```

Priority affects visual styling and sort emphasis, not authorization.

---

## 7. Blocker Status

```ts
type BlockerStatus =
  | 'open'
  | 'resolved';
```

| Value | Meaning |
|---|---|
| `open` | Blocker is unresolved |
| `resolved` | Blocker has been resolved |

Rules:

- open blockers prevent the linked task from being completed.
- resolving a blocker sets `resolved_at` and `resolved_by`.
- task completion may proceed only when no open blockers remain.

---

## 8. Blocker Severity

```ts
type BlockerSeverity =
  | 'high'
  | 'medium'
  | 'low';
```

| Value | Meaning |
|---|---|
| `high` | Stops workflow/task progress |
| `medium` | Delays task progress |
| `low` | Minor operational friction |

Sorting order:

```txt
high → medium → low
```

---

## 9. Client Health Status

Client health is derived, not manually stored as a primary workflow state.

```ts
type ClientHealthStatus =
  | 'on_track'
  | 'at_risk'
  | 'off_track';
```

| Value | Rule |
|---|---|
| `on_track` | completion >= 70% |
| `at_risk` | completion between 50% and 69% |
| `off_track` | completion < 50% |

---

## 10. Activity Action Types

Recommended Phase 1 action types:

```ts
type ActivityActionType =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'assigned'
  | 'completed'
  | 'blocked'
  | 'resolved'
  | 'archived'
  | 'deleted';
```

Rules:

- every workflow mutation must create an activity log.
- logs must use consistent action values.
- logs should include before/after values when applicable.

---

## 11. Entity Types

```ts
type EntityType =
  | 'tenant'
  | 'user'
  | 'client'
  | 'scope_template'
  | 'workflow'
  | 'task'
  | 'blocker';
```

Use these values in activity logs, notifications, and future audit views.

---

## 12. Naming Rules

Do not use:

```txt
In Progress
in-progress
in progress
complete
done
blocked_task
pending
in_progress
```

Use only canonical values.

Display labels should be mapped separately in the frontend.
