# backend.md — Agency Command Center ERP

## 1. Purpose

This file defines the Phase 1 backend architecture contract.

The backend must provide secure, modular, tenant-aware APIs for:

- authentication integration
- RBAC authorization
- client onboarding
- scope template resolution
- workflow generation
- task management
- blocker management
- dashboard aggregation
- activity logging

---

## 2. Selected Stack

| Area | Technology |
|---|---|
| Runtime | Node.js |
| Framework | NestJS |
| Language | TypeScript |
| ORM | Prisma |
| Database | Supabase PostgreSQL |
| Auth Provider | Supabase Auth |
| API Style | REST |
| Docs | Swagger / OpenAPI |
| Validation | DTO validation + pipes |
| Authorization | JWT guards + RBAC guards |
| Architecture | Modular monolith |

---

## 3. Backend Principles

The backend must follow:

- SOLID principles
- OOP boundaries
- modular monolith design
- tenant-aware data access
- transaction-safe workflow operations
- repository pattern
- strict DTO validation
- append-only activity logging

Correctness is more important than clever automation.

---

## 4. Module Structure

Recommended Phase 1 modules:

```txt
AuthModule
UsersModule
ClientsModule
ScopeTemplatesModule
WorkflowsModule
TasksModule
BlockersModule
DashboardModule
ActivityLogsModule
PrismaModule
CommonModule
```

Each module should own its controllers, services, DTOs, repositories, and guards where applicable.

---

## 5. Layer Responsibilities

| Layer | Responsibility |
|---|---|
| Controller | Route handling only |
| DTO | Request validation and typing |
| Guard | Authentication, role, and ownership enforcement |
| Service | Business rules and orchestration |
| Repository | Prisma access and query abstraction |
| Prisma | Database persistence |
| Activity Log Service | Audit trail creation |

Rules:

- controllers must not contain business logic.
- controllers must not call Prisma directly.
- services must not expose raw database behavior to controllers.
- repositories must not decide workflow business rules.
- tenant filtering must happen in every repository query.

---

## 6. Authentication

Supabase Auth handles identity and password security.

Backend responsibilities:

- verify JWT
- extract `auth_user_id`
- load matching ERP user
- attach user context to request
- enforce `is_active`
- enforce tenant context

The API must not manually store or process plaintext passwords.

---

## 7. Authorization

Use layered guards:

```txt
JwtAuthGuard
→ ActiveUserGuard
→ RolesGuard
→ TenantOwnershipGuard
```

Authorization must enforce:

- role permission
- tenant boundary
- entity ownership where required
- assigned-task restrictions for team members
- read-only access for client users

Never trust role, tenant, or user IDs from request body.

---

## 8. Tenant-Aware Data Access

Every tenant-owned query must include:

```ts
where: {
  tenant_id: currentTenantId
}
```

Applies to:

- users
- clients
- scope templates
- workflows
- tasks
- blockers
- activity logs
- comments
- attachments
- time entries
- notifications

No cross-tenant aggregate query is allowed in Phase 1.

---

## 9. Core API Groups

### Auth / Users

```txt
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/users
GET    /api/users
GET    /api/users/team-members
GET    /api/users/team-members/:id/workload
PATCH  /api/users/:id
DELETE /api/users/:id
```

### Clients

```txt
POST   /api/clients
GET    /api/clients
GET    /api/clients/:id
PATCH  /api/clients/:id
PATCH  /api/clients/:id/status
DELETE /api/clients/:id
```

### Workflows / Tasks

```txt
GET    /api/workflows
GET    /api/workflows/:id
GET    /api/clients/:id/workflows
POST   /api/workflows/:id/tasks
PATCH  /api/tasks/:id
PATCH  /api/tasks/:id/complete
```

### Blockers

```txt
POST   /api/blockers
GET    /api/blockers
GET    /api/blockers/:id
PATCH  /api/blockers/:id/resolve
```

### Dashboard

```txt
GET    /api/dashboard/summary
GET    /api/dashboard/client-health
GET    /api/dashboard/upcoming-deadlines
GET    /api/dashboard/open-blockers
GET    /api/dashboard/recent-activity
```

---

## 10. Transaction Boundaries

The following operations must use Prisma transactions:

- client onboarding
- Month 1 workflow generation
- batch task generation
- blocker creation
- blocker resolution
- workflow completion

Transaction rule:

```txt
Either all related records persist, or none persist.
```

No partial workflow state is allowed.

---

## 11. Client Onboarding Service Contract

Client onboarding must execute:

```txt
Validate DTO
→ Resolve active scope template
→ Create client
→ Create Month 1 workflow
→ Generate tasks from template
→ Set initial completion = 0
→ Write activity logs
→ Commit transaction
```

If any step fails, rollback the full transaction.

---

## 12. Workflow Rules

Backend owns workflow state transitions.

Rules:

- workflows cannot complete with open blockers.
- completion percentage is calculated from tasks.
- generated workflow tasks are independent from future template edits.
- Month 1 workflow is generated during onboarding.
- future month automation is not active in Phase 1.

---

## 13. Task Rules

Backend owns task state transitions.

Rules:

- task status must use canonical enum values.
- completing a task sets `completed_at` and `completed_by`.
- blocked tasks cannot be completed directly.
- task updates must create activity logs.
- team members may update only assigned tasks.

Completion formula:

```txt
completed_tasks / total_tasks × 100
```

---

## 14. Blocker Rules

Creating a blocker must:

```txt
Create blocker
→ Link task
→ Link client
→ Set task status = blocked
→ Write activity log
```

Resolving a blocker must:

```txt
Set blocker resolved
→ Set resolved_at and resolved_by
→ Restore task to in_progress only if no open blockers remain
→ Write activity log
```

---

## 15. Dashboard Aggregation

Dashboard APIs return derived data.

Source tables remain:

- clients
- workflows
- tasks
- blockers
- activity logs

Dashboard should not become a source-of-truth table in Phase 1.

Health rules:

```txt
completion >= 70%      → on_track
completion 50% to 69%  → at_risk
completion < 50%       → off_track
```

---

## 16. Validation Rules

All write endpoints must validate:

- required fields
- enum values
- UUID format
- tenant ownership
- relationship integrity
- allowed state transition
- role permission

Reject invalid data before business logic executes.

---

## 17. Activity Logging

Every mutation must create an activity log.

Required for:

- client creation/update/status change
- workflow creation/update/completion
- task creation/update/completion
- blocker creation/resolution
- user role-sensitive updates

Activity logs should include:

```txt
tenant_id
user_id
action_type
entity_type
entity_id
before_values
after_values
created_at
```

Logs must be append-only.

---

## 18. Swagger / OpenAPI

All APIs must be documented with:

- endpoint purpose
- auth requirement
- request DTO
- response shape
- error responses
- role access notes

Swagger must reflect actual backend behavior, not aspirational APIs.

---

## 19. Error Handling

Use consistent error responses.

Common cases:

| Error | HTTP |
|---|---:|
| Validation failed | 400 |
| Unauthenticated | 401 |
| Forbidden | 403 |
| Entity not found | 404 |
| Conflict / duplicate | 409 |
| Server error | 500 |

Never expose raw Prisma or database errors to the client.

---

## 20. Phase 1 Non-Goals

Do not implement:

- event bus
- CQRS
- background jobs
- recurring workflows
- AI services
- ML insights
- dependency engine
- notification engine
- SLA escalation
- public API
- billing
- multi-agency provisioning

Prepare clean boundaries for later phases, but do not activate unfinished behavior.
