7. Department Responsibilities
Each department has specific roles across all phases. This section maps accountability so every team knows what they own.

7.1 Engineering
Phase, Responsibilities, Key Deliverables
Phase 1, "Database schema, API, JWT auth, frontend scaffolding, deployment pipeline", "Working MVP with onboarding, workflows, blockers, dashboard"
Phase 2, "Dependencies engine, file storage, notification service, CRM integration, client portal backend", "Full CRUD with dependencies, file uploads, notifications, CRM sync"
Phase 3, "Ad platform API integrations, rules engine, ML model development/deployment, data pipeline", "Automated KPI ingestion, rules engine, ML models in production"
Phase 4, "Gantt/Kanban UI, Slack webhooks, multi-tenant database migration, backup automation", "Alternative views working, Slack connected, tenant isolation verified"
Phase 5, "Stripe billing, public API with docs, SSO (OAuth/SAML), mobile app", "Billing working, API documented, SSO verified, app in beta"

7.2 Product & Design
Phase, Responsibilities, Key Deliverables
Phase 1, "UI/UX wireframes, design system creation, component library", "Figma designs for onboarding, workflows, checklist, dashboard, blockers"
Phase 2, "Client portal design, notification UX, capacity visualization, report layout design", "Client dashboard mockups, notification patterns, PDF report templates"
Phase 3, "Intelligence Hub UX, insight card design, alert dashboard, approval workflow UX", "Insight card patterns, alert management flows, approval UI"
Phase 4, "Gantt/Kanban interaction design, white-label theming system, onboarding wizard flow", "Alternative view prototypes, theming engine, wizard wireframes"
Phase 5, "Marketing site, pricing page, mobile app design, template marketplace UX", "Marketing site design, app screens, marketplace flows"

7.3 Operations & Delivery
Phase, Responsibilities, Key Deliverables
Phase 1, "Define scope templates (4 industries), test workflows with real clients, UAT", "4 production-ready scope templates, UAT sign-off, bug reports"
Phase 2, "Populate KPI data, configure blocker escalation rules, onboard first client to portal", "Live KPI tracking, escalation rules configured, 1 client on portal"
Phase 3, "Connect ad accounts, validate ML insights, train team on intelligence features", "All active client ad accounts connected, insight accuracy validated"
Phase 4, "Slack channel setup, report template customization, freelancer data migration", "Slack integration live, custom report templates, freelancer pool populated"
Phase 5, "Beta agency onboarding, support documentation, template marketplace seeding", "3–5 beta agencies onboarded, help docs, 10+ templates in marketplace"

7.4 Leadership / Strategy
Phase, Responsibilities, Key Deliverables
Phase 1, "Approve MVP scope, allocate resources, define success metrics", "Signed-off scope document, team assigned, KPIs defined"
Phase 2, "Client portal strategy, CRM integration priority, pricing exploration", "Portal rollout plan, CRM sync requirements, initial pricing model"
Phase 3, "Intelligence Hub strategy, ML model validation, competitive positioning", "Intelligence roadmap, model accuracy benchmarks, competitor analysis"
Phase 4, "Product-market fit validation, beta partner selection, go-to-market planning", "Beta partner list, GTM strategy document, pricing finalized"
Phase 5, "Launch strategy, pricing announcement, sales enablement, partnership deals", "Launch plan, sales deck, partner agreements signed"

8. Success Metrics by Phase
Phase, Metric, Target, Measurement
Phase 1, Internal adoption, 100% of PMs using daily, Daily active users / total PMs
, Data entry time reduction, 60% less vs. spreadsheets, Time tracking comparison
, Task completion visibility, "Real-time (< 1 min delay)", Dashboard refresh latency
Phase 2, Client portal adoption, 3+ clients using portal, Client login frequency
, Blocker resolution time, < 5 days average, Avg time flagged → resolved
, CRM sync reliability, 99.5% uptime, Sync failure rate
Phase 3, KPI automation rate, 80% of KPIs auto-populated, Auto vs. manual entries
, Intelligence insight accuracy, 70% marked “Helpful”, PM feedback on insights
, Alert response time, < 24 hours, Time from alert → action
Phase 4, Client capacity, 50+ active clients, Active client count
, Report delivery automation, 90% auto-generated, Auto vs. manual reports
, Team utilization accuracy, ±5% of actual, Predicted vs. actual hours
Phase 5, External agency signups, 50 in first quarter, New tenant registrations
, Monthly recurring revenue, ₹2.5L+ MRR by month 3, Stripe dashboard
, Churn rate (product), < 5% monthly, Cancelled / total tenants

9. Risks & Dependencies
Risk, Impact, Likelihood, Mitigation
Scope creep in Phase 1, High, High, Strict feature freeze after sprint planning. Defer all non-MVP requests to Phase 2.
Ad platform API changes, Medium, Medium, Abstract API layer so platform-specific code is isolated.
ML model accuracy below threshold, High, Medium, Start with rules-only in Phase 3. Add ML incrementally.
CRM integration complexity, Medium, Medium, Build CRM sync as a standalone microservice.
Low client portal adoption, Medium, Low, Require PM to walk client through portal during onboarding.
Team capacity during build, High, Medium, Hire 1 additional developer before Phase 2. Use freelancers for design.
Multi-tenant data isolation failure, Critical, Low, Row-level security with tenant_id on every query. Penetration testing.