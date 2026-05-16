2. Phase 1 — MVP (Weeks 1–4)
Phase Objective: "Deliver the foundational system that allows CHLEAR to onboard clients, manage workflows, track task completion, and log blockers. The team should be able to replace their current spreadsheet/manual tracking within 4 weeks."

2.1 Module: Authentication & Platform Foundation
2.1.1 Purpose
Establish the security, identity, and infrastructure layer upon which all other modules depend. This includes user registration, login, session management, and role-based access control.

2.1.2 User Stories
"As a system administrator, I want to create user accounts with specific roles, so that team members only access what they need."
"As a team member, I want to log in securely and see only my assigned clients and tasks, so that I can focus on my work without being overwhelmed by unrelated data."
"As a agency owner, I want to define permission levels for different roles, so that sensitive data like financials is only visible to authorized people."

2.1.3 Feature Specifications
Feature ID, Feature, Description, Priority
AUTH-01, User registration, "Admin creates accounts with email, name, role. Password requirements: 8+ chars, 1 uppercase, 1 number.", Must
AUTH-02, JWT authentication, "Stateless token-based auth. Access tokens expire in 1 hour, refresh tokens in 7 days.", Must
AUTH-03, Role-based access control, "Four roles: Super Admin (full access), Project Manager (all except settings), Team Member (own tasks + blocker logging), Client (dashboard only).", Must
AUTH-04, Password reset flow, Email-based reset with secure token. Token expires in 1 hour., Must
AUTH-05, Session management, Track active sessions. Allow users to log out from all devices., Should

2.1.4 Data Model
Field, Type, Required, Description
id, UUID (PK), Yes, Unique user identifier
email, VARCHAR(255), Yes, Unique email address for login
password_hash, VARCHAR(255), Yes, bcrypt hashed password (12 salt rounds) (Note: Adjusted for Supabase Auth integration)
name, VARCHAR(100), Yes, Full name of user
role, ENUM, Yes, "One of: super_admin, project_manager, team_member, client"
avatar_url, VARCHAR(500), No, Profile image URL
is_active, BOOLEAN, Yes, Soft delete flag (default: true)
last_login, TIMESTAMP, No, Last successful login timestamp
created_at, TIMESTAMP, Yes, Account creation date
updated_at, TIMESTAMP, Yes, Last modification date
auth_user_id, UUID,, 

2.1.5 API Endpoints
Method, Endpoint, Description, Auth Required
POST, /api/auth/register, Create new user (admin only), Yes (Super Admin)
POST, /api/auth/login, Authenticate and return JWT tokens, No
POST, /api/auth/refresh, Refresh access token using refresh token, No
POST, /api/auth/logout, Invalidate refresh token, Yes
POST, /api/auth/forgot-password, Send password reset email, No
POST, /api/auth/reset-password, Reset password with token, No
GET, /api/users, List all users (filtered by role), Yes (PM+)
PATCH, /api/users/:id, Update user profile/role, Yes (Super Admin)

2.1.6 Acceptance Criteria
#, Acceptance Criteria, Priority
AC-01, "Users can register, log in, and receive a valid JWT token within 500ms", Must
AC-02, Access tokens expire after 1 hour and can be refreshed without re-login, Must
AC-03, Role-based permissions prevent unauthorized access to protected routes, Must
AC-04, Password reset emails are sent within 30 seconds of request, Must
AC-05, Failed login attempts are rate-limited (5 per minute per IP), Should
AC-06, All passwords are hashed with bcrypt (12 rounds) before storage, Must

2.2 Module: Client Onboarding
2.2.1 Purpose
Provide a structured entry point for every new client engagement. When a client is onboarded, their industry, service type, and contract details are captured, and the system automatically assigns the appropriate scope template and generates the initial workflow.

2.2.2 User Stories
"As a project manager, I want to onboard a new client by filling in their details and selecting their industry, so that the system automatically creates their workflow with the right tasks and KPIs."
"As a agency owner, I want to see all onboarded clients with their status at a glance, so that I know the state of every engagement."
"As a project manager, I want to edit a client’s details after onboarding, so that I can keep records accurate as things change."

2.2.3 Feature Specifications
Feature ID, Feature, Description, Priority
CLT-01, Client profile form, "Fields: name, industry, service type, contact person, email, phone, address, notes. All validated on submit.", Must
CLT-02, Industry selector, "Dropdown with predefined industries: Real Estate, E-commerce, SaaS, FinTech, Hospitality, Education, HealthTech. Extensible by admin.", Must
CLT-03, Service type picker, "Select from: Digital Marketing (Full Suite), SEO + Content, Performance Marketing (PPC), Social Media Management, Brand Strategy, Website Development.", Must
CLT-04, Auto-assign scope, "When industry + service type selected, system pulls matching scope template. If no exact match, shows closest options.", Must
CLT-05, Contract details, "Monthly retainer (amount + currency), contract duration (months), start date, payment terms, renewal date.", Must
CLT-06, Client list view, "Sortable table: name, industry, service, status (Active/Completed/Paused), onboarded date. Search and filter.", Must
CLT-07, Client status management, "Toggle between Active, Paused, Completed. Status change triggers workflow state updates.", Must
CLT-08, Client edit/archive, Edit all fields. Archive (soft delete) with confirmation. Archived clients hidden from default views., Should

2.2.4 Data Model: Clients
Field, Type, Required, Description
id, UUID (PK), Yes, Unique client identifier
name, VARCHAR(200), Yes, Company/client name
industry, VARCHAR(100), Yes, Industry classification
service_type, VARCHAR(100), Yes, Service being provided
contact_name, VARCHAR(100), Yes, Primary contact person name
contact_email, VARCHAR(255), Yes, Primary contact email
contact_phone, VARCHAR(20), No, Contact phone number
address, TEXT, No, Business address
monthly_retainer, DECIMAL(10,2), No, Monthly retainer amount
currency, VARCHAR(3), Yes, "Currency code (INR, USD, AED). Default: INR"
contract_duration, INTEGER, Yes, Contract duration in months
contract_start, DATE, Yes, Contract start date
contract_end, DATE, Yes, Contract end date (auto-calculated)
status, ENUM, Yes, "One of: active, paused, completed, archived"
notes, TEXT, No, Special requirements or context
scope_template_id, UUID (FK), No, Linked scope template
created_by, UUID (FK), Yes, User who created the record
created_at, TIMESTAMP, Yes, Creation timestamp
updated_at, TIMESTAMP, Yes, Last update timestamp

2.2.5 API Endpoints
Method, Endpoint, Description, Auth
POST, /api/clients, Create new client + auto-generate workflow, PM+
GET, /api/clients, "List all clients (paginated, filterable)", PM+
GET, /api/clients/:id, Get client detail with linked workflows, PM+
PATCH, /api/clients/:id, Update client details, PM+
PATCH, /api/clients/:id/status, Change client status, PM+
DELETE, /api/clients/:id, Archive client (soft delete), Admin

2.2.6 Acceptance Criteria
#, Acceptance Criteria, Priority
AC-01, Client profile form validates all required fields before submission, Must
AC-02, Selecting industry + service type auto-populates scope template within 200ms, Must
AC-03, Creating a client automatically generates Month 1 workflow with tasks from template, Must
AC-04, Client list view loads within 1 second with up to 100 clients, Must
AC-05, "Search finds clients by name, industry, or service type with instant filtering", Must
AC-06, Archived clients are excluded from active views but recoverable by admin, Should
AC-07, Contract end date is auto-calculated from start date + duration, Must

2.2.7 UI Requirements
Onboarding form: Two-column layout. Left: form fields. Right: live scope template preview.
Client list: Full-width table with status badges (green = Active, amber = Paused, gray = Completed).
Scope template preview: Card showing default tasks, KPIs, and duration. “Customize” button to modify before saving.
Mobile responsive: Form stacks to single column. Table becomes card view on mobile.

2.3 Module: Scope Templates
2.3.1 Purpose
Industry-specific blueprints that standardize service delivery. When a client is onboarded, the matching template provides default tasks, KPI frameworks, and timelines.

2.3.2 User Stories
"As a project manager, I want to select an industry template that auto-populates tasks and KPIs, so that I don’t have to recreate the same checklist for every new client."
"As a agency owner, I want to maintain a library of scope templates that the team can use, so that our delivery process is standardized and scalable."

2.3.3 Feature Specifications
Feature ID, Feature, Description, Priority
TPL-01, Template library, "Predefined templates for 7+ industries. Each stores: industry, service type, task list, KPI list, duration.", Must
TPL-02, Default task lists, "Each template has month-by-month task lists (Month 1: Foundation, Month 2: Execution, etc.).", Must
TPL-03, KPI frameworks, Each template defines industry-specific KPIs with suggested target ranges., Must
TPL-04, Template CRUD, "Admin can create, edit, and deactivate templates.", Must

2.3.4 Data Model: Scope Templates
Field, Type, Required, Description
id, UUID (PK), Yes, Unique template identifier
industry, VARCHAR(100), Yes, Target industry
service_type, VARCHAR(100), Yes, Service type this template applies to
name, VARCHAR(200), Yes, Template display name
description, TEXT, No, Template overview
duration_months, INTEGER, Yes, Standard engagement duration
default_tasks, JSONB, Yes, "Array of task objects grouped by month: [{month: 1, tasks: [{name, duration_days, order}]}]"
kpi_framework, JSONB, Yes, "Array of KPI definitions: [{name, unit, suggested_target, description}]"
is_active, BOOLEAN, Yes, Whether template is available for assignment
created_by, UUID (FK), Yes, Creator
created_at, TIMESTAMP, Yes, Creation date
updated_at, TIMESTAMP, Yes, Last modified

2.4 Module: Workflows & Tasks
2.4.1 Purpose
The operational backbone. A workflow represents a client’s engagement month. Each workflow contains a checklist of tasks that the assigned PM and team work through.

2.4.2 User Stories
"As a project manager, I want to see all tasks for a client’s current month with their status and assignees, so that I know exactly where we stand."
"As a team member, I want to mark my assigned tasks as complete and see what’s next."
"As a agency owner, I want to view completion percentage across all clients, so that I can identify which engagements are at risk."

2.4.3 Feature Specifications
Feature ID, Feature, Description, Priority
WRK-01, Workflow creation, Auto-created when client is onboarded. One workflow per month. Contains tasks from scope template., Must
WRK-02, Task creation, "Auto-populated from template. PM can add custom tasks. Fields: name, description, assignee, due date, priority.", Must
WRK-03, Task assignment, Assign any team member to a task. One primary assignee per task., Must
WRK-04, Status tracking, "Four states: pending, in_progress, completed, blocked. State changes are timestamped.", Must
WRK-05, Due date management, "Each task has a due date. System highlights overdue tasks (red), due-soon (amber), on-track (default).", Must
WRK-06, Completion tracking, Auto-calculate completion % per workflow. Display progress bar on dashboard., Must
WRK-07, Checklist view, "Full checklist with checkboxes, assignee avatars, due dates, and status badges. PM ticks off items.", Must
WRK-08, Priority levels, "Three priorities: High, Medium, Low. Affects sort order in checklist view.", Should

2.4.4 Data Model: Workflows
Field, Type, Required, Description
id, UUID (PK), Yes, Unique workflow identifier
client_id, UUID (FK), Yes, Links to clients table
template_id, UUID (FK), No, Source scope template
month_number, INTEGER, Yes, "Month in the engagement (1, 2, 3...)"
title, VARCHAR(200), Yes, "Display title (e.g., “Bright Homes — Month 1”)"
status, ENUM, Yes, "One of: draft, active, completed, paused"
start_date, DATE, Yes, Workflow start date
end_date, DATE, Yes, Expected completion date
pm_id, UUID (FK), Yes, Assigned project manager
completion_pct, DECIMAL(5,2), Yes, Auto-calculated from task statuses
created_at, TIMESTAMP, Yes, Creation timestamp
updated_at, TIMESTAMP, Yes, Last modified
auto_generated, boolean, Yes, Indicates if workflow was auto-generated

2.4.5 Data Model: Tasks
Field, Type, Required, Description
id, UUID (PK), Yes, Unique task identifier
workflow_id, UUID (FK), Yes, Parent workflow
name, VARCHAR(300), Yes, Task title
description, TEXT, No, Detailed description
assigned_to, UUID (FK), No, Team member assigned
status, ENUM, Yes, "One of: pending, in_progress, completed, blocked"
priority, ENUM, Yes, "One of: high, medium, low. Default: medium"
due_date, DATE, Yes, Task deadline
completed_at, TIMESTAMP, No, Actual completion timestamp
completed_by, UUID (FK), No, User who marked complete
sort_order, INTEGER, Yes, Display order in checklist
created_at, TIMESTAMP, Yes, Creation timestamp
updated_at, TIMESTAMP, Yes, Last modified

2.4.6 API Endpoints
Method, Endpoint, Description, Auth
GET, /api/workflows, "List workflows (filterable by client, status, PM)", PM+
GET, /api/workflows/:id, Get workflow with all tasks, PM+
POST, /api/workflows/:id/tasks, Add custom task to workflow, PM+
PATCH, /api/tasks/:id, "Update task (status, assignee, due date)", Team+
PATCH, /api/tasks/:id/complete, "Mark task complete (sets completed_at, completed_by)", Team+
GET, /api/clients/:id/workflows, Get all workflows for a client, PM+

2.4.7 Acceptance Criteria
#, Acceptance Criteria, Priority
AC-01, Onboarding a client auto-creates Month 1 workflow with all tasks from the scope template, Must
AC-02, PM can tick off tasks; completion percentage updates in real time, Must
AC-03, Overdue tasks are visually highlighted within 24 hours of passing due date, Must
AC-04, Tasks can be reordered via drag-and-drop in the checklist view, Should
AC-05, Workflow completion % is accurately calculated (completed tasks / total tasks × 100), Must
AC-06, Task status changes are logged with timestamp and user ID for audit trail, Must

2.5 Module: Blocker Management (v1)
2.5.1 Purpose
Provide a structured way to identify, document, and track obstacles that prevent tasks from progressing.

2.5.2 User Stories
"As a team member, I want to flag a blocker on my task with a description and severity level, so that the PM knows I’m stuck and can help resolve it."
"As a project manager, I want to see all open blockers across my clients in one view, so that I can prioritize resolution and unblock my team."

2.5.3 Feature Specifications
Feature ID, Feature, Description, Priority
BLK-01, Log blocker, "Create blocker with: title, description, severity, linked task, linked client. Auto-sets flagged_date.", Must
BLK-02, Severity levels, "Three levels: High (stops workflow), Medium (delays tasks), Low (minor impact). Affects visual styling and sort order.", Must
BLK-03, Link to task, "Each blocker must reference a specific task. When blocker is created, linked task status changes to “blocked”.", Must
BLK-04, Blocker list view, "Table of all blockers with filters: status (open/resolved), severity, client. Sortable by date and severity.", Must
BLK-05, Resolution tracking, Mark blocker as resolved with resolution notes. Auto-updates linked task status back to “in_progress”., Must
BLK-06, Blocker detail view, "Full view with: description, impact, linked task/client, timeline (created → updates → resolved), resolution notes.", Should

2.5.4 Data Model: Blockers
Field, Type, Required, Description
id, UUID (PK), Yes, Unique blocker identifier
task_id, UUID (FK), Yes, Linked task that is blocked
client_id, UUID (FK), Yes, Client affected
title, VARCHAR(300), Yes, Short blocker title
description, TEXT, Yes, Detailed description of the obstacle
severity, ENUM, Yes, "One of: high, medium, low"
status, ENUM, Yes, "One of: open, resolved"
impact, TEXT, No, Description of downstream impact
resolution_notes, TEXT, No, How the blocker was resolved
flagged_by, UUID (FK), Yes, User who created the blocker
resolved_by, UUID (FK), No, User who resolved the blocker
flagged_date, TIMESTAMP, Yes, When blocker was created
resolved_date, TIMESTAMP, No, When blocker was resolved
created_at, TIMESTAMP, Yes, Record creation timestamp
updated_at, TIMESTAMP, Yes, Last modified

2.5.5 Acceptance Criteria
#, Acceptance Criteria, Priority
AC-01, Creating a blocker automatically changes the linked task’s status to “blocked”, Must
AC-02, Resolving a blocker restores the linked task to “in_progress”, Must
AC-03, "Blocker list view shows all open blockers sorted by severity (high first), then by date", Must
AC-04, High-severity blockers are visually distinct (red border/background) in all views, Must
AC-05, Time-to-resolve is calculated and displayed on resolved blockers, Should

2.6 Module: Internal Dashboard (MVP)
2.6.1 Purpose
The home screen for internal users. Provides an at-a-glance overview of all clients, workflows, upcoming deadlines, and blockers.

2.6.2 Feature Specifications
Feature ID, Feature, Description, Priority
DSH-01, Metric summary cards, "Top row: Active Clients, Active Workflows, Avg Completion %, Open Blockers, Team Utilization.", Must
DSH-02, Client health table, "Table showing each client with: name, current month, progress bar, health status, blocker count.", Must
DSH-03, Upcoming deadlines, "List of tasks due within the next 7 days, sorted by date. Highlights overdue in red.", Must
DSH-04, Recent activity feed, "Timeline of recent actions: tasks completed, blockers flagged, clients onboarded. Shows last 20 events.", Should
DSH-05, Quick filters, "Filter dashboard by PM, client status, or date range.", Should

2.6.3 Acceptance Criteria
#, Acceptance Criteria, Priority
AC-01, Dashboard loads within 2 seconds with up to 50 active clients, Must
AC-02, "Client health status auto-calculates: On Track (≥70%), At Risk (50–69%), Off Track (<50%)", Must
AC-03, Clicking a client row navigates to their workflow detail page, Must
AC-04, Metric cards update in real time as tasks are completed or blockers are logged, Should
AC-05, Activity feed shows events from the last 7 days with infinite scroll, Should