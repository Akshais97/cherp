# NEXT_STEPS.md

1. Start local app if testing UI:
   - Backend: `cd backend; npm run start:dev`
   - Frontend: `cd frontend; npm run dev`
   - Open `http://localhost:5173/`.
2. Browser-test the new user-story flows:
   - Project Manager uses Client Onboarding step flow: Client Details -> Scope Templates -> Review/Confirm, then verifies the client in Client Directory.
   - Confirm Client Onboarding Step 1 and Step 2 render as page-level full-width sections.
   - Confirm Client Onboarding Review renders full-width with no empty right-side step column.
   - Confirm client creation shows creating, success, and readable failure alert states.
   - Confirm Client Directory renders list on the left and selected client detail on the right on desktop.
   - Confirm Client Directory status column remains fully visible in the left list panel.
   - Client Directory remains its own hamburger/sidebar tab and is available separately from onboarding.
   - Super Admin sees Users nav, creates a user, changes role, toggles active state.
   - Super Admin deletes a user from Users, and protected-reference failures show a clear backend error.
   - Super Admin/Project Manager opens Team Members, searches a member, and sees assigned tasks plus related blockers.
   - Project Manager does not see Users nav, can onboard/edit clients and manage tasks/blockers.
   - Team Member sees only assigned clients/workflows/tasks/dashboard data and no restricted action controls.
3. Confirm Supabase DB is current:
   - Apply `prisma/supabase_schema.sql` if needed.
   - Apply `prisma/phase1_client_contract_fields.sql` if client contract columns are missing.
   - Apply `prisma/slice5_dashboard_indexes.sql`.
   - Seed demo data with `prisma/phase1_ppc_seo_demo_seed.sql` only after valid `erp.tenants` and `erp.users` rows exist.
4. Run verification after any change:
   - `cd backend; npm run build`
   - `cd frontend; npm run build`
   - `cd backend; npm run test:phase1`
   - `cd selenium-e2e; npm test`
   - `cd selenium-e2e; npm run test:roles`
   - `cd frontend; npm run lint` after fixing existing Blockers/Workflows lint errors.
   - Selenium E2E requires servers, Supabase data, `E2E_EMAIL`, and `E2E_PASSWORD`.
5. Performance check still needed:
   - Measure API timings and PostgreSQL `EXPLAIN ANALYZE`.
   - Do not claim 200ms readiness from indexes alone.
6. Avoid next-session risks:
   - Do not use `docs/future/`.
   - Do not remove persisted `sort_order`; drag-and-drop uses it.
   - Do not make frontend authorization the security source of truth.
   - Do not accept `tenant_id` from request bodies.
   - Do not mark docs complete unless frontend, backend, DB, auth, tenant isolation, validation, and error handling are actually present.
7. Next milestone done when:
   - New admin/user-management and team-member scoped journeys are browser-tested.
   - Supabase schema/index state is confirmed.
   - Builds and Phase 1 tests pass after any follow-up patch.
