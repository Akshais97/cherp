# features.md — Phase 1 Slice Feature Map

This file maps all Phase 1 features to implementation slices. It is planning scope, not proof of completion. Current completed work remains tracked in `docs/current/implemented_features.md`.

## Slice 1 — Identity and App Shell

- Supabase Auth integration and frontend session context.
- JWT bearer attachment through central Axios client.
- Backend JWT verification and ERP user context.
- RBAC roles: `super_admin`, `project_manager`, `team_member`, `client`.
- Global app shell with Dashboard, Clients, Workflows, and Blockers navigation.
- Collapsible sidebar/hamburger behavior to control dashboard and workflow-page overflow.
- Dashboard metric-card shell and common loading/error/empty-state patterns.
- App-level React error boundary for render failures, with a reset action instead of a full white-screen crash.
- Base Prisma/Supabase schema foundation for Phase 1 entities.
- Admin user management UI for creating tenant users, assigning roles, and toggling active state.

## Slice 2 — Scope Templates and Client Onboarding

- Scope template table/API with JSONB task blueprints and KPI framework.
- Seven mandatory industry presets.
- Client onboarding form with template selector and task preview.
- Client directory table.
- Contract end auto-calculation.
- Payment terms and renewal date as explicit client contract fields.
- Transactional onboarding: client + Month 1 workflow + copied tasks + activity logs.
- Creating user linked as PM/owner for client workflow.

## RestOfSlide1&2 — Foundation and Onboarding Gaps

- Implemented: Admin user creation using Supabase Auth plus ERP user row.
- Implemented: Users list/update endpoints.
- Implemented: Protected user creation endpoint backed by Supabase Auth and ERP user metadata sync.
- Implemented: Password reset delegation to Supabase Auth.
- Implemented: Clear auth error handling.
- Implemented: Supabase sign-in rate-limit errors show a clear 5-minute retry message.
- Implemented: Shared Supabase admin client setup with URL normalization for backend auth flows.
- Implemented: Prisma schema/runtime index alignment for tenant-scoped Phase 1 list and access queries.
- Implemented: Client detail, edit, status change, archive, search, and filters.
- Implemented: Scope template CRUD, deactivate, resolution fallback, and KPI preview.

## Slice 3 — Workflows and Tasks

- Implemented: Workflow list and detail APIs.
- Implemented: Client workflows API.
- Implemented: Workflow detail screen with checklist, assignee, due date, priority, status, blocker count, and progress bar.
- Implemented: Custom task creation from workflow detail.
- Implemented: Task update, assignment, status change, priority change, and completion APIs.
- Implemented: Task edit UI for title, description, due date, and priority using React Hook Form + Zod.
- Implemented: Checklist task reorder via pointer-based full-card drag preview, 5px drag buffer, click suppression, and optimistic persisted `sort_order`.
- Implemented: Task status transition validation, including no direct blocked-to-completed completion.
- Implemented: Due date highlighting for overdue and due-soon tasks.
- Implemented: Workflow completion recalculation after task creation/update/completion.
- Implemented: Activity logging for task creation, assignment, update, status change, and completion.
- Implemented: Focused Slice 3 backend tests and Selenium task-edit coverage.
- Implemented: Selenium overflow checks for login, dashboard, clients, and workflow task screens.

## Slice 4 — Blocker Management

- Implemented: Blocker create/list/detail/resolve APIs.
- Implemented: Blocker list screen with status/severity filters.
- Implemented: Blocker detail screen with impact, linked task/client, full created/updated/resolved timeline, resolution notes, and time-to-resolve display.
- Implemented: Transactional task blocking and restoration when no open blockers remain.
- Implemented: Severity/status filters and visual styling.
- Implemented: Resolution notes, resolved_at, and resolved_by.
- Implemented: Activity logging for blocker creation, task block status changes, blocker resolution, and task restoration.
- Implemented: Workflow task accordion with one open task at a time and priority-colored left rail.
- Implemented: Client layout containment so directory counts/tables fit at 100% page width without page overflow.

## Slice 5 — Internal Dashboard MVP

- Implemented: Dashboard summary API derived from tenant-scoped source tables.
- Implemented: Client health API with derived `on_track`, `at_risk`, `off_track`.
- Implemented: Upcoming deadlines API for incomplete overdue and next-7-days tasks.
- Implemented: Open blockers API sorted by severity and flagged date.
- Implemented: Recent activity feed from append-only activity logs.
- Implemented: Recent activity infinite scroll through cursor pagination.
- Implemented: Recent activity response normalization so stale array responses and paginated responses both render safely.
- Implemented: Connected dashboard UI panels for metrics, health, deadlines, blockers, and activity.
- Implemented: Dashboard quick filters for project manager, client status, and date range.
- Implemented: Team-member dashboard scoping for assigned clients, workflows, tasks, blockers, and own activity.
- Implemented: Navigation from dashboard rows to client/workflow/blocker operational screens.
- Implemented: Focused Slice 5 backend tests for dashboard derivation rules.

## Slice 6 — Phase 1 Closeout

- Implemented: Auth/RBAC tests.
- Implemented: Onboarding transaction and workflow-generation boundary checks.
- Implemented: Task transition and completion tests.
- Implemented: Blocker transaction tests.
- Implemented: Dashboard derivation tests.
- Implemented: Tenant safety query audit.
- Implemented: System-controlled field audit.
- Implemented: Error normalization review.
- Implemented: Local/Supabase setup runbook.
- Implemented: Swagger endpoint contract review for implemented APIs only.
