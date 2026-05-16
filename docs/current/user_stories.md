# user_stories.md — Phase 1 User Stories

## Purpose

Map Phase 1 user stories to the implemented CHERP product flows. This file reflects verified code reality only.

## Scope

- Phase 1 MVP only.
- Source of truth remains `.ai/Agents.md` and `docs/current/*`.
- Future-scope items from `docs/future/` are excluded.

## User Roles

- `super_admin`: full tenant control, user management, client/archive/template/workflow/task/blocker operations.
- `project_manager`: delivery operations, client onboarding/editing, workflows, tasks, blockers, dashboard.
- `team_member`: assigned clients/workflows/tasks only; can update assigned tasks and log blockers on assigned tasks.
- `client`: defined in RBAC, but mutation/client-portal flows are not active in Phase 1 internal MVP.

## Permission Summary

- Backend guards are the source of truth: `JwtAuthGuard` + `RolesGuard`.
- Tenant isolation comes from authenticated ERP user context, not request bodies.
- Frontend hides restricted actions for UX, but backend rejects unauthorized requests.
- Sensitive client financial/contract money fields are not returned to `team_member` client-detail requests.
- Dynamic permission-level editing is not implemented; Phase 1 uses fixed role permissions from `permissions_matrix.md`.

## End-to-End User Journey Map

1. User signs in through Supabase Auth.
2. Backend verifies Supabase JWT and resolves the ERP user row.
3. App shell shows role-appropriate navigation.
4. Admin manages users from Users.
5. PM seeds/selects active templates, onboards clients, and generates Month 1 workflows/tasks.
6. PM manages clients, tasks, assignments, blockers, and status changes.
7. Team member sees only assigned clients/workflows/tasks/dashboard data and works assigned tasks.
8. Dashboard derives tenant-scoped operational summaries from source tables.

## System Administrator Flow

- UI: `frontend/src/features/users/UserManagementPage.tsx`.
- API: `POST /api/users`, `GET /api/users`, `PATCH /api/users/:id`.
- Backend: `UsersController`, `UsersService`, `UsersRepository`.
- Permissions: create/update users require `super_admin`; user list allows `super_admin`/`project_manager`.
- Behavior:
  - Creates Supabase Auth user.
  - Creates tenant ERP user row.
  - Assigns role.
  - Writes Supabase metadata with `tenant_id`, `erp_user_id`, `role`, and `is_active`.
  - Allows role update and active/inactive toggle.

## Agency Owner Flow

- UI: Dashboard, Clients, Workflows, Blockers, Users for `super_admin`.
- Backend: all tenant-scoped Phase 1 modules.
- Financial visibility: protected from team members; PM/admin operational fields are available where needed.
- Role permission levels are fixed by code/docs, not editable dynamically in Phase 1.

## Project Manager Flow

- UI: Clients, Workflows, Blockers, Dashboard.
- Client onboarding validates details, uses an active scope template, and creates client + Month 1 workflow + tasks transactionally.
- PM can edit client profile fields, change status, assign tasks, create custom tasks, reorder task checklist, and resolve blockers.
- PM cannot access user role elevation or client archive-only admin action unless backend role permits it.

## Team Member Flow

- UI: Dashboard, Clients, Workflows, Blockers.
- Backend scoping:
  - Clients require an assigned task relationship.
  - Workflows require at least one assigned task.
  - Workflow detail returns only assigned tasks.
  - Dashboard summaries, deadlines, blockers, and client health are scoped to assigned work.
  - Recent activity is limited to the team member's own activity.
- Team members can update assigned tasks and log blockers on assigned tasks.
- Team members cannot create clients, create templates, create tasks, assign tasks, reorder tasks, resolve blockers, or manage users.

## Client Onboarding Flow

- UI: `ClientsPage` onboarding form.
- API: `POST /api/clients`.
- Validation: frontend Zod + backend DTO + service checks.
- Transaction:
  - Create client.
  - Create Month 1 workflow.
  - Copy template Month 1 tasks.
  - Write activity logs.
- Failure does not leave partial onboarding records.

## Workflow and Task Auto-Creation Flow

- Source: active `scope_templates.default_tasks`.
- Generated workflow is Month 1 only.
- Generated tasks are copied into `tasks`; later template edits do not mutate existing workflows.
- Workflow completion is recalculated from completed tasks.

## Client Overview Flow

- UI: Client directory and dashboard client-health table.
- API: `GET /api/clients`, `GET /api/dashboard/client-health`.
- Shows client name, industry, service, lifecycle status, progress, and blocker signals.
- Tenant and role visibility rules are enforced server-side.

## Client Editing Flow

- UI: Client detail edit form.
- API: `PATCH /api/clients/:id`, `PATCH /api/clients/:id/status`, `DELETE /api/clients/:id`.
- PM/admin can edit client profile/contract fields.
- Archive is admin-only.
- Team member receives read-only assigned-client detail.
- Existing workflow/task data is not destroyed during client edits.

## User Story Implementation Matrix

| User Story ID | Actor | User Story | Status | Implemented UI Flow | Backend/API Support | Permission Rules | Notes |
|---|---|---|---|---|---|---|---|
| US-001 | System Administrator | Create user accounts with roles | Fixed Now | Users page create form + directory | `POST /api/users`, `GET /api/users`, `PATCH /api/users/:id` | Create/update admin-only | Supabase Auth user + ERP row + metadata sync |
| US-002 | Team Member | Login and see only assigned clients/tasks | Fixed Now | Assigned work through Dashboard/Clients/Workflows/Blockers | Clients/workflows/tasks/blockers/dashboard scoping | Team member assigned-work filters server-side | Recent activity limited to own activity |
| US-003 | Agency Owner | Define permission levels / protect financials | Partial | Fixed RBAC behavior, Users role assignment | Guards + role enum + permission matrix | Static roles; financial fields hidden from team members | Dynamic permission editor is not Phase 1 implemented |
| US-004 | Project Manager | Onboard client and auto-create workflow/tasks/KPIs | Complete | Clients onboarding form + template preview | `POST /api/clients`, scope template lookup, transaction | PM/admin only | Month 1 workflow generated from active template |
| US-005 | Agency Owner | See all clients and status at a glance | Complete | Dashboard client health + client directory | `GET /api/clients`, dashboard APIs | Tenant-scoped; team member limited | Status/progress/blockers derived from source tables |
| US-006 | Project Manager | Edit client after onboarding | Complete | Client detail edit/status controls | `PATCH /api/clients/:id`, status/archive routes | PM/admin edit; admin archive | Edits do not regenerate/destroy workflow tasks |

## Acceptance Criteria

- Admin can create a user with email, full name, temporary password, and role.
- Admin can update role and active status.
- Unauthorized users cannot access user creation/update APIs.
- Team member data reads are tenant-scoped and assigned-work scoped.
- Team member UI does not show client onboarding, task creation, task assignment, task reorder, or user management.
- PM/admin onboarding creates client + workflow + tasks atomically.
- PM/admin client edits validate input and log changes.
- Dashboard and client overview use backend-derived data, not hardcoded UI data.
- Frontend shows loading, empty, and error states for major flows.

## Known Gaps or Deferred Items

- Dynamic permission-level editor is deferred/out of current Phase 1 scope; fixed RBAC is implemented.
- Client portal user journey is not active in Phase 1 internal MVP.
- "Logout from all devices" remains deferred; current logout is local Supabase session sign-out.
- Sub-200ms performance requires measured API timings and `EXPLAIN ANALYZE`; indexes alone are not proof.

