# Cherp ERP Phase 1–2 Corrected Interpretation & Implementation Plan

**Repo:** `Akshais97/cherp`  
**Branch:** `ui-animations-reactlib`  
**Purpose:** Convert the corrected Phase 1–2 audit feedback into a detailed implementation plan for closing remaining PRD gaps.  
**Mode:** Planning document only. No repository changes made.

---

## 0. Executive Summary

The earlier gap report should be corrected in one important area: **login, refresh, and reset-password do not have to be backend-owned endpoints if the product intentionally uses Supabase Auth as the authentication authority.** The Phase 1 PRD itself states that sign-in/sign-out is handled through Supabase Auth, with the backend performing local JWT verification and ERP user synchronization.

So the corrected interpretation is:

- **Not a gap:** Supabase-managed login, token refresh, and password reset can remain outside the NestJS backend controller.
- **Still a gap:** logout/session invalidation needs stronger implementation.
- **Still a gap:** failed-login rate limiting needs a deliberate design because Supabase-managed login bypasses backend rate limiting unless login is routed through a backend wrapper.
- **Still a gap:** Phase 2 business capabilities are only partially implemented: time tracking, real capacity planning, dependency management UI/API, blocker auto-escalation, notification scheduling, email notifications, reporting hub, month planning, client portal, and CRM sync.

This document defines how to implement the corrected plan module by module.

---

## 1. Source-of-Truth Corrections

### 1.1 Authentication correction

The backend does not necessarily need custom `login`, `refresh`, and `reset-password` endpoints if the frontend uses Supabase Auth directly.

Correct interpretation:

| Area | Correct status | Explanation |
|---|---|---|
| Login | Not a backend gap if Supabase Auth handles it | The backend can stay stateless and validate Supabase JWTs. |
| Token refresh | Not a backend gap if Supabase client handles refresh | Refresh tokens should remain managed by Supabase unless the architecture changes. |
| Reset password | Not a backend gap if Supabase reset flow is used | Backend may expose `forgot-password` only as a convenience wrapper. |
| Logout | Gap | Current backend logout is weak if it only tells the client to clear local state. |
| Logout from all devices | Gap | Needs explicit session invalidation design. |
| Failed-login rate limiting | Gap | Needs either backend login wrapper or Supabase-side protection settings plus app-level abuse controls. |

### 1.2 Capacity correction

The Phase 2 PRD describes real capacity planning as:

```text
utilization = assigned task hours / available hours * 100
```

So the current heuristic calculation based on open task count is insufficient for the PRD target.

Correct interpretation:

- `Task.estimated_hours` is needed for planned workload.
- `User.available_hours_per_week` or an equivalent availability model is needed.
- `TimeEntry.hours` is needed for actual logged work and billing/reporting.
- Capacity dashboards should distinguish **planned capacity** from **actual logged time**.

### 1.3 Blocker escalation correction

Automatic blocker escalation should not be based on task due date and should not be based on estimated task hours. The Phase 2 blocker rule is based on how long the blocker has remained open.

Correct interpretation:

| Severity | Escalate when open for |
|---|---:|
| High | 3 days |
| Medium | 5 days |
| Low | 7 days |

The timer starts from `blocker.flagged_at` or `blocker.created_at`, not from task due date.

---

## 2. Implementation Principles

Use these principles across all modules:

1. **Supabase owns authentication identity.** NestJS owns ERP authorization, tenant isolation, role guards, audit logging, and business rules.
2. **Do not store raw refresh tokens in the ERP database.** Use Supabase session APIs and app-level revocation checks where needed.
3. **Validate required fields at every layer.** Frontend Zod, backend DTO, service-level business validation, and Prisma/database constraints should agree.
4. **Prefer structured UI over raw JSON editing.** Scope templates and KPI frameworks may remain JSON in storage, but users should edit them through form builders.
5. **Separate planned work from actual work.** Planned capacity comes from task estimates; actual reporting comes from time entries.
6. **Use scheduled jobs for automation.** Deadline reminders, daily digests, month planning alerts, and blocker escalations should not depend on users opening pages.
7. **Make notification delivery idempotent.** A scheduler should not spam duplicates if it runs repeatedly.
8. **Treat CRM sync as a later integration boundary.** It remains a PRD item but should not block the current internal ERP completion work.

---

## 3. Authentication & Platform Foundation

### 3.1 Current interpretation

The current backend auth controller exposing only `register`, `forgot-password`, and `logout` is not automatically wrong. If Supabase Auth performs login, refresh, and reset-password, the backend does not need duplicate endpoints for those operations.

However, session management and abuse prevention still need work.

---

### 3.2 Required implementation

#### A. Keep Supabase Auth for normal login/refresh/reset

Frontend flow:

1. User signs in using Supabase Auth.
2. Supabase returns access token and refresh token to the client.
3. Frontend sends access token as bearer token to NestJS.
4. NestJS `JwtAuthGuard` verifies the JWT, maps it to ERP `User`, checks `is_active`, and attaches tenant/role context.

Backend should continue to own:

- tenant isolation
- role-based access control
- user active/inactive checks
- audit logging
- session revocation checks if implemented

---

#### B. Implement stronger logout

Current problem:

- Backend logout only tells the client to invalidate locally.
- It does not prove that Supabase session/refresh tokens were invalidated.
- It does not support logout from all devices.

Target endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/logout` | Logout current session. |
| `POST` | `/auth/logout-all` | Logout all sessions/devices for the ERP user. |

Implementation details:

1. Frontend calls Supabase client logout.
2. Frontend also calls backend `/auth/logout` with current bearer token.
3. Backend attempts to invalidate the current Supabase session using the current Supabase-compatible server-side method.
4. Backend creates audit log entry:
   - `action_type = auth_logout`
   - `entity_type = user`
   - `entity_id = user.id`
5. Frontend clears local state and redirects to login.

For logout from all devices:

1. Add backend endpoint `/auth/logout-all`.
2. Only the authenticated user, Super Admin, or authorized account action should trigger it.
3. Invalidate all Supabase sessions for that auth user where supported.
4. Add ERP-level safety fallback:
   - add `User.sessions_revoked_at DateTime?`
   - `JwtAuthGuard` rejects tokens issued before this timestamp where token issued-at data is available.
5. Audit log:
   - `action_type = auth_logout_all`

Recommended schema addition:

```prisma
model User {
  // existing fields...
  sessions_revoked_at DateTime? @db.Timestamptz
}
```

Acceptance criteria:

- User can logout from current browser.
- User can logout from all devices.
- Disabled users cannot keep using old tokens beyond the accepted token lifetime/revocation rule.
- Logout actions are audit logged.

---

#### C. Implement failed-login rate limiting

Because frontend direct Supabase login does not pass through NestJS, backend rate limiting cannot see login failures unless login is proxied through the backend.

There are two options.

##### Option 1 — Recommended for app-level control: backend login wrapper

Add:

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/auth/login` | Rate-limited password login wrapper that delegates to Supabase. |

Flow:

1. Frontend submits email/password to NestJS `/auth/login`.
2. Backend applies rate limit by `IP + email`.
3. Backend delegates sign-in to Supabase Auth.
4. If successful, backend returns Supabase session data to frontend.
5. If failed, backend stores failed attempt metadata and returns generic error.

Rate limit policy:

| Rule | Limit |
|---|---:|
| Failed attempts per email + IP | 5 per 15 minutes |
| Total attempts per IP | 15 per 15 minutes |
| Cooldown after repeated failures | 15–30 minutes |
| Error response | Generic only |

Suggested storage:

```prisma
model AuthAttempt {
  id          String   @id @default(uuid()) @db.Uuid
  email       String
  ip_address  String
  success     Boolean
  reason      String?
  created_at  DateTime @default(now()) @db.Timestamptz

  @@index([email, ip_address, created_at])
  @@index([ip_address, created_at])
  @@map("auth_attempts")
  @@schema("erp")
}
```

##### Option 2 — Minimal architecture change

Keep direct Supabase login and configure Supabase-side abuse protections. This is simpler but gives less application-level observability.

Even with this option, still add:

- audit logging for sensitive auth events visible to the ERP backend
- user deactivation enforcement through `JwtAuthGuard`
- password reset abuse protection at backend if `forgot-password` remains proxied

Recommendation:

Use **Option 1** if the PRD specifically wants application-controlled failed-login rate limiting.

---

## 4. Client Onboarding

### 4.1 Required contact fields

Current issue:

- PRD says contact person and contact email are required.
- Current DTO/schema allow `contact_name` and `contact_email` as optional.

Target behavior:

- Every client must have a contact person.
- Every client must have a valid contact email.

Implementation checklist:

#### Backend DTO

Change from optional to required:

```ts
export class CreateClientDto {
  @IsString()
  @MinLength(1)
  contact_name: string;

  @IsEmail()
  contact_email: string;
}
```

Also update `UpdateClientDto` depending on policy:

- If updates are partial, fields can remain optional in update DTO.
- But if a field is supplied, it must be valid.
- Do not allow clearing contact name/email to null/empty.

#### Prisma schema

Change:

```prisma
contact_name  String?
contact_email String?
```

To:

```prisma
contact_name  String
contact_email String
```

Migration strategy:

1. Find existing clients with null contact fields.
2. Fix those records manually or through an admin repair script.
3. Apply migration after cleanup.
4. Add DB constraints only after existing rows are safe.

SQL pre-check:

```sql
select id, name, contact_name, contact_email
from erp.clients
where contact_name is null
   or contact_email is null
   or trim(contact_name) = ''
   or trim(contact_email) = '';
```

#### Frontend

Update onboarding Step 1:

- `contact_name` required
- `contact_email` required and email-formatted
- show inline validation before Step 2

Acceptance criteria:

- Client cannot be created without contact person.
- Client cannot be created without contact email.
- Existing invalid records are found before migration.
- API returns 400 with clear validation message.

---

### 4.2 Closest scope-template options

Current issue:

- Backend has a template resolve endpoint.
- Need full fallback suggestions UX when no exact match exists.

Target behavior:

During onboarding, when the selected industry/service pair has no exact template, the system should show closest available templates and explain why each is suggested.

#### Backend API

Endpoint:

```http
GET /scope-templates/resolve?industry={industry}&service_type={service_type}
```

Response:

```json
{
  "exact_match": null,
  "suggestions": [
    {
      "template": {
        "id": "uuid",
        "name": "Healthcare PPC Starter",
        "industry": "Healthcare",
        "service_type": "Performance Marketing"
      },
      "match_score": 0.86,
      "reasons": [
        "same industry",
        "related service type"
      ]
    }
  ]
}
```

Matching logic:

| Match condition | Score guidance |
|---|---:|
| Exact industry + exact service type | 1.00 |
| Same service type + related industry | 0.80–0.90 |
| Same industry + related service type | 0.70–0.85 |
| Fuzzy industry match | 0.50–0.70 |
| Active template but weak relationship | below 0.50 |

Suggested related mapping table:

```ts
const RELATED_INDUSTRIES = {
  healthcare: ["wellness", "clinics", "hospitals", "medical"],
  education: ["edtech", "coaching", "training"],
  real_estate: ["property", "construction", "interiors"]
};

const RELATED_SERVICES = {
  ppc: ["performance_marketing", "paid_ads", "lead_generation"],
  seo: ["organic", "content", "website_growth"],
  social_media: ["content", "brand", "community"]
};
```

#### Frontend UX

Onboarding Step 2 states:

- If exact match exists:
  - auto-select exact template
  - show “Recommended exact match” badge
  - allow override
- If no exact match:
  - show message: “No exact template found. Choose a closest template or create a new one.”
  - display top 3–5 suggestions
  - show reason chips: `same service`, `related industry`, `closest keyword match`

Acceptance criteria:

- No exact match does not dead-end the onboarding flow.
- User can select a fallback template.
- User can see why a template is suggested.
- Backend does not return inactive templates.
- Suggestions are tenant-scoped.

---

## 5. Scope Templates

### 5.1 Current issue

The schema can store `default_tasks` and `kpi_framework` as JSON, but admins need a proper UI to edit template task lists and KPI frameworks cleanly.

Raw JSON editing is not acceptable for a non-technical admin workflow.

---

### 5.2 Target solution: Template Builder

Build a structured **Scope Template Builder** with two main sections:

1. Task Blueprint Builder
2. KPI Framework Builder

---

### 5.3 Task Blueprint Builder

UI layout:

```text
Scope Template Detail
├── Basic Info
│   ├── Template name
│   ├── Industry
│   ├── Service type
│   └── Duration months
├── Month Tabs
│   ├── Month 1
│   ├── Month 2
│   └── Month 3
└── Task List Editor
    ├── Add task
    ├── Drag/drop reorder
    ├── Add subtasks
    ├── Add dependencies
    └── Preview generated workflow
```

Each template task should support:

| Field | Purpose |
|---|---|
| `title` | Generated task title. |
| `description` | Default task instructions. |
| `month_number` | Which workflow month the task belongs to. |
| `priority` | high / medium / low. |
| `target_role` | Role/designation used for auto-assignment. |
| `estimated_hours` | Planned work used for capacity. |
| `due_offset_days` | Due date relative to workflow start date. |
| `slot` | Optional time slot for daily/recurring work. |
| `is_daily` | Whether task is daily instead of due-date based. |
| `checklist` | Internal checklist items. |
| `subtasks` | Child tasks generated under parent. |
| `depends_on_keys` | Template-level dependency keys resolved during generation. |

Recommended JSON shape:

```json
{
  "months": [
    {
      "month_number": 1,
      "tasks": [
        {
          "template_key": "keyword_research",
          "title": "Keyword research",
          "description": "Prepare initial keyword set",
          "target_role": "PPC Specialist",
          "priority": "high",
          "estimated_hours": 4,
          "due_offset_days": 3,
          "is_daily": false,
          "checklist": [
            { "title": "Collect seed keywords" },
            { "title": "Cluster keywords" }
          ],
          "subtasks": [],
          "depends_on_keys": []
        }
      ]
    }
  ]
}
```

Backend validation:

- Every task must have title.
- Every non-daily task must have `due_offset_days`.
- Every normal task should have `target_role` or explicit default assignee strategy.
- `estimated_hours` should be positive.
- Dependency keys must reference existing tasks in the same template.
- Circular dependencies are forbidden.

---

### 5.4 KPI Framework Builder

UI fields:

| Field | Example |
|---|---|
| KPI name | Leads |
| Channel | Google Ads |
| Metric type | Count / Currency / Percentage / Ratio |
| Target value | 100 |
| Frequency | Weekly / Monthly |
| Owner role | PPC Specialist |
| Visibility | Internal only / Client visible |

Recommended JSON shape:

```json
{
  "kpis": [
    {
      "key": "leads",
      "name": "Leads",
      "channel": "Google Ads",
      "metric_type": "count",
      "target_value": 100,
      "frequency": "monthly",
      "owner_role": "PPC Specialist",
      "client_visible": true
    }
  ]
}
```

Acceptance criteria:

- Admin can add/edit/delete tasks without touching JSON.
- Admin can reorder tasks.
- Admin can configure subtasks and dependencies.
- Admin can configure KPI frameworks through fields.
- Backend rejects malformed JSON even if frontend has a bug.
- Generated client workflow correctly uses the updated template.

---

## 6. Workflows & Tasks

### 6.1 Required due date and primary assignee

Current issue:

- PRD expects each normal task to have a due date and one primary assignee.
- Current DTO/schema allow `due_date` and `assigned_to` as optional.
- Phase 1 PRD also allows daily tasks instead of a due date, so due date should not be blindly required for daily tasks.

Correct rule:

```text
assigned_to is required for normal assigned tasks.
due_date is required unless is_daily = true.
slot is required if is_daily = true.
```

---

### 6.2 Backend validation

Update `CreateTaskDto`:

```ts
export class CreateTaskDto {
  @IsString()
  title: string;

  @IsUUID()
  assigned_to: string;

  @ValidateIf((dto) => dto.is_daily !== true)
  @IsISO8601()
  due_date: string;

  @ValidateIf((dto) => dto.is_daily === true)
  @IsString()
  slot: string;

  @IsOptional()
  @IsNumber()
  @Min(0.25)
  estimated_hours?: number;
}
```

Service-level validation:

- `assigned_to` must belong to same tenant.
- `assigned_to` must be active.
- Task due date must fall inside workflow start/end date when workflow dates exist.
- Daily tasks must have slot/time context.
- Custom tasks must specify client/workflow context.

---

### 6.3 Prisma migration plan

Immediate safe option:

- Keep DB fields nullable temporarily.
- Enforce required behavior in DTO/service.
- Add data cleanup report.

Later hardening:

```prisma
assigned_to String @db.Uuid
```

Do not make `due_date` non-null globally because daily tasks are allowed.

Instead, enforce conditional rules in service or database check constraint:

```sql
check (
  (is_daily = true and slot is not null)
  or
  (is_daily = false and due_date is not null)
)
```

Only add DB check after existing data is cleaned.

---

### 6.4 Drag-and-drop checklist verification

The repo has task reorder behavior, but runtime UI verification is still needed.

Test plan:

#### Playwright test: workflow task reorder

1. Login as PM.
2. Open workflow detail page.
3. Capture current task order.
4. Drag second task above first task.
5. Confirm order changed in UI.
6. Refresh page.
7. Confirm persisted order remains changed.
8. Confirm backend updated `sort_order`.

#### Playwright test: checklist/subtask reorder if applicable

1. Open task detail drawer.
2. Add checklist/subtasks.
3. Reorder checklist items.
4. Save.
5. Refresh.
6. Confirm saved order.

Acceptance criteria:

- Drag-and-drop works with mouse.
- Drag-and-drop works with keyboard accessible fallback or move buttons.
- Sort order persists after refresh.
- Reordering does not break task dependency references.

---

## 7. Internal Dashboard & Team Utilization

### 7.1 Correct PRD interpretation

The Phase 2 PRD expects utilization based on assigned task hours and available hours.

So the current heuristic should be replaced.

---

### 7.2 Data model changes

Add planned task estimate:

```prisma
model Task {
  // existing fields...
  estimated_hours Decimal? @db.Decimal(6, 2)
}
```

Add normalized user availability:

```prisma
model User {
  // existing fields...
  weekly_available_hours Decimal? @db.Decimal(6, 2)
}
```

Optional stronger model for future leave/calendar support:

```prisma
model UserAvailability {
  id          String   @id @default(uuid()) @db.Uuid
  tenant_id   String   @db.Uuid
  user_id     String   @db.Uuid
  week_start  DateTime @db.Date
  hours       Decimal  @db.Decimal(6, 2)
  source      String   @default("manual")
  created_at  DateTime @default(now()) @db.Timestamptz
  updated_at  DateTime @updatedAt @db.Timestamptz

  @@unique([tenant_id, user_id, week_start])
  @@schema("erp")
}
```

For MVP, `weekly_available_hours` on `User` is enough.

---

### 7.3 Capacity formulas

Planned utilization:

```text
planned_utilization = active_assigned_estimated_hours / weekly_available_hours * 100
```

Actual utilization:

```text
actual_utilization = logged_hours_this_week / weekly_available_hours * 100
```

Overload flag:

```text
overloaded = planned_utilization > 80
```

Dashboard should show:

| Metric | Source |
|---|---|
| Planned load | Sum of active task `estimated_hours` |
| Actual logged hours | Sum of `TimeEntry.hours` in selected period |
| Available hours | User weekly availability |
| Utilization % | Planned or actual / available |
| Overload alert | > 80% |

Acceptance criteria:

- PM can see utilization by team member.
- Users above 80% show warning.
- Capacity is no longer based only on open task count.
- Capacity uses tenant-scoped data only.
- Time tracking feeds actual utilization.

---

## 8. Task Dependencies & Subtasks

### 8.1 Current status

Schema already has:

- `depends_on String[]`
- `parent_task_id String?`
- `is_subtask Boolean`

But the missing pieces are:

- dependency creation/edit endpoints
- dependency graph UI
- dependency calendar conflict checks
- dependency-specific status/indicator
- complete subtask lifecycle UX

---

### 8.2 Dependency backend endpoints

Add:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/tasks/:id/dependencies` | Get predecessor and successor tasks. |
| `PATCH` | `/tasks/:id/dependencies` | Replace dependency list. |
| `POST` | `/tasks/:id/dependencies/:dependencyId` | Add one dependency. |
| `DELETE` | `/tasks/:id/dependencies/:dependencyId` | Remove one dependency. |
| `GET` | `/workflows/:id/dependency-graph` | Return graph nodes/edges for workflow. |

DTO:

```ts
export class UpdateTaskDependenciesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  depends_on: string[];
}
```

Validation rules:

- Dependency task must exist.
- Dependency task must belong to same tenant.
- Dependency task should belong to same workflow/client unless explicitly allowed.
- Task cannot depend on itself.
- Circular dependency is forbidden.
- Completed tasks can be dependencies.
- Deleted/archived tasks cannot be dependencies.

Cycle detection pseudocode:

```ts
function wouldCreateCycle(taskId, newDependencyIds) {
  // Build directed graph: dependency -> task
  // For each new dependency, traverse upstream/downstream.
  // If taskId is reachable from any dependency, reject.
}
```

---

### 8.3 Dependency status model

Do not overload real blocker status for dependency locks.

Use computed field:

```ts
dependency_state: 'ready' | 'blocked_by_dependency' | 'complete'
```

API response example:

```json
{
  "id": "task-id",
  "status": "yet_to_start",
  "dependency_state": "blocked_by_dependency",
  "blocked_by_dependencies": [
    {
      "id": "dependency-task-id",
      "title": "Client brief approval",
      "status": "ongoing"
    }
  ]
}
```

Rules:

- Task can move to `ongoing` only if dependencies are complete.
- Task can move to `completed` only if dependencies are complete.
- If dependencies are incomplete, show exact tasks blocking it.
- If dependency task due date is later than dependent task due date, show calendar conflict warning.

---

### 8.4 Dependency graph UI

Build a workflow-level dependency panel.

UI components:

```text
Workflow Detail
├── Checklist View
├── Calendar View
└── Dependency View
    ├── Node graph
    ├── Blocked tasks list
    ├── Conflicts list
    └── Dependency edit drawer
```

Graph node data:

```json
{
  "nodes": [
    {
      "id": "task-id",
      "label": "Keyword research",
      "status": "completed",
      "due_date": "2026-08-30"
    }
  ],
  "edges": [
    {
      "from": "task-a",
      "to": "task-b",
      "type": "dependency"
    }
  ]
}
```

Calendar conflict checks:

- dependency due date > dependent due date
- dependent task starts before dependency due date
- blocked dependency chain affects current month end date

---

### 8.5 Subtask backend endpoints

Add:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/tasks/:id/subtasks` | List subtasks. |
| `POST` | `/tasks/:id/subtasks` | Create subtask under parent. |
| `PATCH` | `/tasks/:id/subtasks/reorder` | Reorder subtasks. |
| `PATCH` | `/subtasks/:id` | Update subtask. |
| `DELETE` | `/subtasks/:id` | Delete subtask. |

Subtask DTO:

```ts
export class CreateSubtaskDto {
  @IsString()
  title: string;

  @IsUUID()
  assigned_to: string;

  @IsOptional()
  @IsISO8601()
  due_date?: string;

  @IsOptional()
  @IsNumber()
  estimated_hours?: number;
}
```

Subtask rules:

- Subtask must belong to same tenant as parent.
- Subtask should inherit workflow/client from parent by default.
- Parent task shows progress count: `completed_subtasks / total_subtasks`.
- Parent cannot be completed while required subtasks are incomplete.
- Parent auto-completes only if product rule allows auto-completion.
- If all subtasks are completed, notify assignee/PM that parent is ready for completion or auto-complete based on chosen rule.

Recommended rule:

- For MVP, do **not** silently auto-complete parent.
- Mark parent as `ready_for_completion` or show CTA to complete parent.
- If PRD strictly requires auto-completion, implement auto-complete with activity log.

---

### 8.6 Acceptance criteria

- PM can add/remove dependencies manually.
- System prevents circular dependencies.
- Task cannot start when prerequisites are incomplete.
- UI clearly shows “Blocked by dependency,” separate from real blockers.
- Workflow graph shows predecessor/successor chains.
- Subtasks have own status and assignee.
- Parent task shows subtask progress count.
- Dependency and subtask changes are audit logged.

---

## 9. Time Tracking

### 9.1 Current issue

The database has `TimeEntry`, but there is no visible complete time-entry API/UI flow.

Phase 2 requires:

- log time entries per task
- hours/date/description
- billing and capacity usage
- time reports by client/team/date range
- CSV export as a should-have

---

### 9.2 Backend module

Create:

```text
backend/src/time-entries/
├── time-entries.module.ts
├── time-entries.controller.ts
├── time-entries.service.ts
├── time-entries.repository.ts
└── dto/
    ├── create-time-entry.dto.ts
    ├── update-time-entry.dto.ts
    └── time-entry-report-query.dto.ts
```

Import into `AppModule`:

```ts
imports: [
  // existing modules...
  TimeEntriesModule,
]
```

---

### 9.3 API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/tasks/:taskId/time-entries` | Log time against task. |
| `GET` | `/tasks/:taskId/time-entries` | List task time entries. |
| `PATCH` | `/time-entries/:id` | Edit time entry. |
| `DELETE` | `/time-entries/:id` | Delete time entry. |
| `GET` | `/time-entries/report` | Aggregate by client/user/date range. |
| `GET` | `/time-entries/export.csv` | Export CSV. |

Create DTO:

```ts
export class CreateTimeEntryDto {
  @IsNumber()
  @Min(0.25)
  @Max(24)
  hours: number;

  @IsISO8601()
  date: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_billable?: boolean;
}
```

Report query DTO:

```ts
export class TimeEntryReportQueryDto {
  @IsOptional()
  @IsUUID()
  client_id?: string;

  @IsOptional()
  @IsUUID()
  user_id?: string;

  @IsISO8601()
  start_date: string;

  @IsISO8601()
  end_date: string;
}
```

---

### 9.4 Permission rules

| Role | Permission |
|---|---|
| Team Member | Add/edit own time entries for assigned tasks. |
| Project Manager | View team time for own tenant/client workflows. |
| Super Admin | View all tenant time entries. |
| Client | No internal time-entry access unless a future billable summary is exposed. |

Rules:

- User cannot log time for another tenant.
- Team member cannot log time on unassigned task unless PM allows.
- Editing old entries can be restricted after a lock period.
- Deleted entries should either hard delete or be soft-deleted with audit log. For auditability, soft-delete is better.

Recommended schema improvement:

```prisma
model TimeEntry {
  // existing fields...
  updated_at DateTime @updatedAt @db.Timestamptz
  deleted_at DateTime? @db.Timestamptz
}
```

---

### 9.5 Frontend UI

Add:

1. **Task Detail → Time tab**
   - log hours
   - date
   - description
   - billable toggle
   - list previous entries

2. **Daily Time Log page**
   - user logs all work for the day
   - grouped by task/client

3. **Time Reports page**
   - filter by client
   - filter by team member
   - date range
   - total hours
   - billable hours
   - export CSV

Acceptance criteria:

- A user can log time on a task.
- PM can see total hours by client and user.
- CSV export works.
- Actual logged time can feed utilization and reporting.
- All mutations are audit logged.

---

## 10. Blocker Management v2

### 10.1 Correct escalation rule

Automatic escalation is based on blocker age:

```text
now - blocker.flagged_at >= severity threshold
```

It is not based on task due date.
It is not based on task estimated hours.

---

### 10.2 Required data additions

Option A: Add fields directly to `Blocker`.

```prisma
model Blocker {
  // existing fields...
  escalated_at              DateTime? @db.Timestamptz
  escalation_level          Int       @default(0)
  last_escalation_sent_at   DateTime? @db.Timestamptz
}
```

Option B: Better auditability with separate history table.

```prisma
model BlockerEscalation {
  id            String   @id @default(uuid()) @db.Uuid
  tenant_id     String   @db.Uuid
  blocker_id    String   @db.Uuid
  level         Int
  reason        String
  recipients    Json     @default("[]")
  created_at    DateTime @default(now()) @db.Timestamptz

  @@index([tenant_id, blocker_id, created_at])
  @@schema("erp")
}
```

Recommendation:

Use both:

- `Blocker.escalation_level` for quick state.
- `BlockerEscalation` for history.

---

### 10.3 Scheduler

Install/use NestJS scheduler module.

Job:

```text
BlockerEscalationJob
Frequency: every 1 hour or daily at 09:00
```

Pseudocode:

```ts
for each tenant:
  thresholds = getTenantEscalationSettingsOrDefault()

  openBlockers = findOpenBlockers()

  for blocker in openBlockers:
    thresholdDays = thresholds[blocker.severity]
    if blocker.flagged_at <= now - thresholdDays:
      if not alreadyEscalatedForCurrentLevel(blocker):
        escalate(blocker)
```

Default thresholds:

```ts
const DEFAULT_BLOCKER_ESCALATION_THRESHOLDS = {
  high: 3,
  medium: 5,
  low: 7,
};
```

Production safety:

- Add job lock to prevent duplicate execution if multiple backend instances run.
- Store delivery logs to avoid duplicate emails.
- Escalate only open blockers.
- Do not escalate resolved blockers.

---

### 10.4 Escalation recipients

Suggested recipients:

| Severity | Recipients |
|---|---|
| Low | blocker assignee, task assignee |
| Medium | blocker assignee, task assignee, PM |
| High | blocker assignee, task assignee, PM, Account Manager/Client Partner, Super Admin if repeated |

Each escalation should create:

- in-app notification
- email through Resend where enabled
- activity log
- blocker escalation history entry

---

### 10.5 Resend email integration

Add:

```text
backend/src/mail/
├── mail.module.ts
├── mail.service.ts
├── providers/resend.provider.ts
└── templates/
    ├── blocker-escalated.template.ts
    ├── blocker-created.template.ts
    ├── task-assigned.template.ts
    ├── task-overdue.template.ts
    └── daily-digest.template.ts
```

Environment variables:

```env
RESEND_API_KEY=
RESEND_FROM_EMAIL=notifications@yourdomain.com
RESEND_FROM_NAME=Cherp ERP
```

Mail service interface:

```ts
interface SendMailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  metadata?: Record<string, string>;
}
```

Acceptance criteria:

- Open high blocker escalates after 3 days.
- Medium blocker escalates after 5 days.
- Low blocker escalates after 7 days.
- Resolved blockers do not escalate.
- Duplicate escalation emails are not sent repeatedly.
- Escalation appears in blocker activity history.

---

## 11. Month Planning

### 11.1 Current issue

Existing readiness logic is only the first step. The product still needs full month planning:

- start date algorithm
- PM alerts
- planning timeline
- preview next month
- generate next month workflow
- prepopulate tasks from scope template

---

### 11.2 Data model additions

Option A: minimal fields on Workflow.

```prisma
model Workflow {
  // existing fields...
  planning_status       String?   @default("not_started")
  generated_from_id     String?   @db.Uuid
  planning_confirmed_by String?   @db.Uuid
  planning_confirmed_at DateTime? @db.Timestamptz
}
```

Option B: separate planning table.

```prisma
model MonthPlanningRun {
  id                   String   @id @default(uuid()) @db.Uuid
  tenant_id            String   @db.Uuid
  client_id            String   @db.Uuid
  current_workflow_id  String   @db.Uuid
  next_month_number    Int
  proposed_start_date  DateTime @db.Date
  alert_date           DateTime @db.Date
  status               String   @default("pending")
  preview_payload      Json     @default("{}")
  created_at           DateTime @default(now()) @db.Timestamptz
  confirmed_by         String?  @db.Uuid
  confirmed_at         DateTime? @db.Timestamptz

  @@unique([tenant_id, client_id, next_month_number])
  @@index([tenant_id, status, alert_date])
  @@schema("erp")
}
```

Recommendation:

Use `MonthPlanningRun` for cleaner lifecycle and auditability.

---

### 11.3 Start date algorithm

PRD formula:

```text
buffer = service_duration_days * 0.2
next_start_date = previous_month_end_date + buffer
alert_date = next_start_date - 14 days
```

Example:

```text
Current workflow end date: 2026-08-31
Service duration: 30 days
Buffer: 6 days
Next start date: 2026-09-06
Alert date: 2026-08-23
```

Implementation notes:

- Round buffer up to nearest whole day.
- If client contract end date is before next month start, mark not ready.
- If no active template exists, mark blocked.
- If no PM assigned, mark blocked.
- If team assignment cannot resolve target roles, mark needs attention.

---

### 11.4 Backend endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/month-planning` | Planning timeline across clients. |
| `GET` | `/workflows/:id/next-month-preview` | Preview next generated workflow. |
| `POST` | `/workflows/:id/generate-next-month` | Confirm and generate next month. |
| `PATCH` | `/month-planning/:id` | Update planning date/status. |
| `POST` | `/month-planning/:id/confirm` | Confirm a planning run. |

Preview response:

```json
{
  "client_id": "uuid",
  "current_month": 1,
  "next_month": 2,
  "proposed_start_date": "2026-09-06",
  "alert_date": "2026-08-23",
  "readiness_status": "ready",
  "tasks_preview": [
    {
      "title": "Campaign optimization",
      "target_role": "PPC Specialist",
      "assigned_to": "uuid",
      "estimated_hours": 6,
      "due_date": "2026-09-10"
    }
  ],
  "warnings": []
}
```

---

### 11.5 Generation rules

When PM confirms:

1. Start database transaction.
2. Verify no existing workflow for same client + month number.
3. Load active scope template.
4. Generate workflow.
5. Generate tasks from template month section.
6. Resolve assignees.
7. Resolve dependencies from template keys to generated task IDs.
8. Carry over unfinished tasks only if product rule says so.
9. Write activity logs.
10. Create PM notification.
11. Commit transaction.

Duplicate prevention:

```prisma
@@unique([tenant_id, client_id, month_number])
```

Only add if current data is clean.

---

### 11.6 Frontend UI

Planning page columns:

| Column | Description |
|---|---|
| Client | Client name/status. |
| Current month | Active workflow month. |
| Completion | Current month completion %. |
| Current end date | Workflow end date. |
| Next start date | Algorithm output. |
| Alert date | Notification trigger date. |
| Readiness | Ready / Needs template / Needs PM / Contract ending / Blocked. |
| Actions | Preview / Generate / Adjust. |

Acceptance criteria:

- PM can see all clients needing next-month planning.
- PM can preview next workflow before creation.
- Confirming creates the next workflow and tasks.
- Duplicate month workflows cannot be generated.
- PM gets alert 14 days before next month should start.

---

## 12. Reporting Hub

### 12.1 Current issue

Task analytics and daily reports are not enough to satisfy the Phase 2 Reporting Hub. The PRD requires campaign result logging, channel breakdown, content performance, and PDF export.

---

### 12.2 Data models

#### CampaignResult

```prisma
model CampaignResult {
  id              String   @id @default(uuid()) @db.Uuid
  tenant_id       String   @db.Uuid
  client_id       String   @db.Uuid
  campaign_name   String
  channel         String
  start_date      DateTime @db.Date
  end_date        DateTime @db.Date
  ad_spend        Decimal? @db.Decimal(12, 2)
  impressions     Int?
  clicks          Int?
  leads           Int?
  conversions     Int?
  revenue         Decimal? @db.Decimal(12, 2)
  cpl             Decimal? @db.Decimal(12, 2)
  roas            Decimal? @db.Decimal(12, 2)
  notes           String?
  created_by      String   @db.Uuid
  created_at      DateTime @default(now()) @db.Timestamptz
  updated_at      DateTime @updatedAt @db.Timestamptz

  @@index([tenant_id, client_id, start_date, end_date])
  @@index([tenant_id, channel])
  @@schema("erp")
}
```

#### ContentPerformance

```prisma
model ContentPerformance {
  id                String   @id @default(uuid()) @db.Uuid
  tenant_id         String   @db.Uuid
  client_id         String   @db.Uuid
  title             String
  content_type      String
  channel           String?
  published_at      DateTime? @db.Date
  views             Int?
  engagement_rate   Decimal? @db.Decimal(6, 2)
  leads_attributed  Int?
  url               String?
  notes             String?
  created_by        String   @db.Uuid
  created_at        DateTime @default(now()) @db.Timestamptz
  updated_at        DateTime @updatedAt @db.Timestamptz

  @@index([tenant_id, client_id, published_at])
  @@schema("erp")
}
```

#### ClientReport

```prisma
model ClientReport {
  id          String   @id @default(uuid()) @db.Uuid
  tenant_id   String   @db.Uuid
  client_id   String   @db.Uuid
  title       String
  period_start DateTime @db.Date
  period_end   DateTime @db.Date
  status      String   @default("draft")
  pdf_url     String?
  generated_by String? @db.Uuid
  generated_at DateTime? @db.Timestamptz
  published_at DateTime? @db.Timestamptz
  created_at  DateTime @default(now()) @db.Timestamptz
  updated_at  DateTime @updatedAt @db.Timestamptz

  @@index([tenant_id, client_id, period_start, period_end])
  @@schema("erp")
}
```

---

### 12.3 Backend endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/reporting/campaign-results` | Create campaign result. |
| `GET` | `/reporting/campaign-results` | List campaign results. |
| `PATCH` | `/reporting/campaign-results/:id` | Update campaign result. |
| `DELETE` | `/reporting/campaign-results/:id` | Delete campaign result. |
| `GET` | `/reporting/channel-breakdown` | Channel comparison. |
| `POST` | `/reporting/content-performance` | Add content performance. |
| `GET` | `/reporting/content-performance` | List content performance. |
| `POST` | `/reports` | Create draft client report. |
| `POST` | `/reports/:id/generate-pdf` | Generate PDF report. |
| `POST` | `/reports/:id/publish` | Publish report to client dashboard. |
| `GET` | `/reports/:id/download` | Download report PDF. |

---

### 12.4 Calculated metrics

Backend should calculate derived values if raw values are available:

```text
CTR = clicks / impressions * 100
CPL = ad_spend / leads
Conversion Rate = conversions / clicks * 100
ROAS = revenue / ad_spend
```

Rules:

- Avoid division by zero.
- Allow manual override if user enters CPL/ROAS directly.
- Store raw input and calculated values consistently.

---

### 12.5 PDF export

Recommended flow:

1. Backend gathers report data.
2. Backend renders HTML report template.
3. PDF generator converts HTML to PDF.
4. PDF stored in object storage.
5. `ClientReport.pdf_url` saved.
6. Client portal exposes PDF only after report is published.

Report sections:

- cover summary
- KPI cards
- campaign performance table
- channel breakdown chart
- content performance table
- completed deliverables
- upcoming work
- notes/recommendations

Acceptance criteria:

- PM can manually enter campaign performance.
- PM can view channel breakdown.
- PM can track content performance.
- PM can generate PDF.
- PM can publish PDF to client portal.
- Client can download only published reports.

---

## 13. Client Dashboard / Client Portal

### 13.1 Target PRD features

The client portal should include:

- today’s work view
- progress tracker
- milestone timeline
- deliverable downloads
- client login with restricted access

---

### 13.2 Access model

Client access should be based on `ClientUser` links.

Rules:

- Client role can only access linked clients.
- Client cannot access internal dashboard.
- Client cannot access users, scope templates, internal blockers, costs, time entries, or audit logs.
- Client can see only client-visible tasks/reports/assets.

---

### 13.3 Backend endpoints

Add or expand:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/client-portal/me` | Current client portal context. |
| `GET` | `/client-portal/dashboard` | Summary dashboard for linked client. |
| `GET` | `/client-portal/tasks/today` | Today’s work. |
| `GET` | `/client-portal/progress` | Current month progress. |
| `GET` | `/client-portal/milestones` | Completed/upcoming milestones. |
| `GET` | `/client-portal/downloads` | Reports/assets. |
| `PATCH` | `/client-portal/tasks/:id/approve` | Client approval for allowed tasks. |
| `PATCH` | `/client-portal/tasks/:id/request-changes` | Client requests change if allowed. |

Dashboard response example:

```json
{
  "client": {
    "id": "uuid",
    "name": "ABC Healthcare"
  },
  "current_workflow": {
    "id": "uuid",
    "month_number": 2,
    "completion_percentage": 64
  },
  "today_work": [
    {
      "title": "Ad copy revisions",
      "status": "ongoing",
      "client_visible_status": "In progress"
    }
  ],
  "milestones": [
    {
      "title": "Landing page live",
      "date": "2026-08-22",
      "status": "completed"
    }
  ],
  "downloads": [
    {
      "title": "July Performance Report",
      "type": "pdf",
      "url": "signed-url"
    }
  ]
}
```

---

### 13.4 Frontend pages

Client layout:

```text
Client Portal
├── Overview
│   ├── Progress card
│   ├── Today’s work
│   └── Pending approvals
├── Timeline
├── Reports & Downloads
└── Profile / Settings
```

Hide internal navigation:

- users
- team capacity
- scope templates
- audit logs
- internal blocker notes
- billing/costs
- time tracking

---

### 13.5 Task approval flow

Use existing status if compatible:

```text
task_approved_by_manager -> waiting_client_approval -> task_approved_by_client
```

If current statuses cannot be changed now, use:

- `task_approved_by_manager`
- client approves into `task_approved_by_client`
- client requests changes into `rework`

Acceptance criteria:

- Client login routes to client dashboard.
- Client cannot access internal routes by URL.
- Client sees only linked client data.
- Client can download published reports/assets.
- Client can approve/request changes on eligible tasks.

---

## 14. Notification System

### 14.1 Current issue

Current implementation has in-app notifications and read state, but Phase 2 requires:

- task assignment emails/in-app
- blocker escalations
- deadline reminders
- daily digest
- notification preferences
- email channel
- mark all read

---

### 14.2 Notification types

Standardize notification types:

```ts
export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_STATUS_CHANGED = 'task_status_changed',
  TASK_OVERDUE = 'task_overdue',
  TASK_DUE_SOON = 'task_due_soon',
  TASK_APPROVAL_REQUESTED = 'task_approval_requested',
  TASK_APPROVED = 'task_approved',
  TASK_REWORK_REQUESTED = 'task_rework_requested',
  COMMENT_MENTION = 'comment_mention',
  BLOCKER_FLAGGED = 'blocker_flagged',
  BLOCKER_RESOLVED = 'blocker_resolved',
  BLOCKER_ESCALATED = 'blocker_escalated',
  MONTH_PLANNING_ALERT = 'month_planning_alert',
  DAILY_DIGEST = 'daily_digest',
  REPORT_PUBLISHED = 'report_published'
}
```

---

### 14.3 Notification preferences API

Current schema has preferences but controller needs endpoints.

Add:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/notification-preferences` | Get current user preferences. |
| `PATCH` | `/notification-preferences` | Bulk update preferences. |
| `PATCH` | `/notification-preferences/:type` | Update one type. |

Preference response:

```json
{
  "preferences": [
    {
      "notification_type": "task_assigned",
      "in_app_enabled": true,
      "email_enabled": true
    },
    {
      "notification_type": "daily_digest",
      "in_app_enabled": true,
      "email_enabled": false
    }
  ]
}
```

Default preferences:

| Type | In-app | Email |
|---|---|---|
| Task assigned | Yes | Yes |
| Task overdue | Yes | Yes |
| Blocker flagged | Yes | Yes |
| Blocker escalated | Yes | Yes |
| Month planning alert | Yes | Yes |
| Daily digest | Yes | Optional |
| Comment mention | Yes | Optional |

---

### 14.4 Delivery architecture

Notification flow:

```text
Domain event occurs
   ↓
NotificationService.createNotification()
   ↓
Check user preferences
   ↓
Create in-app notification if enabled
   ↓
Send email through MailService if enabled
   ↓
Write delivery log
```

Add delivery log model:

```prisma
model NotificationDeliveryLog {
  id              String   @id @default(uuid()) @db.Uuid
  tenant_id       String   @db.Uuid
  notification_id String?  @db.Uuid
  user_id         String   @db.Uuid
  channel         String
  type            String
  idempotency_key String
  status          String
  provider_id     String?
  error_message   String?
  created_at      DateTime @default(now()) @db.Timestamptz

  @@unique([tenant_id, idempotency_key])
  @@index([tenant_id, user_id, created_at])
  @@schema("erp")
}
```

Idempotency key examples:

```text
task_due_soon:{taskId}:{userId}:{date}
blocker_escalated:{blockerId}:{level}:{userId}
daily_digest:{userId}:{date}
month_planning_alert:{planningRunId}:{userId}
```

---

### 14.5 Deadline reminder scheduler

Job:

```text
TaskDeadlineReminderJob
Frequency: hourly or daily at 08:00
```

Rules:

- Due soon: incomplete tasks due in next 24 hours.
- Overdue: incomplete tasks with due date before now.
- Do not notify for completed/client-approved tasks.
- Do not notify repeatedly without idempotency window.

Recipients:

- task assignee
- PM/project manager
- optionally assignor

Acceptance criteria:

- User receives due-soon notification.
- User receives overdue notification.
- Duplicate reminder is not sent every scheduler run.
- Preferences are respected.

---

### 14.6 Daily digest scheduler

Job:

```text
DailyDigestJob
Frequency: daily at 08:30 local tenant time
```

Digest for team member:

- tasks due today
- overdue tasks
- tasks blocked by dependencies
- open blockers assigned to them
- comments/mentions from yesterday

Digest for PM:

- team overdue tasks
- blockers open
- tasks waiting approval
- month planning alerts
- high-capacity team members

Digest for Super Admin:

- aggregate active clients
- overdue tasks
- open high blockers
- capacity overload summary
- reports/month planning requiring attention

Acceptance criteria:

- Digest is generated once per user per day.
- Digest respects preferences.
- Digest includes only tenant-scoped data.
- Digest email uses Resend.

---

### 14.7 Notification controller improvements

Add:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/notifications` | Existing list. |
| `PATCH` | `/notifications/:id/read` | Existing mark read. |
| `PATCH` | `/notifications/read-all` | Mark all read. |
| `PATCH` | `/notifications/:id/unread` | Optional mark unread. |

Acceptance criteria:

- Bell count updates after read/read-all.
- Preferences page controls in-app/email behavior.
- Email notifications go through Resend.
- Schedulers create reminders and digests.

---

## 15. CRM Sync

### 15.1 Correct plan

CRM sync remains a Phase 2 PRD requirement, but it can be intentionally deferred until core ERP operational workflows are stable.

Keep it as:

```text
Later Phase 2 / Phase 3 integration work
```

Do not block the current implementation sequence on CRM.

---

### 15.2 Future CRM requirements

When implemented, CRM sync should cover:

- client data sync
- checklist sync
- CRM deal “Won” handoff into ERP onboarding
- bidirectional status updates where safe
- sync logs and retry handling

Future module:

```text
backend/src/crm-sync/
├── crm-sync.module.ts
├── crm-sync.controller.ts
├── crm-sync.service.ts
├── crm-sync.repository.ts
└── providers/sakhaa-crm.provider.ts
```

Future data model:

```prisma
model ExternalSyncMapping {
  id              String   @id @default(uuid()) @db.Uuid
  tenant_id       String   @db.Uuid
  local_entity    String
  local_entity_id String   @db.Uuid
  external_system String
  external_id     String
  sync_status     String
  last_synced_at  DateTime? @db.Timestamptz
  created_at      DateTime @default(now()) @db.Timestamptz

  @@unique([tenant_id, external_system, external_id])
  @@index([tenant_id, local_entity, local_entity_id])
  @@schema("erp")
}
```

---

## 16. Audit Log Hardening

### 16.1 Current risk

Activity logs exist, but coverage depends on every service manually writing logs.

For MVP, that is acceptable. For Phase 2 audit reliability, centralize it.

---

### 16.2 Recommended implementation

Create shared service:

```text
backend/src/activity-logs/audit-log.service.ts
```

Interface:

```ts
interface AuditLogInput {
  tenant_id: string;
  user_id?: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  before_values?: unknown;
  after_values?: unknown;
}
```

Usage:

```ts
await auditLogService.record({
  tenant_id,
  user_id,
  action_type: 'task_updated',
  entity_type: 'task',
  entity_id: task.id,
  before_values: oldTask,
  after_values: newTask,
});
```

Acceptance criteria:

- Create/update/delete actions are logged for core modules.
- Logs include before/after values where practical.
- Admin can filter logs by user/entity/date.
- Sensitive values such as secrets/tokens are never logged.

---

## 17. Database Migration Summary

High-priority migrations:

```prisma
model Client {
  contact_name  String
  contact_email String
}

model Task {
  estimated_hours Decimal? @db.Decimal(6, 2)
}

model User {
  weekly_available_hours Decimal? @db.Decimal(6, 2)
  sessions_revoked_at    DateTime? @db.Timestamptz
}
```

Recommended new models:

```text
AuthAttempt
BlockerEscalation
MonthPlanningRun
CampaignResult
ContentPerformance
ClientReport
NotificationDeliveryLog
```

Optional future models:

```text
UserAvailability
ExternalSyncMapping
```

Migration order:

1. Add nullable/new fields first.
2. Backfill existing data.
3. Add service validations.
4. Add UI validations.
5. Add non-null constraints/check constraints only after data is clean.

---

## 18. Backend Module Summary

New modules to add:

| Module | Purpose |
|---|---|
| `TimeEntriesModule` | Time logging and time reports. |
| `MailModule` | Resend email sending. |
| `SchedulerModule` or scheduled jobs inside modules | Deadline reminders, blocker escalations, digests, month planning alerts. |
| `ReportingModule` | Campaign results, content performance, PDF reports. |
| `MonthPlanningModule` | Planning timeline and workflow generation. |
| `ClientPortalModule` | Clean client-facing API boundary. |
| `NotificationPreferencesModule` or extension to Notifications | Preference management. |

Existing modules to extend:

| Module | Required extension |
|---|---|
| `AuthModule` | logout-all, rate-limited login wrapper if chosen. |
| `ClientsModule` | required contacts, client portal data, onboarding suggestions. |
| `ScopeTemplatesModule` | closest match logic, structured validation. |
| `TasksModule` | dependencies, subtasks, estimated hours, required assignee/due date logic. |
| `BlockersModule` | escalation state/history, scheduled escalation. |
| `DashboardModule` | real utilization and capacity alerts. |
| `NotificationsModule` | email channel, preferences, digest/reminders. |

---

## 19. Frontend Implementation Summary

New/updated frontend areas:

| Area | Required work |
|---|---|
| Auth | logout-all button, optional backend login wrapper, better auth error states. |
| Client onboarding | required contact fields, closest scope-template suggestions. |
| Scope templates | structured template builder and KPI builder. |
| Workflow detail | dependency panel, subtask panel, drag/drop verification. |
| Task drawer | estimated hours, time logging, dependency status, subtask progress. |
| Dashboard | planned/actual utilization and overload alerts. |
| Month planning | timeline, preview, generate next month. |
| Reporting hub | campaign entry, channel charts, content performance, PDF generation. |
| Client portal | external client dashboard, reports/downloads, approvals. |
| Notification settings | in-app/email preferences by notification type. |

---

## 20. Scheduler Jobs Summary

| Job | Frequency | Purpose |
|---|---|---|
| `BlockerEscalationJob` | Hourly or daily | Escalate blockers open beyond severity threshold. |
| `TaskDeadlineReminderJob` | Hourly or daily | Notify due-soon and overdue tasks. |
| `DailyDigestJob` | Daily | Send daily task/blocker/planning digest. |
| `MonthPlanningAlertJob` | Daily | Alert PM 14 days before next month should start. |
| `ReportPublishReminderJob` | Optional weekly/monthly | Remind PMs to publish client reports. |

Production requirements:

- Use distributed lock if multiple backend instances run.
- Store idempotency keys.
- Respect tenant timezone where available.
- Respect notification preferences.

---

## 21. Recommended Implementation Sequence

### Sprint 1 — Foundation hardening

1. Correct auth interpretation in docs.
2. Implement proper logout/logout-all.
3. Implement failed-login rate limiting strategy.
4. Make client contact fields required.
5. Add task `estimated_hours`.
6. Add user `weekly_available_hours`.
7. Enforce assignee/due-date rules at service/DTO level.

Deliverable:

- Phase 1 strictness and auth/session foundation are corrected.

---

### Sprint 2 — Scope templates and onboarding UX

1. Build closest scope-template suggestion API.
2. Add fallback suggestions to onboarding UI.
3. Build structured template task editor.
4. Build KPI framework editor.
5. Validate template JSON schema server-side.

Deliverable:

- Admin can manage templates without raw JSON.
- Onboarding does not fail awkwardly when no exact template exists.

---

### Sprint 3 — Dependencies and subtasks

1. Add dependency DTOs/endpoints.
2. Add cycle detection.
3. Add dependency graph API.
4. Add dependency status to task responses.
5. Build dependency UI.
6. Build subtask management UI/API.
7. Add Playwright drag/drop tests.

Deliverable:

- PRD dependency/subtask requirements become usable, not just schema-level.

---

### Sprint 4 — Time tracking and capacity

1. Add `TimeEntriesModule`.
2. Add task time-entry UI.
3. Add time reports and CSV export.
4. Replace capacity heuristic with hours/availability formula.
5. Add overload alerts at >80% utilization.

Deliverable:

- Capacity planning becomes PRD-aligned.

---

### Sprint 5 — Notifications, email, and schedulers

1. Add `MailModule` with Resend.
2. Add notification preferences API/UI.
3. Add delivery logs/idempotency keys.
4. Add blocker escalation scheduler.
5. Add deadline reminder scheduler.
6. Add daily digest scheduler.
7. Add mark-all-read endpoint.

Deliverable:

- Notification system becomes Phase 2-complete except any later CRM-specific notifications.

---

### Sprint 6 — Month planning

1. Add `MonthPlanningRun` model.
2. Add planning timeline API/UI.
3. Add next-month preview.
4. Add next-month workflow generation.
5. Add PM alert scheduler.
6. Add duplicate generation prevention.

Deliverable:

- Month planning moves from readiness-only to actual lifecycle automation.

---

### Sprint 7 — Reporting hub and client portal

1. Add campaign result model/API/UI.
2. Add content performance model/API/UI.
3. Add channel breakdown calculations.
4. Add PDF report generation.
5. Add report publishing.
6. Expand client portal dashboard.
7. Add client downloads and approvals.

Deliverable:

- Reporting Hub and Client Dashboard satisfy Phase 2 PRD more completely.

---

### Sprint 8 — Audit and CRM preparation

1. Centralize audit log service.
2. Verify audit coverage across modules.
3. Add CRM sync placeholder interfaces and mapping model if needed.
4. Document CRM sync as later Phase 2/Phase 3.

Deliverable:

- ERP core is stable and ready for integration work.

---

## 22. Acceptance Checklist

### Authentication

- [ ] Supabase login/refresh/reset interpretation documented correctly.
- [ ] Logout invalidates session as much as supported by architecture.
- [ ] Logout-all exists.
- [ ] Failed-login rate limiting is implemented or Supabase-side protection is explicitly accepted.
- [ ] Auth events are audit logged.

### Client onboarding

- [ ] `contact_name` required.
- [ ] `contact_email` required.
- [ ] Existing invalid client data cleaned.
- [ ] Closest template suggestions implemented.
- [ ] Onboarding UI handles no exact template.

### Scope templates

- [ ] Admin can edit task blueprint through UI.
- [ ] Admin can edit KPI framework through UI.
- [ ] Template JSON is schema-validated.
- [ ] Template dependencies/subtasks are supported.

### Workflows/tasks

- [ ] Normal task requires assignee.
- [ ] Normal task requires due date.
- [ ] Daily task requires slot.
- [ ] Estimated hours added.
- [ ] Drag/drop order persists.

### Dependencies/subtasks

- [ ] Dependency API exists.
- [ ] Cycle detection exists.
- [ ] Dependency graph exists.
- [ ] Dependency-blocked indicator exists.
- [ ] Subtask API/UI exists.
- [ ] Parent shows subtask progress.

### Time tracking/capacity

- [ ] Time-entry API exists.
- [ ] Time-entry UI exists.
- [ ] Time reports exist.
- [ ] CSV export exists.
- [ ] Capacity uses estimated hours / available hours.
- [ ] Overload alert at >80% exists.

### Blockers

- [ ] Auto-escalation scheduler exists.
- [ ] Severity thresholds implemented.
- [ ] Resend email escalation works.
- [ ] Escalation history/logging exists.
- [ ] Duplicate escalation prevention exists.

### Month planning

- [ ] Planning timeline exists.
- [ ] Next-month preview exists.
- [ ] Next-month generation exists.
- [ ] PM alert scheduler exists.
- [ ] Duplicate workflow generation is prevented.

### Reporting hub

- [ ] Campaign result logging exists.
- [ ] Channel breakdown exists.
- [ ] Content performance tracking exists.
- [ ] PDF export exists.
- [ ] Reports can be published to client portal.

### Client portal

- [ ] Client-only routing works.
- [ ] Client sees today’s work.
- [ ] Client sees progress tracker.
- [ ] Client sees milestone timeline.
- [ ] Client can download published reports/assets.
- [ ] Client can approve/request changes where allowed.

### Notifications

- [ ] Email channel exists through Resend.
- [ ] Preferences API exists.
- [ ] Preferences UI exists.
- [ ] Deadline reminder scheduler exists.
- [ ] Daily digest scheduler exists.
- [ ] Mark-all-read endpoint exists.
- [ ] Delivery idempotency exists.

### CRM and audit

- [ ] CRM sync is explicitly deferred and documented.
- [ ] Audit service is centralized.
- [ ] Core create/update/delete actions are logged.

---

## 23. Final Priority Ranking

1. Auth logout/session handling + failed-login rate limiting.
2. Required client contact fields and required task assignment/due-date validation.
3. Task estimated hours + user availability + true capacity formula.
4. Time tracking API/UI.
5. Notification email channel, preferences, reminders, and daily digest.
6. Blocker auto-escalation scheduler.
7. Dependency/subtask management API and UI.
8. Month planning generation.
9. Scope template builder and KPI builder.
10. Reporting Hub and PDF export.
11. Client portal completion.
12. Audit centralization.
13. CRM sync later.

---

## 24. Corrected Final Assessment

After correction, the main Phase 1 auth criticism should not be that backend login/refresh/reset endpoints are missing. The correct criticism is that **session invalidation, logout-all behavior, and failed-login rate limiting need deliberate implementation around Supabase Auth.**

The remaining Phase 1 fixes are mostly strictness and validation issues:

- required client contact fields
- required assignee/due-date rules for normal tasks
- template fallback UX
- drag/drop verification

The Phase 2 work is larger and should be treated as a structured implementation program:

- dependency/subtask usability
- time tracking
- real capacity planning
- blocker escalation automation
- Resend email notifications
- notification preferences
- deadline reminders
- daily digest
- month planning generation
- reporting hub
- client portal
- audit hardening
- later CRM sync

This plan should replace the earlier loose gap list and become the working engineering roadmap for closing Phase 1–2 PRD gaps.
