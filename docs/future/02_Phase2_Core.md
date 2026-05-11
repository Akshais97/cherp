3. Phase 2 — Core Build (Months 2–3)
Phase Objective: "Add depth to workflows (dependencies, subtasks, comments, time tracking), launch the client-facing dashboard, connect to Sakhaa CRM, build the reporting hub, and implement the notification system. By end of Phase 2, the system should handle full client lifecycle management."

3.1 Module: Task Dependencies & Subtasks
3.1.1 Requirements
Feature ID, Feature, Description, Priority
DEP-01, Task dependencies, Define prerequisite tasks. System prevents marking a task in_progress until dependencies are complete., Must
DEP-02, Dependency chain view, Visual display showing which tasks unlock which downstream tasks., Should
SUB-01, Subtask creation, "Break a task into 2–10 subtasks. Parent task auto-completes when all subtasks done.", Must
SUB-02, Subtask progress, "Parent task shows subtask completion count (e.g., “3/5 subtasks done”).", Must

3.1.2 Data Model Additions
Field, Type, Required, Description
depends_on, "UUID[] (FK)", No, Array of task IDs that must complete before this task can start.
parent_task_id, UUID (FK), No, If this is a subtask, references the parent task.
is_subtask, BOOLEAN, Yes, Flag indicating whether this is a subtask. Default: false.

3.2 Module: Comments, Files & Time Tracking
Feature ID, Feature, Description, Priority
COM-01, Task comments, "Threaded comments on any task. Supports @mentions to notify team members.", Must
FIL-01, File attachments, "Upload files to tasks. Max 25MB per file. Stored in cloud storage (S3/Cloudflare R2).", Must
TIM-01, Time tracking, "Log time entries per task: hours, date, description. Used for billing and capacity calculation.", Must
TIM-02, Time reports, "Aggregate time by client, team member, or date range. Export as CSV.", Should

3.3 Module: Team Capacity Management
Feature ID, Feature, Description, Priority
CAP-01, Capacity tracking, Auto-calculate each team member’s utilization: (assigned task hours / available hours) × 100., Must
CAP-02, Workload alerts, Alert when a team member exceeds 80% capacity., Must
CAP-03, Skill tagging, "Tag team members with skills (SEO, PPC, Content, Design, Dev). Used for intelligent assignment.", Should
CAP-04, Client-team mapping view, Matrix showing which team members are assigned to which clients and in what role., Must

3.4 Module: Blocker Management (v2)
Feature ID, Feature, Description, Priority
BLK-07, Stakeholder notification, "When blocker is logged, system sends in-app + email notification to configured stakeholders.", Must
BLK-08, Auto-escalation rules, "If blocker remains open for X days, auto-escalate to next level. High: 3 days, Medium: 5 days, Low: 7 days.", Must
BLK-09, Dependency impact map, Show which downstream tasks are affected by the blocker and estimated delay impact., Should
BLK-10, Blocker updates, "Add timestamped updates to an open blocker (progress notes, workarounds attempted).", Must

3.5 Module: Month Planning (v1)
Feature ID, Feature, Description, Priority
PLN-01, Start date algorithm, Calculate optimal start date: previous month end date + buffer. Buffer = service_duration_days × 0.2., Must
PLN-02, Advance alerts, Send notification to PM 14 days before a month should start., Must
PLN-03, Task pre-population, "When PM confirms next month start, auto-create workflow with tasks from scope template.", Must
PLN-04, Planning timeline, Table showing all clients with their current month, next month start date, and readiness status., Should

3.6 Module: Reporting Hub (v1)
Feature ID, Feature, Description, Priority
RPT-01, Campaign results logging, "Record per campaign: ad spend, impressions, clicks, leads, conversions, CPL, ROAS. Manual entry initially.", Must
RPT-02, Channel breakdown, Performance comparison across Google Ads, Meta, LinkedIn, Organic, Email. Table + visual chart., Must
RPT-03, Content performance, "Track individual content pieces: title, type, views, engagement rate, leads attributed.", Should
RPT-04, PDF export, Generate downloadable PDF report from dashboard data., Must

3.7 Module: Client Dashboard (External Portal)
Feature ID, Feature, Description, Priority
CDH-01, Today’s work view, Real-time list of tasks being worked on today with status indicators., Must
CDH-02, Progress tracker, Overall completion percentage for current month with visual progress bar., Must
CDH-03, Milestone timeline, Visual timeline showing completed deliverables and upcoming milestones., Must
CDH-04, Deliverable downloads, Clients download reports, creatives, and assets uploaded by the team., Should
CDH-05, Client login, Separate login flow for clients. Auto-routes to their dashboard. Cannot access internal views., Must

3.8 Module: Notification System
Feature ID, Feature, Description, Priority
NTF-01, In-app notifications, "Bell icon with unread count. Notification types: task assigned, overdue, blocker flagged, escalation, month alert.", Must
NTF-02, Email notifications, Configurable email alerts for critical events., Must
NTF-03, Read/unread state, Mark notifications as read. Bulk mark-all-read option., Must
NTF-04, Notification preferences, Per-user settings to enable/disable by type and channel., Should

3.9 Module: CRM Integration (Sakhaa)
Feature ID, Feature, Description, Priority
CRM-01, Client data sync, "Bidirectional sync: new clients in ERP create records in CRM and vice versa.", Must
CRM-02, Checklist sync, ERP task checklists appear in CRM client view. Status updates flow bidirectionally., Must
CRM-03, Pipeline handoff trigger, "When CRM deal moves to “Won”, auto-trigger client onboarding flow in ERP.", Should

3.10 Module: Audit Log
Feature ID, Feature, Description, Priority
AUD-01, Action logging, "Log every create, update, delete action with: user_id, type, timestamp, before/after values.", Must
AUD-02, Audit log viewer, Admin-only view with filters by user, entity type, date range., Should