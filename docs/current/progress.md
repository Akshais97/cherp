# progress.md — Phase 1 Progress

## Slice 1 — Identity + App Shell

Status: Complete for current slice scope.

- Supabase Auth, JWT bearer flow, ERP user context, RBAC guards, app shell, navigation, dashboard shell, and base Phase 1 schema are implemented.
- App-level frontend error boundary is implemented for recoverable render failures.
- CHERP logo/brand usage and default collapsed sidebar are implemented.
- Super Admin user management is implemented for tenant user creation, role assignment, and active/inactive status.

## Slice 2 — Templates + Client Onboarding

Status: Complete for current slice scope.

- Scope templates, 7 presets, two-column onboarding, template preview, contract end calculation, client directory, and atomic client + Month 1 workflow + task generation are implemented.

## RestOfSlide1&2 — Foundation Gaps

Status: Complete for current slice scope.

- Admin user creation, users API, password reset delegation, auth error clarity, Supabase rate-limit messaging, client detail/edit/status/archive/search, and scope template CRUD/resolution/KPI preview are implemented.
- User creation now creates both Supabase Auth and ERP user records, then syncs Supabase metadata back to the ERP identity.

## Slice 3 — Workflows + Tasks

Status: Complete for current slice scope.

- Workflow list/detail, client workflows, workflow detail UI, task creation/update/assignment/completion, full task edit controls, status transition validation, due-date highlighting, completion recalculation, and task activity logs are implemented.
- Workflow task form spacing/alignment has been normalized for dense task cards.
- Workflow task cards now use a one-open accordion pattern and priority side coloring.
- Workflow task reorder now uses drag handles backed by persisted `sort_order`.

## Slice 4 — Blockers

Status: Complete for current slice scope.

- Blocker create/list/detail/resolve APIs, transactional task blocking/restoration, blocker list/detail UI, inline task blocker creation, status/severity filtering, resolution notes, and blocker activity logging are implemented.
- Blocker detail includes a created/updated/resolved operational timeline.
- Client page width containment has been fixed for 100% viewport usage.

## Slice 5 — Internal Dashboard MVP

Status: Complete for current slice scope.

- Dashboard summary, client health, upcoming deadlines, open blockers, and recent activity APIs are implemented as tenant-scoped derived reads.
- Dashboard quick filters and cursor-paginated recent activity are implemented.
- Dashboard UI panels are wired to database-backed APIs with loading, empty, and error states.
- Dashboard rows can navigate into client, workflow, and blocker operational screens.
- Team-member dashboard reads are scoped to assigned operational work and own activity.

## Slice 6 — Phase 1 Closeout

Status: Complete for current slice scope.

- Phase 1 closeout tests, tenant-safety/static audits, system-controlled DTO checks, error-normalization checks, and setup documentation are implemented.
- Client status changes now sync active/paused/archived workflow visibility without adding future automation.

## Verification

- Latest full Selenium flow covers login, dashboard, templates, onboarding, workflow task editing, blocker create/list/detail/resolve, task completion after unblock, client detail, edit, status, archive, logout, sidebar collapse, and overflow checks.
- Latest Selenium report: `selenium-e2e/reports/2026-05-14T20-10-29-483Z/report.html`.
- `npm run build` passes for backend and frontend.
- `npm run test:slice3` covers core workflow/task service rules without database dependency.
- `npm run test:slice4` covers blocker service rules without database dependency.
- `npm run test:slice5` covers dashboard derivation rules without database dependency.
- `npm run test:slice6` covers closeout audits without database dependency.
- `npm run test:phase1` runs all focused backend Phase 1 tests.
- Password reset E2E is now opt-in with `RUN_PASSWORD_RESET=true`.

## Data Flow Seed

- PPC/SEO demo seed SQL is available at `prisma/phase1_ppc_seo_demo_seed.sql` for Supabase SQL Editor testing after `erp.tenants` and `erp.users` each have at least one valid row.
- Slice 5 dashboard indexes are available at `prisma/slice5_dashboard_indexes.sql` for the upcoming-deadlines and open-blockers dashboard queries.

## Known Follow-Up

- Prove sub-200ms targets with measured API timings and PostgreSQL `EXPLAIN ANALYZE`; do not assume performance readiness from E2E alone.
