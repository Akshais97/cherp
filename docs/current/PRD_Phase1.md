# Product Requirements Document (PRD) - Phase 1 MVP
## Saarthi Cherp (Agency Command Center ERP)

---

## 1. Document Overview & Purpose

This document defines the functional and technical requirements for the **Phase 1 MVP** of **Saarthi Cherp** (formerly Sakhaa Cherp). Saarthi Cherp is an integrated Enterprise Resource Planning (ERP) system designed for marketing and advertising agencies to standardize client onboarding, automate workflow creation, manage day-to-day task execution, log blockers, and track overall account delivery.

The objective of Phase 1 is to deliver a robust, modular monolith that allows the agency team to migrate client tracking from manual spreadsheets to a central, tenant-isolated, and role-aware dashboard.

---

## 2. System Architecture & Stack

The system is built as a single deployable modular monolith:

| Layer | Technology | Description |
|---|---|---|
| **Frontend** | React + Vite + TypeScript | Standardized UI structure with strict type-safety |
| **UI Styling** | Vanilla CSS + TailwindCSS + shadcn/ui | Premium, fluid layouts with responsive support |
| **Forms & Validation** | React Hook Form + Zod | Performs schema validation before dispatching requests |
| **Server State** | TanStack Query v5 | Handles asynchronous cache, states, and refetching |
| **Backend Framework** | NestJS | OOP structure with controller-service-repository separation |
| **ORM** | Prisma ORM | Type-safe database queries and migration orchestration |
| **Database** | Supabase PostgreSQL | Managed Postgres database with tenant-owned schemas |
| **Authentication** | Supabase Auth + Local Token Verification | Stateless JWT token-based authentication |

### Tenant Isolation Rule
*   All tables (except `roles` and global configurations) contain a `tenant_id` UUID column.
*   Every database read and write query must filter strictly on `tenant_id` extracted from the authenticated user's token context. Cross-tenant queries are forbidden.

---

## 3. User Roles & RBAC (Permissions Matrix)

The system enforces four core roles:

1.  **Super Admin**:
    *   Full administrative permissions.
    *   Manage agency users, roles, active/inactive states.
    *   Delete users (safely checked for historical constraint references).
    *   Create, view, edit, and resolve all clients, templates, workflows, tasks, and blockers.
2.  **Project Manager (PM)**:
    *   Orchestrate service delivery and operations.
    *   Onboard clients, select scope templates, generate workflows.
    *   Create, update, assign, and delete tasks.
    *   Approve tasks (`task_approved_by_manager`) or send back for rework (`rework`).
    *   Create, view, and resolve blockers.
3.  **Team Member (TM)**:
    *   Execute assigned tasks.
    *   View own dashboard, client guidelines, and task lists.
    *   Update progress of assigned tasks (yet_to_start, ongoing, completed).
    *   Request approval on tasks (transitions task to `completed` for PM review).
    *   Log blockers on assigned tasks (must assign the blocker to a user).
    *   Resolve blockers where they are either the assignor or assignee.
4.  **Client**:
    *   Read-only dashboard access.
    *   Monitor workflow progress and checklist status.
    *   Approve tasks (`task_approved_by_client`).
    *   Cannot mutate tasks, users, blockers, or configurations.

---

## 4. Module Specifications

### 4.1 Authentication & Auth Sync
*   **Sign-In / Sign-Out**: Handled via Supabase Auth.
*   **Auth User Synchronization**: A central database listener or admin utility syncs Supabase Auth user profiles with the ERP `users` table, aligning `auth_user_id` values.
*   **JwtAuthGuard caching**: Implements local caching and promise memoization to mitigate concurrent database roundtrips during page navigation.

### 4.2 Client Onboarding & Directory
*   **Onboarding Flow**: A three-step Wizard:
    1.  *Client Details*: Form for name, industry, retainer, and hours.
    2.  *Scope Template Selection*: Dropdown of pre-populated scope templates matching the client's industry and service type.
    3.  *Review & Confirm*: Full-width review section summarizing properties before committing the transaction.
*   **Onboarding Transaction**: Atomically creates:
    *   Client record.
    *   Assigned Client User entries.
    *   Month 1 Workflow.
    *   Tasks generated from the template checklist.
    *   Append-only activity logs.
*   **Client Directory**: Desktop master-detail view keeping status badges visible in the list panel.

### 4.3 Workflows & Tasks
*   **Checklist Management**: Tasks are grouped under month-by-month workflows.
*   **Task Properties**: Title, description, assignee, priority (high, medium, low), slot time, client name, and **Assigned By** (assignor metadata).
*   **Checklist Interaction**: Supports custom tasks addition and drag-and-drop handles for order updates.
*   **Daily Tasks**: Option to flag a task as a "Daily Task" instead of specifying a target due date.
*   **Button Transitions**: "Apply changes" and "Complete Task" provide loading indicators ("Saving...") and temporary success confirmation states ("Saved!") upon completion.

### 4.4 Blocker Management
*   **Blocker Creation**: Flagged on a specific task. Forces task status to `blocked` and caches the previous status in `blocked_previous_status`.
*   **Blocker Assignee**: Every blocker must have a required assignee.
*   **Notified Stakeholders**: Restricts notification recipients to:
    *   `Account Manager`
    *   `Client Partner`
*   **Blocker Resolution**: Updates blocker status to `resolved` and, if no other open blockers remain, rolls back the task status to its pre-blocked state.

### 4.5 Notifications
*   **Task PM Notifications**: Dispatched to the task's PM when a Team Member transitions a task status *out of* `ongoing`.
*   **Blocker Notifications**: Created for the assignee, task PM, and any user in the tenant with the designation of `Account Manager` or `Client Partner` if notified.

### 4.6 AI Chatbot Widget
*   **guided Menu Options**: Displays tailored buttons for guided options depending on the user role.
*   **Entity Mapping**: Resolves task titles, user names, and client brands to invoke actions like task creation, updates, and approvals.
*   **Security constraints**: Restricts mutations (e.g. creating/deleting tasks) based on RBAC guards.

---

## 5. Data Models (ERP Schema)

*   **Tenant**: Isolation root boundary (`tenants`).
*   **User**: System users containing email, role, and `designation` (e.g. 'Account Manager') (`users`).
*   **Client**: Customer details, contract bounds, and brand guidelines (`clients`).
*   **ScopeTemplate**: Pre-defined task blueprint library (`scope_templates`).
*   **Workflow**: Client delivery cycle container (`workflows`).
*   **Task**: Checklist item containing `assigned_to`, `assigned_by`, `client_id`, `status` (`tasks`).
*   **Blocker**: Obstacle blocking task progression (`blockers`).
*   **Notification**: In-app alerts (`notifications`).
*   **ActivityLog**: Append-only transaction audit trail (`activity_logs`).

---

## 6. Non-Goals (Future Scope)
The following features are **explicitly out of scope** for Phase 1:
*   SSO and OAuth.
*   Freelancer management portals.
*   Automated billing and invoice generation.
*   Integrations (Slack, Email, SMS, CRM sync).
*   Event queues, microservices, and event-driven architecture.
*   AI Insights, ML churn prediction, and anomaly detection.
*   Gantt charts and Kanban boards.
