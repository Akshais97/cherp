# Agents.md — Agency Command Center ERP

## 1. Purpose

This file defines the operating rules for AI agents, coding assistants, and contributors working on the Agency Command Center ERP.

Agents must use this file as the first instruction layer before generating code, architecture, schemas, APIs, UI, tests, or documentation.

The goal is to keep implementation aligned with the current Phase 1 MVP and prevent accidental future-scope development.

---

## 2. Active Development Scope

Current implementation scope is strictly:

```txt
Phase 1 MVP only
```

Allowed Phase 1 scope:

- authentication foundation
- Supabase Auth integration
- RBAC authorization
- client onboarding
- scope template selection
- Month 1 workflow generation
- task checklist management
- task status tracking
- blocker logging and resolution
- internal dashboard
- activity logging
- tenant-aware data access
- modular monolith architecture

Do not implement future-phase functionality unless explicitly instructed.

---

## 3. Documentation Source Rules

Agents must read and follow only:

```txt
docs/current/
```

Agents must ignore:

```txt
docs/future/
```

This includes any nested future folder, for example:

```txt
docs/future/
docs/current/some-folder/future/
docs/**/future/
```

Future documents are for long-term awareness only.

They must not influence:

- database schema decisions
- API implementation
- frontend implementation
- backend service design
- folder structure
- state management
- infrastructure choices
- package selection
- workflow behavior
- testing scope

If current and future documents conflict, `docs/current/` always wins.

---

## 4. Required Current Documents

Agents should treat these current documents as implementation contracts when present:

```txt
docs/current/PRD.md
docs/current/Data_Models.md
docs/current/System_Designs.md
docs/current/Workflow.md
docs/current/backend.md
docs/current/frontend.md
docs/current/status_enums.md
docs/current/permissions_matrix.md
```

If a required detail is missing from current documents, do not invent it.

Use the smallest safe implementation that satisfies Phase 1, and tell the user as well. 

## Supporting Reference Documents

The following documents may provide supporting context but must not override implementation contracts:

docs/current/Design_Specs.md
---

## 5. Architecture Target

The current architecture target is:

```txt
One frontend
One backend
One PostgreSQL database
Modular monolith
REST API
Tenant-aware data access
```

Selected stack:

| Layer | Technology |
|---|---|
| Frontend | React + Vite + TypeScript |
| UI | TailwindCSS + shadcn/ui |
| Forms | React Hook Form + Zod |
| Server State | TanStack Query |
| API Client | Axios instance |
| Backend | NestJS + TypeScript |
| ORM | Prisma |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth + JWT |
| Docs | Swagger / OpenAPI |

---

## 6. Non-Negotiable Engineering Rules

Agents must enforce:

- SOLID principles
- OOP boundaries
- controller-service-repository separation
- DTO validation before service logic
- tenant isolation on every query
- RBAC on protected routes
- append-only activity logging for mutations
- Prisma access only through repositories/services
- no business logic in controllers
- no raw database access from frontend
- no tenant ID accepted from request body
- no hidden side effects outside explicit service calls

---

## 7. Backend Agent Rules

Backend agents must follow NestJS modular structure.

Allowed Phase 1 modules:

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

Backend rules:

- controllers handle HTTP only.
- services own business rules.
- repositories own Prisma queries.
- guards enforce authentication, roles, and ownership.
- DTOs validate all incoming payloads.
- Swagger must reflect implemented behavior only.
- every tenant-owned query must filter by `tenant_id`.
- every mutation must write an activity log where required.

Required transaction boundaries:

- client onboarding
- workflow generation
- batch task generation
- blocker creation
- blocker resolution
- workflow completion

---

## 8. Frontend Agent Rules

Frontend agents must keep the UI modular, typed, and API-driven.

Frontend rules:

- use React + TypeScript.
- use Vite project conventions.
- use TailwindCSS and shadcn/ui for UI.
- use React Hook Form + Zod for forms.
- use TanStack Query for server state.
- use one central Axios instance.
- do not fetch directly inside random components.
- do not duplicate server state into local state.
- do not make frontend authorization the source of truth.
- hide restricted UI actions, but rely on backend guards for security.

Required Phase 1 screens:

- login
- internal dashboard
- client list
- client onboarding
- client detail
- workflow detail
- task update UI
- blocker list
- blocker detail

---

## 9. Workflow Agent Rules

Agents must follow Phase 1 workflow behavior.

Client onboarding flow:

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

Rules:

- onboarding must be atomic.
- generated workflow tasks must not change when templates are edited later.
- Month 1 workflow is generated during onboarding.
- future month automation is not active in Phase 1.
- workflow completion is derived from task completion.
- dashboard metrics are derived data, not source-of-truth data.

---

## 10. Status and Enum Rules

Agents must use canonical enum values from `status_enums.md`.

General rules:

- use lowercase snake_case values.
- never invent duplicate enum names.
- never store UI labels as enum values.
- validate enum values in backend DTOs.
- map display labels separately in frontend.

Examples:

```txt
pending
in_progress
blocked
completed
active
paused
archived
open
resolved
high
medium
low
```

---

## 11. Permissions Rules

Agents must follow `permissions_matrix.md`.

Core rules:

- Super Admin has full access.
- Project Manager manages delivery operations.
- Team Member works only on assigned tasks and blockers.
- Client has read-only dashboard/progress access.
- Backend guards are mandatory.
- Frontend permission checks are UX only.
- Role checks must be combined with tenant and ownership checks.

---

## 12. Do Not Implement

Agents must not implement these unless explicitly instructed:

- microservices
- event-driven systems
- message queues
- CQRS
- workflow engines
- background job systems
- recurring workflows
- dependency engine
- notifications
- CRM sync
- billing
- SSO
- public APIs
- mobile apps
- AI features
- ML insights
- advanced analytics
- Gantt view
- Kanban view
- Slack integration
- email automation
- client portal mutation
- multi-agency provisioning
- marketplace features

If a future document mentions these, ignore it for current implementation.

---

## 13. File and Folder Rules

Agents should keep the codebase simple.

Do not create folders for future abstractions unless Phase 1 needs them.

Avoid:

```txt
microservices/
events/
queues/
workers/
ai/
ml/
billing/
integrations/
marketplace/
mobile/
```

Allowed high-level structure:

```txt
apps/
  frontend/
  backend/

docs/
  current/
  future/
```

Backend feature folders should map to current modules.
Frontend feature folders should map to current screens/domains.

---

## 14. API Rules

APIs must be REST-first.

Rules:

- use predictable `/api/...` routes.
- protect all non-public endpoints.
- validate all write DTOs.
- return consistent error shapes.
- never expose raw Prisma/database errors.
- document implemented APIs in Swagger.
- do not create public API/versioning layers for Phase 1 unless needed internally.

## 15. Changelog Rules

`CHANGELOG.md` is optional historical reference only.

It must not override implementation contracts inside `docs/current/`.

Only record meaningful:
- architectural decisions
- schema changes
- infrastructure changes
- workflow changes
- major feature milestones

Do not log:
- styling changes
- small fixes
- variable renames
- minor refactors
- routine implementation details

Keep entries concise and milestone-oriented.

Avoid auto-generated verbose summaries or duplicated git history.

---

## 16. Database Rules

Database design must follow current data models only.

Rules:

- use UUID primary keys.
- include `tenant_id` on tenant-owned tables.
- use timestamps consistently.
- preserve ERD relationships.
- use soft delete/archive where current docs specify it.
- do not add future tables unless required by current docs.
- do not add AI, billing, CRM, marketplace, or integration tables in Phase 1.

---

## 17. Validation Rules

Validation must happen in layers:

```txt
Frontend Zod Validation
→ Backend DTO Validation
→ Service Business Validation
→ Database Constraints
```

Rules:

- invalid payloads must not reach business logic.
- system-controlled fields must not be client-controlled.
- tenant ID must come from authenticated context.
- user ID must come from authenticated context.
- state transitions must be validated in services.

---

## 18. Output Rules for AI Agents

When generating code or documentation:

- be concise.
- avoid speculative future design.
- prefer simple explicit implementation.
- explain only what is necessary.
- do not create unused abstractions.
- do not add packages without clear Phase 1 need.
- do not change architecture without current-doc support.
- mention assumptions only when unavoidable.
- ask for clarification only when implementation would otherwise be unsafe.

---

## 19. Decision Priority

When rules conflict, follow this order:

1. User instruction in the current conversation
2. `Agents.md`
3. `docs/current/Workflow.md`
4. `docs/current/permissions_matrix.md`
5. `docs/current/status_enums.md`
6. `docs/current/backend.md`
7. `docs/current/frontend.md`
8. `docs/current/Data_Models.md`
9. `docs/current/System_Designs.md`
10. PRD Phase 1 scope
11. Future documents only when explicitly allowed

---

## 20. Final Principle

Build only what Phase 1 needs.

Prioritize:

```txt
Correctness > Cleverness
Current Scope > Future Scope
Maintainability > Premature Abstraction
Explicit Logic > Hidden Automation
Tenant Safety > Convenience
```

Agents must protect the project from scope creep.
