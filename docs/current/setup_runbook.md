# setup_runbook.md — Phase 1 Local and Supabase Setup

## Environment Variables

Frontend file:

```txt
frontend/.env
```

Required keys:

```txt
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=http://localhost:3000/api
```

Backend file:

```txt
backend/.env
```

Required keys:

```txt
DATABASE_URL=
DIRECT_URL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
FRONTEND_ORIGIN=http://localhost:5173
PORT=3000
```

Use the pooled Supabase connection for `DATABASE_URL`. Use the direct Supabase connection only for `DIRECT_URL`.

## Supabase SQL Setup

Run these in Supabase SQL Editor, in order:

```txt
prisma/supabase_schema.sql
prisma/phase1_client_contract_fields.sql
prisma/slice4_blocker_indexes.sql
prisma/slice5_dashboard_indexes.sql
```

Then run the demo seed if you want DB-backed sample data:

```txt
prisma/phase1_ppc_seo_demo_seed.sql
```

## Tenant and User Bootstrap

Before the demo seed, Supabase must have:

- one `erp.tenants` row
- one `erp.roles` row for the logged-in role
- one active `erp.users` row linked to the Supabase Auth user through `auth_user_id`

The Supabase Auth user metadata should include:

```json
{
  "tenant_id": "<erp.tenants.id>",
  "erp_user_id": "<erp.users.id>",
  "role": "super_admin",
  "full_name": "Admin Name",
  "is_active": true
}
```

## Template Seeding

Preferred path:

```txt
Clients screen -> Seed templates
```

SQL demo path:

```txt
prisma/phase1_ppc_seo_demo_seed.sql
```

Do not manually insert blockers for normal testing. Create blockers through the app/API so task status and activity logs stay consistent.

## Dev Server Startup

Backend:

```txt
cd backend
npm run start:dev
```

Frontend:

```txt
cd frontend
npm run dev
```

## Verification

Backend focused tests:

```txt
cd backend
npm run test:phase1
```

Full browser flow:

```txt
cd selenium-e2e
npm test
```

Password reset browser coverage is opt-in with:

```txt
RUN_PASSWORD_RESET=true
```
