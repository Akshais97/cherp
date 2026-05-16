# frontend.md — Agency Command Center ERP

## 1. Purpose

This file defines the Phase 1 frontend architecture contract.

The frontend must provide a fast, typed, maintainable ERP interface for:

- authentication
- client onboarding
- scope template preview
- workflow checklist execution
- task updates
- blocker management
- internal dashboard views

---

## 2. Selected Stack

| Area | Technology |
|---|---|
| Framework | React.js |
| Build Tool | Vite |
| Language | TypeScript |
| Styling | TailwindCSS |
| UI Components | shadcn/ui |
| Forms | React Hook Form |
| Client Validation | Zod |
| API Client | Axios instance |
| Server State | TanStack Query v5 |
| API Style | REST over HTTPS |

---

## 3. Frontend Principles

The frontend must be:

- type-safe
- modular
- role-aware
- tenant-aware through backend context
- form-safe
- API-driven
- component-based
- simple enough for Phase 1 maintenance

The frontend must not contain business-critical authorization logic.

Backend remains the source of truth.

---

## 4. Folder Structure

Recommended structure:

```txt
src/
  app/
    routes/
    providers/
  components/
    ui/
    layout/
    shared/
  features/
    auth/
    dashboard/
    clients/
    workflows/
    tasks/
    blockers/
    scope-templates/
  lib/
    api/
    auth/
    constants/
    permissions/
    utils/
  schemas/
  types/
```

Rules:

- Feature-specific UI stays inside `features`.
- Reusable UI stays inside `components`.
- API calls stay inside feature API files or `lib/api`.
- Zod schemas stay in `schemas` or inside feature modules.
- Shared enums/constants must not be duplicated.

---

## 5. API Communication

All API communication must go through a central Axios instance.

The Axios instance owns:

- base URL
- auth token attachment
- request timeout
- error normalization
- future refresh token handling
- common headers

No component should call `fetch` or raw Axios directly.

---

## 6. Server State

Use TanStack Query for:

- client lists
- workflow details
- task lists
- blocker lists
- dashboard metrics
- scope template previews

Rules:

- server data must not be duplicated into local component state unless editing.
- mutations must invalidate or update relevant queries.
- loading, empty, and error states are required.
- avoid manual `useEffect` fetching for server data.

---

## 7. Forms

Use React Hook Form + Zod for:

- login
- client onboarding
- client edit
- task creation/update
- blocker creation/resolution
- scope template forms

Rules:

- validate required fields before submit.
- show field-level errors.
- disable submit during mutation.
- prevent double submit.
- never send system-controlled fields from forms.

---

## 8. Phase 1 Screens

Required screens:

| Screen | Purpose |
|---|---|
| Login | User authentication |
| Internal Dashboard | Metrics, health table, deadlines, blockers |
| Client List | Searchable/filterable client view |
| Client Onboarding | Create client + preview scope template |
| Client Detail | Client profile and linked workflows |
| Workflow Detail | Checklist, assignees, due dates, progress |
| Task Update UI | Status, assignee, due date, priority |
| Blocker List | Open/resolved blockers with filters |
| Blocker Detail | Impact and resolution tracking |

---

## 9. UI Behavior Rules

### Dashboard

Dashboard data is derived from APIs.

Frontend must not calculate source-of-truth values when backend provides them.

Allowed frontend derivations:

- badge color
- progress bar display
- date formatting
- empty states

---

### Checklist

Workflow checklist must show:

- task title
- status
- assignee
- due date
- priority
- blocker indicator
- completion action where allowed

Overdue tasks must be visually highlighted.

---

### Scope Template Preview

On industry/service selection:

- preview matching scope template
- show default tasks and KPIs
- allow PM to continue only after valid template resolution

---

## 10. Permission-Aware UI

Frontend must use role and ownership data to show correct actions.

Examples:

- client users get read-only dashboard views.
- team members only see assigned operational actions.
- PMs see onboarding and assignment tools.
- only super admins see platform/user administration.

Hidden UI is not security.

Backend guards are mandatory.

---

## 11. Error Handling

All API errors must be normalized into user-safe messages.

Frontend must handle:

- unauthorized
- forbidden
- validation error
- not found
- network failure
- server error

Do not expose raw stack traces or database errors.

---

## 12. Performance Rules

Targets:

| Area | Target |
|---|---|
| Client list | Loads under 1 second for 100 clients |
| Dashboard | Loads under 2 seconds for 50 active clients |
| Template preview | Updates within 200ms |
| Task status update | Reflects quickly after mutation |

Use pagination, query caching, and table virtualization later if required.

---

## 13. Non-Goals for Phase 1

Do not implement:

- complex global state management
- frontend workflow engine
- offline mode
- websocket realtime
- Kanban/Gantt views
- client-side authorization as source of truth
- AI UI flows
- drag-heavy custom builders

Phase 1 should stay simple, reliable, and easy to extend.
