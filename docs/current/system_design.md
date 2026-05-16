┌──────────────────────────────────────┐
│              FRONTEND               │
├──────────────────────────────────────┤
│ React.js + Vite + TypeScript         │
│ TailwindCSS + shadcn/ui              │
│ React Hook Form                      │
│ Zod Client-side Validation           │
│TanStack Query (Light) + Axios (Light)│      
└──────────────────────────────────────┘
                    │
                    │ REST API Calls (HTTPS)
                    ▼
┌──────────────────────────────────────┐
│         BACKEND (Node.js)           │
├──────────────────────────────────────┤
│ NestJS Framework                    │
│                                      │
│ - Controllers                        │
│ - JWT Authentication                 │
│ - RBAC Authorization Guards          │
│ - DTO Validation                     │
│ - Middleware                         │
│ - Interceptors                       │
│ - Services (Business Logic)          │
│ - Swagger/OpenAPI Documentation      │
│ - Tenant-aware Architecture          │
└──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│         REPOSITORY LAYER            │
├──────────────────────────────────────┤
│ Repository Pattern                   │
│ - Query Abstraction                  │
│ - DB Access Isolation                │
│ - Reusable Queries                   │
└──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│              ORM LAYER              │
├──────────────────────────────────────┤
│ Prisma ORM                           │
│ - Type-safe Queries                  │
│ - Schema Management                  │
│ - Relations                          │
│ - Migrations                         │
└──────────────────────────────────────┘
                    │
                    ▼
┌──────────────────────────────────────┐
│         DATABASE & INFRA            │
├──────────────────────────────────────┤
│ Supabase                             │
│                                      │
│ - PostgreSQL Database                │
│ - Supabase Auth                      │
│   • JWT Tokens                       │
│   • Password Hashing                 │
│   • Session Management               │
│   • Future OAuth / SSO               │
│                                      │
│ Future (if required):                │
│ - Supabase Storage                   │
│ - Supabase Realtime                  │
└──────────────────────────────────────┘