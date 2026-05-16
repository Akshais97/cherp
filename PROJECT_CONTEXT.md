# PROJECT_CONTEXT.md

- Project: CHERP, Agency Command Center ERP.
- Type: Phase 1 MVP modular monolith for agency operations.
- Domain/users: internal agency team running client onboarding, Month 1 workflows, assigned tasks, blockers, and operational dashboards.
- Stack: React + Vite + TypeScript, TailwindCSS/shadcn-style UI, TanStack Query, Axios, NestJS, Prisma, Supabase PostgreSQL, Supabase Auth/JWT.
- Scope guard: Phase 1 only. Ignore `docs/future/` unless explicitly allowed.
- Primary rule: read `.ai/Agents.md` first, then `docs/current/`; do not duplicate system design docs here.
- Permanent decisions:
  - Frontend never accesses Supabase database directly.
  - Backend is source of truth for auth, tenant isolation, RBAC, validation, activity logs, and Prisma access.
  - Client onboarding atomically creates client, Month 1 workflow, generated tasks, and activity logs.
  - Dashboard data is derived from source tables, not stored as source of truth.
  - Template seeding is explicit/protected, not silent on page load.
  - User management creates both Supabase Auth users and ERP user rows.
- Current docs to trust: `docs/current/PRD.md`, `Phase1_MVP.md`, `Data_Models.md`, `Workflow.md`, `permissions_matrix.md`, `status_enums.md`, `system_design.md`, `architecture_principles.md`, `architectural_decisions.md`, `prisma_principles_to_optmise.md`, `features.md`, `progress.md`, `user_stories.md`.
