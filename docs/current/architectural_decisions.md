Frontend
React.js + Vite + TypeScript
(Selected because you’ll get fast development builds, strong typing, easier scaling, and a cleaner developer experience for a long-term ERP system.)
TailwindCSS + shadcn/ui
(Selected because you can build consistent UI components quickly without maintaining large custom CSS files.)
React Hook Form
(Selected because it keeps forms performant and reduces unnecessary re-renders in large dashboard-based applications.)
Zod
(Selected only for client-side form validation so validation schemas stay clean and predictable without adding duplicate validation logic everywhere.)
Axios Instance
(Selected because it centralizes API communication, JWT attachment, error handling, request configuration, and future token refresh handling into one reusable layer instead of duplicating logic across components.)
TanStack Query v5
(Selected because it standardizes async server-state handling including loading states, caching, retries, refetching, and API synchronization while reducing repetitive frontend boilerplate.)
↓
REST API Calls (HTTPS)
(Selected because it keeps frontend and backend clearly separated, easier to maintain, and simpler for future integrations.)
↓
Backend (Node.js)
NestJS Framework
(Selected because it gives you structured architecture out of the box, which helps when the codebase grows across teams and modules.) It also works similar to SpringBoot. 
Controllers
(Selected to keep request handling separated from business logic.)
JWT Authentication (Supabase will handle this for us in Supabase JWT mentioned below)
(Selected because token-based auth works well for web apps, APIs, and future mobile support.)
RBAC Authorization Guards
(Selected because ERP systems require role-based permissions across departments, admins, clients, and internal staff.)
DTO Validation
(Selected because it helps validate incoming API data before it reaches business logic.)
Middleware
(Selected as optional for later in case logging, request tracking, or custom processing becomes necessary.)
Interceptors
(Selected because they help standardize responses, logging, transformations, and error handling.)
Services (Business Logic)
(Selected to isolate core application logic from controllers and database operations.)
Swagger / OpenAPI Documentation
(Selected because API documentation becomes important once frontend, integrations, and external developers interact with the system.) Swagger is also embedded automaticallyin NestJs.
Tenant-aware Architecture
(Selected because the platform is planned to become multi-tenant SaaS later.)
↓
ORM Layer
Prisma ORM
(Selected because it provides type-safe queries, clean schema management, and strong TypeScript support.)
Type-safe Queries
(Selected because it reduces runtime query mistakes and improves development reliability.)
Schema Management
(Selected because database structure changes stay organized and version controlled.)
Relations
(Selected because ERP systems depend heavily on relational data structures.)
Migrations
(Selected as optional later when the schema stabilizes and production deployment workflows become stricter.)
↓
Database & Infrastructure
Supabase
(Selected because it provides managed PostgreSQL infrastructure with authentication support and reduces backend setup work early on.)
PostgreSQL Database
(Selected because relational databases fit ERP systems well due to structured business data and relationships.)
Supabase Auth
(Selected because authentication infrastructure is already handled securely and saves development time.)
JWT Tokens
(Selected because they integrate cleanly with API-based authentication systems.)
Password Hashing
(Selected because credential security should never be handled manually done internally by Supabase Auth.)
Session Management
(Selected because user sessions need centralized handling across the platform.)


Future OAuth / SSO
(Selected because enterprise clients may later require Google, Microsoft, or SAML login support.)