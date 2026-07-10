# Sakhaa Cherp Roadmap Design

## Scope

This design covers the approved six-stage roadmap for the Agency Command Center ERP expansion:

1. Workflow and task foundation
2. Role dashboards and task overview
3. Guided Gemini chatbot
4. Brands, employee profiles, and analytics
5. Premium UX polish
6. Full verification and fix loop

The implementation stays inside the existing modular monolith: Vite React frontend, NestJS backend, Prisma repositories/services, Supabase PostgreSQL, REST APIs, tenant-aware access, RBAC, and activity logging.

## Core Decisions

- Task statuses become canonical stored values: `yet_to_start`, `ongoing`, `completed`, `task_approved_by_manager`, `rework`, and `task_approved_by_client`.
- Display labels remain frontend mappings, never database values.
- Team members can update only their assigned tasks and can request PM approval through task status plus notification.
- Project managers and super admins can create, update, delete, assign, and approve tasks.
- AI chatbot actions are guided and deterministic. Gemini Flash may parse user intent, but backend services enforce RBAC, tenant isolation, validation, and state transitions.
- Notifications are in-app first. Email delivery is implemented through an explicit provider adapter only when mail configuration is available.
- Role dashboards derive data from source tables. Dashboard values are not persisted as source-of-truth.
- Brands and employee profiles add only the fields requested by the user, without adding marketplace, CRM sync, AI worker execution, billing, or background workflow engines.
- Agent assignment is UI-only and disabled as "coming soon".
- Resource allocation analytics derive workload from tasks, due dates, and profile availability. No automatic scheduling engine is introduced.

## Data Changes

Modify existing tables:

- `tasks`: status contract, optional approval fields where needed, soft-delete/archive support if delete needs audit-safe behavior.
- `users`: profile fields for skills, designation, experience, availability, current workload, and team enum.
- `clients`: brand profile fields for URL, socials, guidelines, assets, color palette, fonts, audience, competitors, positioning, campaign history, and communication history.
- `notifications`: use for task changes, approval requests, blocker assignment, and deadline alerts.

Create only if required by implementation:

- `task_approvals` for approval audit history if the status fields are insufficient.
- `history` with JSONB for calendar/history rollups, as requested.

## Backend Shape

Add or extend modules:

- `TasksModule`: full CRUD, status transitions, approval semantics, soft delete, notifications, activity logs.
- `NotificationsModule`: list, mark read, create in-app notifications, mail adapter.
- `AiChatModule`: guided chat endpoint, Gemini Flash parser adapter, action dispatcher calling existing services.
- `BrandsModule`: client brand profile APIs.
- `ProfilesModule`: employee profile APIs.
- `AnalyticsModule`: resource allocation aggregates.
- `DashboardModule`: role-specific dashboard payloads.

Controllers remain HTTP-only. Services own rules. Repositories own Prisma access. Tenant IDs and user IDs always come from auth context.

## Frontend Shape

Add or extend feature areas:

- Role-aware dashboard views matching the Project Manager and Team Member screenshots in order: topbar/header, metric strip, task table with status tabs, donut task summary, workload/snapshot panels, deadline panel, activity panel, quick actions, calendar strip.
- `TasksOverviewPage`: brandwise cards and matrix/table views with PM and TM filters.
- `AiChatWidget`: bottom-corner guided chatbot with role-specific options and task detail cards.
- `NotificationsCenter`: topbar indicator and notification list.
- `BrandsPage`: brand profile fields.
- `EmployeeProfilesPage`: PM/Super Admin profile management.
- `AnalyticsPage`: resource allocation donuts and overload/free capacity indicators.

## Testing Strategy

Stage 1 uses backend behavior tests for status transitions, task CRUD, notification creation, and RBAC. Later stages add frontend build/lint checks, role dashboard data checks, Selenium E2E role journeys, chatbot guided flows, and DB-backed SQL reconciliation.

## Constraints

- Gemini live calls require `GEMINI_API_KEY` and outbound network permission.
- Framer Motion requires dependency installation approval because it is not currently installed.
- Real email delivery requires SMTP/provider configuration; without it, tests verify mail adapter fallback behavior and in-app notifications.
