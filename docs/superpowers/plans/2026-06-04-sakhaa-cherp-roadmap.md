# Sakhaa Cherp Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved six-stage Sakhaa Cherp product expansion from workflow foundation through full verification.

**Architecture:** Extend the existing modular monolith with focused Nest modules and Vite feature folders. All mutations remain tenant-safe, RBAC-protected, validated through DTOs, logged through activity logs, and exposed through REST APIs.

**Tech Stack:** NestJS, TypeScript, Prisma, Supabase PostgreSQL, React, Vite, TanStack Query, Axios, lucide-react, optional Framer Motion, optional Gemini Flash REST API.

---

### Task 1: Task Status Contract and Foundation

**Files:**
- Modify: `docs/current/status_enums.md`
- Modify: `docs/current/Workflow.md`
- Modify: `backend/src/tasks/dto/create-task.dto.ts`
- Modify: `backend/src/tasks/dto/update-task.dto.ts`
- Modify: `backend/src/tasks/tasks.service.ts`
- Modify: `backend/src/tasks/tasks.repository.ts`
- Modify: `backend/src/tasks/tasks.controller.ts`
- Modify: `frontend/src/features/workflows/workflowSchemas.ts`
- Modify: `frontend/src/features/workflows/WorkflowsPage.tsx`
- Create or modify: `backend/scripts/stage1-task-foundation.test.ts`

- [ ] Write failing backend test for canonical task status transitions.
- [ ] Run the new backend test and confirm it fails on the old status contract.
- [ ] Update DTO validation and services to use `yet_to_start`, `ongoing`, `completed`, `task_approved_by_manager`, `rework`, `task_approved_by_client`.
- [ ] Add PM/Super Admin delete and full CRUD behavior while keeping Team Members assigned-task-only.
- [ ] Update frontend mappings and controls to display the requested labels.
- [ ] Run the Stage 1 backend test and existing phase tests.

### Task 2: Notifications and Approval Flow

**Files:**
- Create: `backend/src/notifications/notifications.module.ts`
- Create: `backend/src/notifications/notifications.service.ts`
- Create: `backend/src/notifications/notifications.repository.ts`
- Create: `backend/src/notifications/notifications.controller.ts`
- Create: `backend/src/notifications/mail.service.ts`
- Modify: `backend/src/app.module.ts`
- Modify: `backend/src/tasks/tasks.service.ts`
- Modify: `backend/src/blockers/blockers.service.ts`
- Create or modify: `frontend/src/features/notifications/*`
- Modify: `frontend/src/components/layout/AppShell.tsx`
- Create or modify: `backend/scripts/stage1-notifications.test.ts`

- [ ] Write failing tests for notification creation on task status update, approval request, blocker creation, and delayed task detection.
- [ ] Implement notification repository/service/controller.
- [ ] Wire notifications into task and blocker service mutations.
- [ ] Implement mail adapter with no-op fallback when mail config is absent.
- [ ] Add frontend notification bell/list.
- [ ] Run notification tests and existing task/blocker tests.

### Task 3: Role Dashboards and Task Overview

**Files:**
- Modify: `backend/src/dashboard/*`
- Create: `backend/src/tasks/dto/task-query.dto.ts`
- Modify: `backend/src/tasks/tasks.controller.ts`
- Modify: `backend/src/tasks/tasks.repository.ts`
- Create: `frontend/src/features/dashboard/ProjectManagerDashboard.tsx`
- Create: `frontend/src/features/dashboard/TeamMemberDashboard.tsx`
- Modify: `frontend/src/features/dashboard/DashboardPage.tsx`
- Create: `frontend/src/features/tasks/TasksOverviewPage.tsx`
- Modify: `frontend/src/components/layout/AppShell.tsx`
- Modify: `frontend/src/App.css`

- [ ] Write failing data tests for PM and TM dashboard filters.
- [ ] Extend dashboard APIs with role-specific derived payloads.
- [ ] Build PM dashboard sections in screenshot order.
- [ ] Build TM dashboard sections in screenshot order.
- [ ] Build brandwise task overview with cards, modal details, and role filters.
- [ ] Run frontend build and dashboard backend tests.

### Task 4: Guided Gemini Chatbot

**Files:**
- Create: `backend/src/ai-chat/*`
- Modify: `backend/src/app.module.ts`
- Create: `frontend/src/features/ai-chat/AiChatWidget.tsx`
- Modify: `frontend/src/components/layout/AppShell.tsx`
- Create or modify: `backend/scripts/stage3-ai-chat.test.ts`

- [ ] Write failing tests for guided PM task create/update/read/delete/approval/blocker actions.
- [ ] Write failing tests for TM approval request and blocker flows.
- [ ] Implement Gemini parser adapter with deterministic fallback when API key or network is unavailable.
- [ ] Dispatch parsed actions through task/blocker services only.
- [ ] Build bottom-corner guided chat UI with role-specific options and visible task cards.
- [ ] Run backend AI chat tests and manually verify fallback mode.

### Task 5: Brands, Profiles, Analytics, and Coming-Soon Agents

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `prisma/supabase_schema.sql`
- Create: `prisma/stage4_profiles_brands_history.sql`
- Create: `backend/src/brands/*`
- Create: `backend/src/profiles/*`
- Create: `backend/src/analytics/*`
- Modify: `backend/src/app.module.ts`
- Create: `frontend/src/features/brands/BrandsPage.tsx`
- Create: `frontend/src/features/profiles/EmployeeProfilesPage.tsx`
- Create: `frontend/src/features/analytics/AnalyticsPage.tsx`
- Modify: `frontend/src/components/layout/AppShell.tsx`

- [ ] Write failing tests for tenant-safe brand profile and employee profile reads/writes.
- [ ] Add Prisma and Supabase SQL fields/tables.
- [ ] Implement Brands APIs and UI.
- [ ] Implement Employee Profiles APIs and UI.
- [ ] Implement resource allocation analytics APIs and donut UI.
- [ ] Add disabled agent assignment UI marked coming soon.

### Task 6: Polish

**Files:**
- Modify: `frontend/src/components/layout/AppShell.tsx`
- Modify: `frontend/src/features/dashboard/*`
- Modify: `frontend/src/features/tasks/*`
- Modify: `frontend/src/App.css`
- Modify: `frontend/package.json`
- Modify: `backend/.env.example`
- Modify: `frontend/.env.example`

- [ ] Rename visible product surfaces to `Sakhaa Cherp`.
- [ ] Add super admin email to `.env.example`.
- [ ] Add Framer Motion if dependency install is approved; otherwise add CSS transitions only.
- [ ] Apply premium SaaS spacing, hierarchy, hover elevation, skeletons, modal transitions, and reduced-motion-safe microinteractions.
- [ ] Run impeccable critique, persist findings, and implement priority issues.

### Task 7: Full Verification and Fix Loop

**Files:**
- Modify: `selenium-e2e/tests/*`
- Create or modify: `backend/scripts/stage6-full-flow.test.ts`
- Modify code as needed based on failures.

- [ ] Run backend phase tests and new stage tests.
- [ ] Run frontend lint and build.
- [ ] Run E2E flows for Super Admin, Project Manager, and Team Member dashboards and task tables.
- [ ] Run AI chatbot guided flows with fallback and Gemini live call if network/API key are available.
- [ ] Run notification and delayed-task mail fallback tests.
- [ ] Run DB SQL reconciliation checks against available Supabase configuration.
- [ ] Fix failures using root-cause investigation and re-run affected tests.
