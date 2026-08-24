# CHERP ERP — Missing Features & Implementation Gap Report

## No-Guesswork Revised Version

**Repository:** `Akshais97/cherp`  
**Branch reviewed:** `ui-animations-reactlib`  
**Baseline document:** Agency Command Center ERP PRD v2.1 — Phase 1 and Phase 2  
**Review mode:** Static PRD + repository gap review; no runtime execution/E2E validation included in this version  
**Date:** 24 Aug 2026  
**Revision note:** Corrected earlier over-classification of **Blocker Management v1** and **Subtask structure** as missing. This version avoids marking a feature as missing unless the available review basis supports that conclusion.

---

## 0. No-Guesswork Review Rules

This report follows these rules:

1. **Do not treat “not fully proven complete” as “missing.”**
2. **Do not mark a feature missing if the codebase already has a visible model, UI, API, or service structure for it.**
3. **If implementation appears to exist but end-to-end behaviour is not proven, mark it as `Acceptance Validation Pending`.**
4. **If only the data/model structure appears to exist, mark it as `Implemented Structurally`.**
5. **If the feature may exist but was not proven in static review, mark it as `Not Verified in Static Review`.**
6. **Do not claim runtime behaviour, RBAC enforcement, side effects, or automation unless code path + tests/runtime validation prove it.**

This is the key correction from the previous version:  
**Blocker Management v1 and Subtask structure should not be listed as missing.**

---

## 1. Source Baseline

The PRD is the product baseline for Phase 1 and Phase 2 of the ERP.

### Phase 1 Baseline

Phase 1 covers the MVP:

- Authentication and platform foundation
- Client onboarding
- Scope templates
- Workflow and task creation
- Checklist/task management
- Blocker Management v1
- Internal dashboard MVP

### Phase 2 Baseline

Phase 2 covers the core build:

- Task dependencies and subtasks
- Comments, files, and time tracking
- Team capacity management
- Blocker Management v2
- Month planning
- Reporting hub
- Client dashboard / external portal
- Notifications
- CRM integration
- Audit log

---

## 2. Executive Summary

The current branch should **not yet be treated as fully Phase 1 + Phase 2 complete** until acceptance validation confirms the PRD behaviours end-to-end.

However, the previous version of this report was too aggressive in two places:

1. **Blocker Management v1 was wrongly framed as missing.**
   - Correct framing: **Implemented / Acceptance Validation Pending**
   - The next step is not to rebuild blockers from scratch.
   - The next step is to validate blocker lifecycle behaviour, task side effects, filters, timeline, dashboard impact, RBAC, and tests.

2. **Subtasks were wrongly framed as missing.**
   - Correct framing: **Implemented Structurally / Acceptance Validation Pending**
   - Subtask structure should be separated from true task dependencies.
   - The next step is to validate parent-child task behaviour, parent auto-completion, progress calculation, and workflow-completion impact.

The major remaining work should be framed as:

- Validate and harden existing implemented areas.
- Complete unverified PRD behaviours.
- Add tests proving end-to-end lifecycle behaviour.
- Avoid building duplicate implementations for modules that already exist.

---

## 3. Status Legend

| Status | Meaning |
|---|---|
| **Implemented** | Required feature appears to exist as an intended application feature. |
| **Implemented Structurally** | Schema/model/UI/API structure appears to exist, but full business behaviour is not yet proven. |
| **Acceptance Validation Pending** | Feature appears implemented, but PRD acceptance criteria still need code-path, runtime, or test validation. |
| **Partial** | Some implementation exists, but important PRD behaviour is incomplete or unclear. |
| **Not Verified in Static Review** | Cannot be confirmed without deeper repository trace, runtime execution, or tests. |
| **Missing** | Use only when the feature is actually not found or is contradicted by the reviewed source. |
| **Build / Validate Next** | The next action required before calling the module complete. |

---

# 4. Phase 1 Gap Report — MVP

---

## 4.1 Authentication & Platform Foundation

**PRD expectation:** Admin-created users, JWT authentication, four-role RBAC, password reset, session management, protected APIs, token expiry/refresh, frontend route protection, reset email flow, rate limiting, and password security.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| User registration | Partial / Validate | Confirm admin-only user creation end-to-end. |
| JWT auth | Partial / Validate | Confirm token expiry, refresh, logout invalidation, and Supabase/Auth integration. |
| RBAC | Partial / Validate | Confirm four roles are enforced consistently: Super Admin, Project Manager, Team Member, Client. |
| Password reset | Not Verified in Static Review | Confirm secure reset-token/email flow or Supabase reset flow with matching UX. |
| Session management | Not Verified in Static Review | Confirm active session handling and logout behaviour. |
| Rate limiting | Not Verified in Static Review | Confirm failed-login rate limit requirement. |
| Protected routes | Partial / Validate | Backend guards and frontend route restrictions must match PRD roles. |

### Build / Validate Next

- Validate backend auth guards on every protected API route.
- Validate RBAC middleware/policies for all four roles.
- Validate client users cannot access internal ERP routes.
- Validate password reset flow.
- Validate login rate limiting.
- Add tests for unauthorized access, expired token, refresh token, and role-restricted routes.

---

## 4.2 Client Onboarding

**PRD expectation:** Client form, industry selector, service picker, auto-scope assignment, contract details, client list, status management, edit/archive, client APIs, validation, workflow generation, and responsive UI.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| Client profile form | Partial / Validate | Confirm all PRD fields exist: industry, service type, contact, email, phone, address, notes. |
| Contract details | Partial / Not Verified | Confirm monthly retainer, currency, duration, start date, payment terms, renewal/end date. |
| Auto-assign scope | Not Verified in Static Review | Confirm industry + service type pulls matching scope template or alternatives. |
| Workflow generation | Not Verified in Static Review | Confirm client creation auto-generates Month 1 workflow with template tasks. |
| Client list | Partial / Validate | Confirm search, sorting, filtering, status badges, and row-to-detail navigation. |
| Status management | Partial / Validate | Confirm Active/Paused/Completed/Archived state changes and downstream effects. |
| Archive/recovery | Not Verified in Static Review | Confirm soft-delete/archive + admin recovery. |
| Scope preview in onboarding | Not Verified in Static Review | Confirm right-side live scope template preview and customization action. |

### Build / Validate Next

- Validate the Client model against the PRD.
- Validate `POST /api/clients` or equivalent transaction:
  - create client
  - assign template
  - generate Month 1 workflow
  - generate tasks
- Validate contract end-date calculation.
- Validate archive/restore behaviour.
- Add onboarding acceptance tests.

---

## 4.3 Scope Templates

**PRD expectation:** Template library for 7+ industries, month-by-month default tasks, KPI frameworks, admin CRUD/deactivation, and template immutability for existing workflows.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| Template library | Partial / Validate | Confirm seeded templates for required industries/service types. |
| Default task lists | Partial / Validate | Confirm month-wise task structures are stored and cloned into workflows. |
| KPI framework | Not Verified in Static Review | Confirm KPI definitions with target ranges. |
| Template CRUD | Not Verified in Static Review | Confirm admin create/edit/deactivate flow. |
| Template immutability | Not Verified in Static Review | Confirm editing a template does not mutate existing client workflows. |

### Build / Validate Next

- Validate `ScopeTemplate` or equivalent model.
- Validate `default_tasks` / month-wise task structure.
- Validate `kpi_framework` or equivalent.
- Validate base template seed data.
- Validate workflow generation uses a snapshot/clone, not a fragile live-link.

---

## 4.4 Workflows & Tasks

**PRD expectation:** Auto-created monthly workflows, task creation, assignment, statuses, due dates, completion %, checklist view, priority levels, task APIs, complete endpoint, client workflow fetch, reordering, and audit trail.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| Monthly workflow creation | Partial / Not Verified | Confirm workflows are auto-created per month from selected scope template. |
| Task creation | Partial / Validate | Confirm PM custom task creation is supported. |
| Assignment | Partial / Validate | Confirm primary assignee rule and role restrictions. |
| Status tracking | Partial / Validate | Confirm Pending, In Progress, Completed, Blocked and timestamped transitions. |
| Due date highlighting | Partial / Not Verified | Confirm overdue, due-soon, and on-track states. |
| Completion percentage | Partial / Not Verified | Confirm completed tasks / total tasks × 100 is recalculated automatically. |
| Checklist view | Partial / Validate | Confirm checkboxes, assignee avatars, due dates, badges, priority sorting. |
| Drag-and-drop reorder | Not Verified in Static Review | Confirm task reordering and persisted `sort_order` or equivalent. |
| Task audit trail | Not Verified in Static Review | Confirm task status changes log timestamp + user ID. |

### Build / Validate Next

- Validate workflow/task service layer.
- Validate transactional updates.
- Validate `complete task` endpoint or equivalent:
  - sets completed state
  - stores completed timestamp
  - stores completing user
  - recalculates workflow completion
- Validate task status history/audit events.
- Validate persisted task ordering.

---

## 4.5 Blocker Management v1 — Corrected

**PRD expectation:** Manual blocker logging, severity levels, task linkage, blocker list, resolution tracking, detail view, linked task status changes, visual severity, and time-to-resolve.

### Corrected Assessment

The earlier report should **not** have marked Blocker Management v1 as missing.

Correct status:

> **Blocker Management v1: Implemented / Acceptance Validation Pending**

This means blocker management should be treated as an existing module that needs acceptance validation and hardening, not as a missing feature to rebuild from scratch.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| Blocker module existence | Implemented | Do not treat as missing. |
| Log blocker | Implemented / Validate | Confirm creation captures title, description, severity, linked task, and linked client where required. |
| Task linkage | Implemented / Validate | Confirm blocker is connected to the correct task and visible from task context. |
| Client linkage | Implemented / Validate | Confirm blocker can be filtered or viewed in client context where PRD expects it. |
| Severity levels | Implemented / Validate | Confirm High/Medium/Low severity is stored, rendered, and sortable. |
| Blocker list view | Implemented / Validate | Confirm filters by status, severity, client, and sorting by severity/date. |
| Resolution flow | Acceptance Validation Pending | Confirm resolving a blocker stores resolution notes, resolved timestamp, and resolving user. |
| Task side effect on create | Acceptance Validation Pending | Confirm creating a blocker sets linked task status to `blocked`. |
| Task side effect on resolve | Acceptance Validation Pending | Confirm resolving a blocker restores the task to the correct non-blocked state, not blindly to the wrong state. |
| Detail / timeline | Not Verified in Static Review | Confirm blocker detail page, timeline, comments/updates, or equivalent event history. |
| Time-to-resolve | Acceptance Validation Pending | Confirm resolved blockers display calculated time-to-resolve. |
| RBAC | Not Verified in Static Review | Confirm only permitted roles can create, edit, resolve, or delete blockers. |
| Tests | Not Verified in Static Review | Confirm lifecycle tests exist for create → block task → resolve → restore task. |

### Validate Next

- Do **not** rebuild blockers from scratch.
- Trace the existing blocker create path.
- Trace the existing blocker resolve path.
- Validate blocker-task status side effects.
- Validate blocker list filters and severity sorting.
- Validate blocker detail/timeline.
- Validate dashboard/client health impact.
- Add lifecycle tests:
  - create blocker
  - linked task becomes blocked
  - resolve blocker
  - resolution metadata is stored
  - linked task returns to correct status
  - unauthorized user cannot mutate blocker

---

## 4.6 Internal Dashboard MVP

**PRD expectation:** Metric cards, client health table, upcoming deadlines, recent activity feed, quick filters, health calculation, realtime updates, and infinite scroll activity.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| Metric cards | Partial / Validate | Confirm live DB values: active clients, workflows, average completion, blockers, utilization. |
| Client health table | Partial / Not Verified | Confirm health logic: On Track ≥70%, At Risk 50–69%, Off Track <50%. |
| Upcoming deadlines | Partial / Not Verified | Confirm tasks due in next 7 days and overdue tasks. |
| Activity feed | Not Verified in Static Review | Confirm last 20 events / last 7 days and infinite scroll. |
| Quick filters | Not Verified in Static Review | Confirm PM, client status, and date range filters. |
| Realtime updates | Not Verified in Static Review | Confirm cards update when tasks/blockers change. |

### Build / Validate Next

- Validate dashboard aggregation endpoint.
- Validate health calculation service.
- Validate dashboard uses live queries, not mock data.
- Validate blocker count and blocker severity influence dashboard state.
- Validate upcoming deadline queries.
- Validate activity feed.

---

# 5. Phase 2 Gap Report — Core Build

---

## 5.1 Task Dependencies & Subtasks — Corrected

**PRD expectation:** Dependencies, dependency chain view, subtasks, parent auto-completion, and subtask progress count.

### Corrected Assessment

The earlier report should **not** have treated subtasks as fully missing.

Correct status:

> **Subtask structure: Implemented Structurally / Acceptance Validation Pending**

Important distinction:

| Concept | Meaning | Correct Treatment |
|---|---|---|
| Subtasks | Parent task with child tasks/checklist items | Should be treated as structurally implemented if parent-child task structure exists. |
| Task dependencies | Task A must be completed before Task B can start | Separate feature from subtasks. |
| Dependency lock | System prevents starting dependency-blocked tasks | Separate behaviour to validate. |
| Dependency chain view | Visual display of upstream/downstream task relationships | Separate UI/UX requirement. |

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| Subtask structure | Implemented Structurally / Validate | Confirm parent-child relation works as intended in schema/API/UI. |
| Subtask CRUD | Acceptance Validation Pending | Confirm subtasks can be created, edited, completed, deleted, and displayed under parent task. |
| Parent auto-completion | Acceptance Validation Pending | Confirm parent task completes automatically only when all subtasks are complete. |
| Subtask progress | Acceptance Validation Pending | Confirm parent displays `x/y subtasks done`. |
| Workflow completion impact | Acceptance Validation Pending | Confirm subtasks affect workflow completion exactly as intended. |
| Task dependencies | Not Verified in Static Review | Confirm separate prerequisite/dependency references exist. |
| Dependency lock | Not Verified in Static Review | Confirm system prevents starting blocked-by-dependency tasks. |
| Dependency chain view | Not Verified in Static Review | Confirm visual unlock/downstream dependency view. |

### Validate Next

- Do **not** rebuild subtask structure if it already exists.
- Validate parent-child task data model.
- Validate subtask lifecycle from UI to API to database.
- Validate parent completion behaviour.
- Validate `x/y` subtask progress display.
- Validate whether dependencies are implemented separately from subtasks.
- Add tests for:
  - parent with zero subtasks
  - parent with incomplete subtasks
  - all subtasks complete
  - deleting a subtask
  - reopening a completed subtask
  - dependency-blocked task cannot start, if dependency feature exists

---

## 5.2 Comments, Files & Time Tracking

**PRD expectation:** Threaded task comments with @mentions, file attachments up to 25MB, cloud storage, time entries, and time reports/export.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| Task comments | Partial / Not Verified | Confirm threaded comments and task-level discussion. |
| @mentions | Not Verified in Static Review | Confirm mention parsing, notification creation, and user linking. |
| File attachments | Partial / Not Verified | Confirm task uploads to configured cloud/object storage. |
| File size limit | Not Verified in Static Review | Confirm 25MB max per file is enforced. |
| Time entries | Partial / Not Verified | Confirm hours, date, and description per task. |
| Time reports | Not Verified in Static Review | Confirm aggregate by client/member/date range and CSV export. |

### Build / Validate Next

- Validate comment model/API/UI.
- Validate @mention notification flow.
- Validate attachment storage provider and signed URL flow.
- Validate file size limit.
- Validate time entry CRUD.
- Validate reporting/export.

---

## 5.3 Team Capacity Management

**PRD expectation:** Utilization calculation, workload alerts over 80%, skill tagging, and client-team mapping matrix.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| Capacity tracking | Not Verified in Static Review | Confirm assigned task hours / available hours × 100. |
| Workload alerts | Not Verified in Static Review | Confirm alert when utilization exceeds 80%. |
| Skill tagging | Not Verified in Static Review | Confirm user skills such as SEO, PPC, Content, Design, Dev. |
| Client-team matrix | Not Verified in Static Review | Confirm view showing member-client-role mapping. |

### Build / Validate Next

- Validate capacity model or equivalent fields.
- Validate available-hours source.
- Validate workload calculation.
- Validate >80% alert generation.
- Validate skill tags.
- Validate client-team matrix UI.

---

## 5.4 Blocker Management v2

**PRD expectation:** Stakeholder notifications, escalation rules, dependency impact map, and blocker updates.

This is separate from Blocker Management v1.  
Blocker v1 should be treated as implemented/validation-pending.  
Blocker v2 should be validated separately.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| Stakeholder notification | Not Verified in Static Review | Confirm in-app + email notification based on severity. |
| Auto-escalation | Not Verified in Static Review | Confirm High 3 days, Medium 5 days, Low 7 days, unless configurable otherwise. |
| Dependency impact map | Not Verified in Static Review | Confirm downstream task impact from blockers. |
| Blocker updates | Not Verified in Static Review | Confirm timestamped progress notes/workarounds. |

### Build / Validate Next

- Validate blocker notification events.
- Validate blocker escalation scheduler or job.
- Validate dependency impact calculation.
- Validate blocker update/timeline model.
- Validate severity-based escalation rules.

---

## 5.5 Month Planning v1

**PRD expectation:** Start date algorithm, advance PM alerts, next-month workflow creation, and planning timeline.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| Start date algorithm | Not Verified in Static Review | Confirm previous month end + 20% service duration buffer. |
| Advance alerts | Not Verified in Static Review | Confirm PM notification 14 days before next month start. |
| Task pre-population | Not Verified in Static Review | Confirm next month confirmation creates workflow/tasks from template. |
| Planning timeline | Not Verified in Static Review | Confirm client/month/readiness table. |

### Build / Validate Next

- Validate month planning algorithm.
- Validate next-month workflow generation.
- Validate PM notification.
- Validate planning timeline UI.

---

## 5.6 Reporting Hub v1

**PRD expectation:** Campaign results logging, channel breakdown, content performance, and PDF export.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| Campaign results logging | Not Verified in Static Review | Confirm manual ad spend, impressions, clicks, leads, conversions, CPL, ROAS. |
| Channel breakdown | Not Verified in Static Review | Confirm Google Ads, Meta, LinkedIn, Organic, Email comparison. |
| Content performance | Not Verified in Static Review | Confirm blog/video/carousel performance tracking. |
| PDF export | Not Verified in Static Review | Confirm downloadable dashboard report with charts/KPIs. |

### Build / Validate Next

- Validate reporting data model.
- Validate manual result entry.
- Validate channel comparison.
- Validate content performance tracking.
- Validate PDF export.

---

## 5.7 Client Dashboard / External Portal

**PRD expectation:** Today’s work, progress tracker, milestone timeline, deliverable downloads, and separate client login with internal access restriction.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| Today’s work view | Not Verified in Static Review | Confirm client-facing real-time task status list. |
| Progress tracker | Not Verified in Static Review | Confirm current month completion bar and task count. |
| Milestone timeline | Not Verified in Static Review | Confirm completed/upcoming deliverables timeline. |
| Deliverable downloads | Not Verified in Static Review | Confirm organized downloadable reports/assets. |
| Client login | Partial / Not Verified | Confirm clients auto-route to portal and are blocked from internal views. |

### Build / Validate Next

- Validate client role routing.
- Validate client cannot access internal dashboard.
- Validate client-visible task/progress data.
- Validate deliverable download access rules.
- Validate client portal UI.

---

## 5.8 Notification System

**PRD expectation:** Bell icon, unread count, notification types, email alerts, read/unread, mark-all-read, and preferences by type/channel.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| In-app notifications | Partial / Not Verified | Confirm bell icon and unread count use persisted notifications. |
| Notification events | Not Verified in Static Review | Confirm task assigned, task overdue, blocker flagged/escalated, month planning alert. |
| Email notifications | Not Verified in Static Review | Confirm configurable email alerts. |
| Read/unread state | Not Verified in Static Review | Confirm mark-read and mark-all-read behaviour. |
| Preferences | Partial / Not Verified | Confirm per-user channel/type preferences. |

### Build / Validate Next

- Validate notification model/service.
- Validate event creation.
- Validate in-app bell.
- Validate email channel.
- Validate read/unread actions.
- Validate preferences.

---

## 5.9 CRM Integration — Sakhaa

**PRD expectation:** Bidirectional client sync, checklist sync, and CRM “Won” deal handoff trigger.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| Client data sync | Not Verified in Static Review | Confirm ERP ↔ CRM bidirectional sync. |
| Checklist sync | Not Verified in Static Review | Confirm ERP task checklists appear in CRM client view. |
| Pipeline trigger | Not Verified in Static Review | Confirm CRM deal moved to “Won” triggers ERP onboarding. |
| Retry/error handling | Not Verified in Static Review | Confirm failed sync retry and error visibility. |

### Build / Validate Next

- Validate CRM API/client.
- Validate field mapping.
- Validate onboarding trigger from CRM.
- Validate retries and failure logs.
- Validate idempotency.

---

## 5.10 Audit Log

**PRD expectation:** Log every create/update/delete with user, action type, entity type, entity ID, timestamp, before/after values, plus admin viewer with filters.

| Area | Revised Status | Gap / Validation Needed |
|---|---:|---|
| Action logging | Partial / Not Verified | Confirm create/update/delete logging across required entities. |
| Before/after values | Not Verified in Static Review | Confirm old/new value capture. |
| Admin viewer | Not Verified in Static Review | Confirm filter by user/entity/date; paginated and searchable. |
| Security | Not Verified in Static Review | Confirm only authorized admins can view audit logs. |

### Build / Validate Next

- Validate audit event creation in service layer.
- Validate before/after payloads.
- Validate admin audit viewer.
- Validate filters and pagination.
- Validate RBAC for audit log access.

---

# 6. Revised Recommended Implementation Order

This order avoids rebuilding modules that already exist structurally.

---

## Sprint 0 — Alignment & Verification Foundation

**Goal:** Establish what is implemented, structurally implemented, acceptance-pending, or genuinely missing.

- Freeze Phase 1–2 PRD checklist.
- Map each PRD item to:
  - schema/model
  - API/service
  - UI
  - side effects
  - RBAC
  - tests
- Create validation checklist for implemented modules.
- Add seed data for users, clients, templates, workflows, tasks, blockers, and subtasks.
- Add acceptance-test checklist mapped to PRD feature IDs.

---

## Sprint 1 — Auth, Users & RBAC

- Admin user creation.
- JWT/session validation.
- RBAC guards.
- Frontend protected routes.
- Client-only route restrictions.
- Password reset / Supabase reset UX.
- Login rate limiting.

---

## Sprint 2 — Client Onboarding + Scope Templates

- Complete client form and contract model.
- Scope template library.
- Template CRUD.
- Auto-scope matching.
- Transactional client creation.
- Month 1 workflow + task generation.
- Template snapshot/clone validation.

---

## Sprint 3 — Workflow, Task Engine & Subtask Behaviour

- Workflow list/detail.
- Task CRUD.
- Assignment.
- Status transitions.
- Completion percentage.
- Due date state.
- Checklist UI.
- Drag-and-drop task reorder.
- Task status audit events.
- Subtask parent-child lifecycle validation.
- Parent auto-completion validation.
- Subtask progress validation.

---

## Sprint 4 — Blocker v1 Acceptance Validation + Dashboard

- Validate existing blocker create/resolve flows.
- Validate blocker-task status side effects.
- Validate blocker filters/detail/timeline.
- Validate time-to-resolve.
- Validate blocker RBAC.
- Dashboard aggregation endpoint.
- Real metric cards.
- Client health table.
- Upcoming deadlines.
- Activity feed.

---

## Sprint 5 — Dependencies, Collaboration, Files & Time

- Task dependencies.
- Dependency lock.
- Dependency chain view.
- Comments and @mentions.
- File attachments.
- Time entries.
- Time reports and CSV export.

---

## Sprint 6 — Notifications, Capacity, Blocker v2 & Month Planning

- Notification table/service.
- In-app bell.
- Email alerts.
- Notification preferences.
- Blocker escalation.
- Stakeholder notifications.
- Dependency impact map.
- Capacity calculation.
- Workload alerts.
- Month planning algorithm.
- Next-month workflow creation.

---

## Sprint 7 — Reporting, Client Portal, CRM & Audit Viewer

- Campaign result logging.
- Channel breakdown charts.
- PDF export.
- Client dashboard.
- Deliverable downloads.
- Sakhaa CRM sync.
- CRM “Won” handoff.
- Admin audit log viewer.

---

# 7. Revised Suggested GitHub Epics

---

## EPIC-01 — Auth & RBAC Foundation

**Objective:** Make authentication, user roles, and route protection production-safe.

### Includes

- Admin-created users
- JWT/Supabase session validation
- RBAC guards
- Password reset
- Session/logout handling
- Rate limiting
- Protected frontend routes
- Client-only route restrictions

---

## EPIC-02 — Client Onboarding + Scope Templates

**Objective:** Turn onboarding into the source of workflow creation.

### Includes

- Client form
- Contract fields
- Industry/service selector
- Scope template matching
- Template CRUD
- Template seeding
- Client archive/recovery
- Workflow generation from template
- Template snapshot/immutability validation

---

## EPIC-03 — Workflow, Task Engine & Subtasks

**Objective:** Validate and complete the operational task system, including existing subtask structure.

### Includes

- Monthly workflows
- Task CRUD
- Assignment
- Status tracking
- Completion percentage
- Due dates
- Checklist UI
- Priority sorting
- Drag-and-drop reorder
- Task audit events
- Subtask lifecycle
- Parent auto-completion
- Subtask progress display

---

## EPIC-04 — Blocker v1 Lifecycle + Dashboard

**Objective:** Validate and harden existing Blocker Management v1 instead of rebuilding it.

### Includes

- Existing blocker create/resolve validation
- Severity validation
- Task-blocked side effects
- Resolution metadata
- Blocker filters
- Blocker detail/timeline
- Time-to-resolve
- Blocker RBAC
- Dashboard cards
- Client health table
- Deadline list
- Activity feed

---

## EPIC-05 — Dependencies, Collaboration, Files & Time

**Objective:** Add Phase 2 delivery depth beyond basic task/subtask structure.

### Includes

- Task dependencies
- Dependency lock
- Dependency chain view
- Comments
- @mentions
- File uploads
- Time tracking
- Time reports

---

## EPIC-06 — Notifications, Capacity, Blocker v2 & Month Planning

**Objective:** Add proactive operational alerts and planning intelligence.

### Includes

- In-app notifications
- Email alerts
- Preferences
- Blocker escalation
- Stakeholder notifications
- Dependency impact map
- Capacity calculation
- Skill tagging
- Client-team matrix
- Month planning alerts
- Next-month workflow generation

---

## EPIC-07 — Reporting, Client Portal, CRM & Audit

**Objective:** Complete Phase 2 lifecycle visibility.

### Includes

- Reporting hub
- Campaign logging
- Channel breakdown
- PDF export
- Client dashboard
- Deliverable downloads
- Sakhaa CRM sync
- CRM “Won” handoff
- Audit log viewer

---

# 8. Definition of Done for Phase 1–2 Completion

The ERP should only be marked Phase 1–2 complete when:

- Prisma schema matches PRD entities and fields.
- All PRD APIs either exist or have documented equivalent routes.
- Frontend screens use real backend data, not mock/static data.
- RBAC is enforced on backend and frontend.
- Client onboarding generates workflow and tasks automatically.
- Scope templates are cloned/snapshotted into workflows correctly.
- Task completion updates workflow completion percentage.
- Subtask completion updates parent task and progress correctly.
- Task dependencies, if implemented, are separate from subtasks and enforce correct locks.
- Blocker creation/resolution updates linked task state correctly.
- Blocker lifecycle stores severity, linked task/client, resolution metadata, and time-to-resolve.
- Dashboard metrics are calculated from live data.
- Phase 2 collaboration features are connected to tasks.
- Notifications are persisted and visible in-app.
- Email notifications are configurable.
- Client portal is role-isolated from internal views.
- CRM sync has retry/error handling.
- Audit log records create/update/delete with before/after values.
- E2E tests exist for:
  - onboarding
  - workflow generation
  - task completion
  - subtask parent completion
  - blocker creation
  - blocker resolution
  - dashboard metrics
  - client access restriction
  - RBAC violations

---

# 9. Immediate Next Step

Do **not** start by rebuilding Blocker Management or Subtasks.

Start with a verification sprint:

1. Trace existing Blocker Management v1 lifecycle:
   - create blocker
   - linked task becomes blocked
   - resolve blocker
   - resolution metadata is stored
   - linked task returns to correct status
   - dashboard reflects blocker status

2. Trace existing subtask lifecycle:
   - create parent task
   - create subtasks
   - complete subtasks
   - parent progress updates
   - parent auto-completes only when valid
   - workflow completion calculation remains correct

3. After validation, only build the missing pieces:
   - dependency lock
   - dependency chain view
   - blocker v2 escalation
   - notifications
   - reporting
   - client portal
   - CRM sync
   - audit viewer

---

# 10. Change Log From Previous Version

| Previous Claim | Corrected Claim |
|---|---|
| Blocker Management v1 was treated as Missing / Partial. | Blocker Management v1 is treated as Implemented / Acceptance Validation Pending. |
| Subtasks were treated as Missing / Partial. | Subtask structure is treated as Implemented Structurally / Acceptance Validation Pending. |
| Blockers were included as something to build from scratch. | Blockers should be validated and hardened, not rebuilt blindly. |
| Subtasks were grouped with dependencies as one missing module. | Subtasks and dependencies are separated. |
| “Missing / Not Verified” was overused. | This version uses `Not Verified in Static Review` where proof is unavailable, without assuming absence. |

