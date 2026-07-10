# features.md — Phase 1 Implemented Features

## Slice 1 — Identity + App Shell

- Supabase Auth client setup in frontend.
- Frontend auth provider with current user context: name, role, avatar URL.
- Central Axios API client with Supabase bearer token attachment.
- NestJS JWT guard validating Supabase access tokens.
- RBAC roles: `super_admin`, `project_manager`, `team_member`, `client`.
- Internal app shell with sidebar navigation.
- Collapsible sidebar/hamburger control to reduce page overflow on dense Phase 1 screens.
- CHERP branding applied to login, app shell, fallback user label, and favicon using the provided logo asset.
- Workflow task edit forms use structured primary/secondary rows for consistent input alignment.
- Dashboard shell with metric cards and client-health preview.
- Protected backend dashboard endpoints.
- Supabase sign-in rate-limit errors are normalized to a clear 5-minute retry message in the login UI.
- Global backend exception filter with safe API error responses for HTTP and Prisma errors.
- App-level React error boundary catches render failures and shows a resettable fallback.
- Prisma base schema expanded for Phase 1 ERP entities.
- Supabase SQL schema for `erp` schema tables and canonical enums/checks.

## Slice 2 — Templates + Client Onboarding

- Scope Template backend module.
- Protected template list endpoint: `GET /api/scope-templates`.
- Protected explicit seed endpoint: `POST /api/scope-templates/seed`.
- Seven Phase 1 industry presets with JSONB Month 1 task blueprints and KPI framework.
- Client backend module.
- Client directory endpoint: `GET /api/clients`.
- Client onboarding endpoint: `POST /api/clients`.
- Client creation restricted to `super_admin` and `project_manager`.
- Atomic client onboarding transaction:
  - creates client
  - creates Month 1 workflow
  - copies template task data into workflow tasks
  - writes activity logs
- Contract end date is calculated from contract start + duration months.
- Payment terms and renewal date are stored as explicit client contract fields.
- Frontend Clients screen with sortable client directory.
- Two-column onboarding UI with metadata form and live template task preview.
- Empty-state action to seed tenant templates before onboarding.

## RestOfSlide1&2 — Foundation + Onboarding Gaps

- Admin-only user creation via `POST /api/auth/register`; Supabase Auth owns passwords, ERP stores profile/role only.
- Tenant users API: `GET /api/users` for PM/Admin and `PATCH /api/users/:id` for Super Admin updates.
- Super Admin user deletion via `DELETE /api/users/:id`, guarded against self-delete, last-Super-Admin delete, and protected historical references.
- Team Members tab backed by `GET /api/users/team-members` and `GET /api/users/team-members/:id/workload` for searchable members, assigned tasks, and related blockers.
- Supabase password reset delegation through `POST /api/auth/forgot-password` and login-page reset action.
- Clear backend auth failures for missing bearer, invalid/expired token, inactive ERP user, missing ERP user, and forbidden role.
- Client lifecycle APIs: detail, edit, status change, and soft archive.
- Client list search/filter by name, industry, service type, and status.
- Frontend client detail panel with editable profile fields and linked Month 1 workflow summary.
- Scope template CRUD, detail, deactivate, seed audit logging, and exact/fallback resolution endpoint.
- Scope template preview now includes duration and KPI framework, not only task list.
- Client Onboarding and Client Directory are separate sidebar tabs.
- Client Onboarding uses a step workflow: Client Details, Scope Templates, Review/Confirm.
- Client Onboarding Review uses the full step width, and client creation shows pending, success, and readable failure alerts.
- Client Directory uses a responsive master-detail layout with the selected client detail on the right on desktop.
- Client Directory table containment keeps the Status column visible in the left list panel.

## Slice 3 — Workflows + Tasks

- Workflow APIs: `GET /api/workflows`, `GET /api/workflows/:id`, and `GET /api/clients/:id/workflows`.
- Task APIs: `POST /api/workflows/:id/tasks`, `PATCH /api/tasks/:id`, and `PATCH /api/tasks/:id/complete`.
- Workflow detail UI with checklist, assignee, due date, priority, status badge, blocker indicator, and progress bar.
- Workflow task cards are accordion-based with one open card at a time.
- Task cards use priority-colored left rails: high red, medium amber, low neutral gray.
- Custom task creation UI using React Hook Form and Zod.
- Task edit UI for title, description, due date, and priority using React Hook Form and Zod.
- Task checklist reorder via drag handles backed by persisted `sort_order`.
- Task status, assignment, priority, and completion controls.
- Task state transition validation and blocked-task completion guard.
- Workflow completion recalculation after task mutations.
- Activity logs for task creation, assignment, updates, status changes, and completion.
- Focused Slice 3 backend tests and Selenium browser coverage for task editing/execution.
- Selenium coverage now checks sidebar collapse/expand and horizontal overflow across login, dashboard, clients, and workflow task screens.

## Slice 4 — Blockers

- Blocker APIs: `POST /api/blockers`, `GET /api/blockers`, `GET /api/blockers/:id`, and `PATCH /api/blockers/:id/resolve`.
- Blocker creation validates tenant task ownership and team-member assigned-task ownership.
- Creating a blocker is transactional: creates blocker, blocks task, recalculates workflow completion, and writes activity logs.
- Resolving a blocker is transactional: sets resolution fields, restores the task to `in_progress` only when no open blockers remain, recalculates completion, and writes activity logs.
- Blocker list UI with status and severity filters.
- Blocker detail UI with linked client/task, impact, created/updated/resolved timeline, resolution notes, resolved state, and time-to-resolve.
- Inline workflow task blocker form using React Hook Form and Zod.
- Client page width containment fixed for 100% viewport usage without page-level horizontal overflow.
- Slice 4 backend tests and Selenium blocker lifecycle coverage are implemented.

## Dashboard Data Flow

- Dashboard summary and client-health endpoints now read tenant-scoped database state instead of returning local placeholder data.
- Dashboard upcoming-deadlines, open-blockers, and recent-activity endpoints read tenant-scoped database state with bounded result sizes.
- Frontend dashboard shows DB-backed metric cards, client health, upcoming/overdue deadlines, open blockers, recent activity, loading states, empty states, and API error states without falling back to hardcoded metrics.
- Dashboard quick filters are wired through tenant-safe APIs for PM, client status, and date range.
- Recent activity uses cursor pagination for infinite scroll.
- Recent activity API responses are normalized defensively before rendering.
- Dashboard rows navigate to client, workflow, or blocker operational screens where relevant.
- Slice 5 dashboard derivation tests are implemented.
- Slice 5 dashboard query indexes are available at `prisma/slice5_dashboard_indexes.sql`.
- PPC/SEO database demo seed SQL is available at `prisma/phase1_ppc_seo_demo_seed.sql`.

## Slice 6 — Phase 1 Closeout

- Client status changes now synchronize active/paused/archived operational workflow visibility in a short database transaction.
- Workflow lists exclude archived-client workflows from default operational views.
- Phase 1 focused test suite is available through `npm run test:phase1`.
- Slice 6 closeout tests audit RBAC, transaction boundaries, tenant-aware repositories, system-controlled DTO fields, safe error normalization, setup documentation, and Swagger endpoint coverage.
- Local/Supabase setup runbook is available at `docs/current/setup_runbook.md`.
