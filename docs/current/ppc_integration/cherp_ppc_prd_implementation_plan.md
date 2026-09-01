# CHERP ERP — PPC Implementation Plan

**Document type:** PRD-grounded implementation plan  
**Project:** CHERP / Agency Command Center ERP  
**Repository branch referenced:** `ui-animations-reactlib`  
**Primary source:** Shared PRD document: `Agency-ERP-Detailed-PRD-v2.1-2_Phases(4).docx`  
**Scope:** PPC requirements that are actually present or directly implied by the shared Phase 1–2 PRD and inspected repo state  
**No-guesswork rule:** This document does not invent a detailed Phase 3 ad-platform integration because the shared PRD only lists Phase 3 at summary level.

---

## 1. Source Boundary

The shared PRD is a detailed Phase 1 and Phase 2 requirements document. PPC is not specified as a standalone advertising intelligence module in the detailed Phase 1–2 sections. PPC appears as part of CHERP’s agency ERP workflow in the following ways:

1. **Client onboarding service type** — `Performance Marketing (PPC)` is one of the PRD service types.
2. **Scope templates** — the selected industry and service type must pull a matching scope template containing default tasks, KPIs, and duration.
3. **Workflow/task execution** — PPC work must be generated into workflows and tasks, with assignee, due date, priority, status, completion tracking, and audit logs.
4. **Team capacity** — `PPC` is listed as a skill tag for intelligent assignment and capacity planning.
5. **Reporting Hub** — this is the main PPC business requirement: campaign result logging, channel breakdown, content performance, and PDF export.
6. **Client Dashboard** — clients must be able to view progress and download reports, creatives, and assets.
7. **Notifications** — task assignment, overdue task, blocker escalation, deadline/reminder, digest, and preference flows support PPC operations.
8. **CRM Sync** — CRM sync is listed in Phase 2 but is planned for later implementation.
9. **Future Phase 3 Intelligence** — the PRD summary mentions ad platform APIs, rules engine, ML insights, anomaly detection, and churn prediction, but the uploaded document does not provide detailed specifications for those Phase 3 features.

Therefore, this plan focuses on **manual PPC delivery + reporting inside CHERP**, not automatic Google Ads/Meta Ads API sync yet.

---

## 2. PRD-Backed PPC Requirements

### 2.1 PPC service type in onboarding

The PRD service type picker includes:

- Digital Marketing (Full Suite)
- SEO + Content
- **Performance Marketing (PPC)**
- Social Media Management
- Brand Strategy
- Website Development

**Implementation meaning:** during client onboarding, the PM must be able to select `Performance Marketing (PPC)` and get a matching PPC scope template.

---

### 2.2 Auto-assigned PPC scope template

The PRD requires that when industry and service type are selected, the system pulls a matching scope template. If no exact match exists, it must show closest options.

**Implementation meaning:** `industry + Performance Marketing (PPC)` should resolve to a PPC delivery template. If an exact template is missing, the system should recommend closest matching templates rather than failing silently.

---

### 2.3 PPC scope templates

The PRD Scope Template module requires each template to contain:

- industry
- service type
- template name
- description
- duration in months
- default tasks grouped by month
- KPI framework
- active/inactive status

**Implementation meaning:** PPC cannot be just a label. It needs formal templates with PPC task lists and PPC KPIs.

---

### 2.4 PPC workflow and task execution

The PRD Workflows & Tasks module requires:

- one workflow per month
- tasks generated from the selected scope template
- PM ability to add custom tasks
- assignee
- due date
- priority
- status tracking
- checklist view
- completion percentage
- overdue highlighting
- drag-and-drop reordering
- audit logging of task status changes

**Implementation meaning:** PPC onboarding must generate an actual PPC workflow with executable tasks, assignees, due dates, and progress tracking.

---

### 2.5 PPC skill-based capacity

The PRD Team Capacity module says skill tagging should include skills such as:

- SEO
- PPC
- Content
- Design
- Dev

It also says utilization should be calculated as:

```text
assigned task hours / available hours × 100
```

**Implementation meaning:** PPC tasks should preferably be assigned to team members tagged with `PPC`, and planned task hours should feed workload/capacity calculation.

---

### 2.6 PPC reporting

The PRD Reporting Hub requires:

- campaign results logging
- channel breakdown
- content performance tracking
- PDF export

For campaign results, the PRD explicitly lists:

- ad spend
- impressions
- clicks
- leads
- conversions
- CPL
- ROAS

For channel breakdown, the PRD explicitly lists comparison across:

- Google Ads
- Meta
- LinkedIn
- Organic
- Email

**Implementation meaning:** this is the core missing PPC functionality. CHERP must support manual PPC campaign performance entry, channel comparison, and PDF reporting before it can properly support PPC delivery.

---

### 2.7 Client dashboard for PPC reports and deliverables

The PRD Client Dashboard requires:

- today’s work view
- progress tracker
- milestone timeline
- deliverable downloads
- client login with restricted access

Deliverable downloads include:

- reports
- creatives
- assets

**Implementation meaning:** after PPC reports are generated internally, they should be publishable to the client dashboard for download.

---

### 2.8 PPC notifications

The PRD Notification System requires:

- in-app notifications
- email notifications
- read/unread state
- bulk mark-all-read
- notification preferences by type and channel

Notification types include:

- task assigned
- task overdue
- blocker flagged
- blocker escalated
- month planning alert

**Implementation meaning:** PPC execution needs assignment emails, overdue task reminders, report reminders, blocker escalation emails, and user-controlled notification preferences.

---

## 3. Current Repo State Relevant to PPC

The following current-state observations are based on the inspected `ui-animations-reactlib` branch.

### 3.1 Existing generic ERP foundation

The backend `AppModule` imports these modules:

- ActivityLogsModule
- AiChatModule
- AuthModule
- BlockersModule
- ClientsModule
- DashboardModule
- NotificationsModule
- PrismaModule
- ScopeTemplatesModule
- TasksModule
- UsersModule
- WorkflowsModule

**Interpretation:** CHERP has the generic ERP foundation needed for PPC task delivery, but there is no visible dedicated `ReportingModule`, `CampaignResultsModule`, `PPCModule`, or `AdPlatformIntegrationModule` in the inspected `AppModule`.

---

### 3.2 Existing performance-marketing templates

The repo already contains some performance-marketing-style scope template presets. Examples observed in `template-presets.ts` include:

- Real Estate Lead Generation
- service type: Performance Marketing
- tasks such as Google/Meta ad account setup, lead capture campaigns, and weekly reporting baseline
- larger real-estate retainer template sections including performance marketing, Meta/Google setup, Pixel, GA4, UTM architecture, CTWA, YouTube pre-roll, CPL tracking, creative rotation, and budget reallocation

**Interpretation:** PPC delivery tasks have started to appear in templates, but they need normalization and guaranteed PRD coverage for `Performance Marketing (PPC)`.

---

### 3.3 Existing task analytics are not PPC reporting

The backend task controller exposes task-level analytics and daily report endpoints. These are useful for work tracking, but they are not the same as the PRD Reporting Hub.

Current task analytics are not enough because the PRD requires campaign result metrics such as:

- ad spend
- impressions
- clicks
- leads
- conversions
- CPL
- ROAS

**Interpretation:** task analytics should remain separate from PPC campaign performance reporting.

---

### 3.4 Existing frontend analytics page is capacity-focused

The inspected frontend `AnalyticsPage.tsx` is a team workload/capacity page. It shows overloaded/free team members, assigned brands, open tasks, and workload capacity.

**Interpretation:** this page should not be treated as the PPC Reporting Hub. A separate Reporting Hub page is required.

---

## 4. End-to-End PPC Flow Required

For PPC to work according to the shared PRD, the minimum complete flow is:

```text
PPC client onboarded
→ service_type = Performance Marketing (PPC)
→ correct PPC scope template selected
→ Month 1 PPC workflow generated
→ PPC tasks assigned to PM / Performance Marketer / Designer / Content Writer
→ PPC campaign setup and launch tasks tracked
→ campaign results entered manually
→ channel breakdown generated
→ PDF report generated
→ report/assets published to client dashboard
→ client can view/download published PPC reports
→ notifications remind users about assignment, overdue work, blockers, and reporting timelines
```

At present, the repo appears closer on the workflow/task side than on the reporting side. The biggest missing PPC piece is the **Reporting Hub**.

---

# 5. Feature Implementation Plan

## Feature 1 — PPC Service Type Normalization

### Requirement

Client onboarding must support `Performance Marketing (PPC)` as a selectable service type.

### Current issue

Some existing templates use `Performance Marketing`, `Lead Generation`, `Growth Marketing`, or related names. The PRD-facing service type is `Performance Marketing (PPC)`.

### Implementation

Create a controlled service type dictionary:

```ts
export const SERVICE_TYPES = {
  DIGITAL_MARKETING_FULL_SUITE: 'Digital Marketing (Full Suite)',
  SEO_CONTENT: 'SEO + Content',
  PERFORMANCE_MARKETING_PPC: 'Performance Marketing (PPC)',
  SOCIAL_MEDIA: 'Social Media Management',
  BRAND_STRATEGY: 'Brand Strategy',
  WEBSITE_DEVELOPMENT: 'Website Development',
} as const
```

Create a compatibility alias map:

```ts
export const SERVICE_TYPE_ALIASES = {
  'Performance Marketing': 'Performance Marketing (PPC)',
  'PPC': 'Performance Marketing (PPC)',
  'Paid Media': 'Performance Marketing (PPC)',
  'Lead Generation': 'Performance Marketing (PPC)',
}
```

Normalize service type before template matching:

```ts
function normalizeServiceType(serviceType: string): string {
  return SERVICE_TYPE_ALIASES[serviceType] ?? serviceType
}
```

### Backend tasks

- Add `SERVICE_TYPES` constants.
- Normalize `service_type` in onboarding DTO/service layer.
- Normalize `service_type` in scope-template resolve logic.
- Preserve backwards compatibility with existing templates.

### Frontend tasks

- Update service-type picker to display `Performance Marketing (PPC)`.
- Ensure filters and client list labels use the normalized display name.

### Acceptance criteria

- PM can select `Performance Marketing (PPC)` during onboarding.
- Existing `Performance Marketing` templates still resolve.
- New PPC templates save with normalized service type.
- Client list and filters show the PRD-facing service type.

---

## Feature 2 — PPC Scope Template Pack

### Requirement

Scope templates must exist for industry + service type combinations and contain default tasks, KPI frameworks, and timelines.

### Current issue

Some PPC-like templates exist, but the system must guarantee PPC coverage for the PRD industries.

### Required PPC template coverage

Create templates for:

1. Real Estate — Performance Marketing (PPC)
2. E-commerce — Performance Marketing (PPC)
3. SaaS — Performance Marketing (PPC)
4. FinTech — Performance Marketing (PPC)
5. Hospitality — Performance Marketing (PPC)
6. Education — Performance Marketing (PPC)
7. HealthTech — Performance Marketing (PPC)

### Template structure

```ts
type PpcScopeTemplate = {
  name: string
  industry: string
  service_type: 'Performance Marketing (PPC)'
  description: string
  duration_months: number
  default_tasks: {
    month_1: TaskTemplate[]
    month_2: TaskTemplate[]
    month_3: TaskTemplate[]
  }
  kpi_framework: KpiDefinition[]
}
```

### PPC task categories

Each PPC template should include tasks covering:

1. Account access and audit
2. Tracking setup
3. Campaign structure
4. Landing page / lead form setup
5. Creative and copy preparation
6. Campaign launch
7. Optimization
8. Weekly reporting
9. Monthly reporting

### PPC KPI framework

Minimum PRD-backed PPC KPIs:

- ad spend
- impressions
- clicks
- leads
- conversions
- CPL
- ROAS

### Acceptance criteria

- Each PRD industry has a PPC template.
- Selecting industry + `Performance Marketing (PPC)` resolves an exact PPC template when present.
- If exact match is missing, closest template options are shown.
- Template preview displays default tasks, KPIs, and duration.
- Creating a client generates Month 1 tasks from the PPC template.

---

## Feature 3 — Structured PPC Task Template Schema

### Requirement

Workflow tasks generated from templates must support assignee, due date, priority, status, sort order, and auditability.

### Current issue

Template tasks are flexible JSON. That is useful, but PPC delivery needs consistent fields for assignment, capacity, and dependency planning.

### Implementation

Define a formal template task contract:

```ts
type TaskTemplate = {
  key: string
  title: string
  description?: string
  priority: 'high' | 'medium' | 'low'
  due_offset_days: number
  target_role: 'Project Manager' | 'Performance Marketer' | 'Graphic Designer' | 'Content Writer' | 'Social Media Manager'
  estimated_hours: number
  depends_on_keys?: string[]
  checklist?: { text: string }[]
  subtasks?: TaskTemplate[]
}
```

Example:

```json
{
  "key": "tracking_setup",
  "title": "Set up Pixel, GA4, UTMs and conversion events",
  "description": "Configure tracking infrastructure before PPC launch.",
  "priority": "high",
  "due_offset_days": 5,
  "target_role": "Performance Marketer",
  "estimated_hours": 4,
  "checklist": [
    { "text": "Install Meta Pixel" },
    { "text": "Configure GA4 conversion events" },
    { "text": "Define UTM naming structure" }
  ]
}
```

### Backend tasks

- Validate `default_tasks` shape before saving templates.
- Add template key support for dependency mapping.
- Generate due dates from `contract_start + due_offset_days`.
- Generate task `estimated_hours` for capacity planning.
- Map `target_role` to actual user assignment.

### Acceptance criteria

- PPC template tasks generate valid tasks.
- Generated PPC tasks have due dates.
- Generated PPC tasks have one primary assignee wherever assignment can be resolved.
- Generated PPC tasks include estimated hours.
- Generated PPC tasks preserve order.
- Invalid template JSON is rejected before save.

---

## Feature 4 — PPC Skill-Based Assignment

### Requirement

The PRD lists `PPC` as a team skill used for intelligent assignment.

### Current issue

The user schema contains skill-related fields, but PPC tasks need deterministic assignment rules.

### Implementation

Map template `target_role` to required skill:

```ts
const TARGET_ROLE_SKILL_MAP = {
  'Performance Marketer': 'PPC',
  'Graphic Designer': 'Design',
  'Content Writer': 'Content',
  'Project Manager': 'Project Management',
  'Social Media Manager': 'Social Media',
}
```

Assignment algorithm:

```text
For each generated PPC task:
1. Read target_role.
2. Resolve required skill.
3. Find active users in same tenant.
4. Prefer users with matching skill.
5. Prefer users below 80% utilization.
6. Assign least-loaded eligible user.
7. If no eligible user exists, require manual assignment or show onboarding warning.
```

### Backend tasks

- Normalize skill values.
- Add helper to resolve `target_role → user`.
- Use capacity calculation when picking assignee.
- Add onboarding warnings for unresolved roles.

### Frontend tasks

- Show assignment preview before onboarding confirmation.
- Warn when PPC tasks have no eligible PPC user.
- Allow PM to manually override assignees.

### Acceptance criteria

- PPC tasks are not silently left unassigned.
- A missing PPC-skilled user creates a visible warning.
- PM can manually assign before client creation.
- Capacity warnings show when user is over 80%.

---

## Feature 5 — PPC Campaign Results Module

### Requirement

The PRD Reporting Hub requires manual campaign results logging.

### Required fields

- ad spend
- impressions
- clicks
- leads
- conversions
- CPL
- ROAS

### Current issue

No dedicated reporting or campaign result module was visible in the inspected backend module list.

### Implementation

Add backend module:

```text
backend/src/reporting/
  reporting.module.ts
  reporting.controller.ts
  reporting.service.ts
  reporting.repository.ts
  dto/
    create-campaign-result.dto.ts
    update-campaign-result.dto.ts
    report-filter.dto.ts
```

Add Prisma model:

```prisma
model CampaignResult {
  id             String   @id @default(uuid()) @db.Uuid
  tenant_id      String   @db.Uuid
  client_id      String   @db.Uuid
  workflow_id    String?  @db.Uuid

  campaign_name  String
  channel        String
  period_start   DateTime @db.Date
  period_end     DateTime @db.Date

  ad_spend       Decimal  @db.Decimal(12, 2)
  impressions    Int
  clicks         Int
  leads          Int
  conversions    Int
  cpl            Decimal? @db.Decimal(12, 2)
  roas           Decimal? @db.Decimal(8, 2)

  notes          String?
  created_by     String   @db.Uuid
  created_at     DateTime @default(now()) @db.Timestamptz
  updated_at     DateTime @updatedAt @db.Timestamptz

  @@index([tenant_id, client_id, period_start])
  @@index([tenant_id, channel])
  @@map("campaign_results")
  @@schema("erp")
}
```

### ROAS handling note

The PRD requires ROAS but does not explicitly list revenue as a campaign result field. Therefore:

- support manual `roas` entry for PRD compliance;
- optionally add `revenue` later if the product team approves it.

Do not force revenue as a must-have from this PRD because the shared source does not explicitly require it.

### API endpoints

```http
POST   /api/reporting/campaign-results
GET    /api/reporting/campaign-results
GET    /api/reporting/campaign-results/:id
PATCH  /api/reporting/campaign-results/:id
DELETE /api/reporting/campaign-results/:id
```

### DTO validation

```ts
type CreateCampaignResultDto = {
  client_id: string
  workflow_id?: string
  campaign_name: string
  channel: 'Google Ads' | 'Meta' | 'LinkedIn' | 'Organic' | 'Email'
  period_start: string
  period_end: string
  ad_spend: number
  impressions: number
  clicks: number
  leads: number
  conversions: number
  roas?: number
  notes?: string
}
```

### Business rules

- `period_end` must be greater than or equal to `period_start`.
- `ad_spend` cannot be negative.
- impressions, clicks, leads, and conversions cannot be negative.
- clicks cannot exceed impressions unless manually allowed by an admin override.
- conversions cannot exceed leads unless the agency decides conversions can include offline conversions.
- CPL should auto-calculate as `ad_spend / leads` when leads > 0.
- If leads = 0, CPL should be `null` or displayed as `N/A`.

### Acceptance criteria

- PM can manually create campaign result entries.
- PM can edit incorrect campaign result entries.
- PM can filter by client, date range, and channel.
- CPL is auto-calculated where possible.
- ROAS can be manually entered.
- All create/update/delete actions are audit logged.

---

## Feature 6 — Channel Breakdown

### Requirement

The PRD requires performance comparison across:

- Google Ads
- Meta
- LinkedIn
- Organic
- Email

It must be displayed as a table and visual chart.

### Current issue

No PRD-complete channel breakdown module or frontend was visible. Existing analytics are capacity/task-oriented.

### Backend endpoint

```http
GET /api/reporting/channel-breakdown?clientId=&startDate=&endDate=
```

### Response shape

```ts
type ChannelBreakdownResponse = {
  channels: Array<{
    channel: 'Google Ads' | 'Meta' | 'LinkedIn' | 'Organic' | 'Email'
    ad_spend: number
    impressions: number
    clicks: number
    leads: number
    conversions: number
    cpl: number | null
    roas: number | null
  }>
  totals: {
    ad_spend: number
    impressions: number
    clicks: number
    leads: number
    conversions: number
    cpl: number | null
    roas: number | null
  }
}
```

### Frontend UI

Create channel breakdown section with:

- spend by channel
- impressions by channel
- clicks by channel
- leads by channel
- conversions by channel
- CPL by channel
- ROAS by channel

### Acceptance criteria

- PM can compare campaign performance by channel.
- Table and chart use the same data source.
- Empty state is shown when no results exist.
- Client users can only see published/allowed report data.

---

## Feature 7 — Content Performance Tracking

### Requirement

The PRD says content performance should track:

- title
- content type: blog, video, carousel
- views
- engagement rate
- leads attributed

### Current issue

No dedicated content performance model/module was visible in the inspected backend module list.

### Prisma model

```prisma
model ContentPerformance {
  id                String    @id @default(uuid()) @db.Uuid
  tenant_id         String    @db.Uuid
  client_id         String    @db.Uuid
  title             String
  content_type      String
  channel           String?
  published_date    DateTime? @db.Date
  views             Int       @default(0)
  engagement_rate   Decimal?  @db.Decimal(6, 2)
  leads_attributed  Int       @default(0)
  notes             String?
  created_by        String    @db.Uuid
  created_at        DateTime  @default(now()) @db.Timestamptz
  updated_at        DateTime  @updatedAt @db.Timestamptz

  @@index([tenant_id, client_id, published_date])
  @@map("content_performance")
  @@schema("erp")
}
```

### API endpoints

```http
POST   /api/reporting/content-performance
GET    /api/reporting/content-performance
PATCH  /api/reporting/content-performance/:id
DELETE /api/reporting/content-performance/:id
```

### Acceptance criteria

- PM can log content performance manually.
- Content entries appear in the Reporting Hub.
- Content performance can be filtered by client and date range.
- Content performance appears in generated reports when available.

---

## Feature 8 — PPC Reporting Hub Frontend

### Requirement

The PRD requires a Reporting Hub with campaign results, channel breakdown, content performance, and PDF export.

### Current issue

The existing frontend analytics page is capacity-focused, not a PPC reporting hub.

### Proposed frontend structure

```text
frontend/src/features/reporting/
  ReportingHubPage.tsx
  CampaignResultsTable.tsx
  CampaignResultForm.tsx
  ChannelBreakdownChart.tsx
  ContentPerformanceTable.tsx
  ReportPreview.tsx
  api.ts
  types.ts
```

### Page sections

```text
Reporting Hub
├── Filters
│   ├── Client selector
│   ├── Date range selector
│   └── Channel selector
├── KPI cards
│   ├── Spend
│   ├── Impressions
│   ├── Clicks
│   ├── Leads
│   ├── Conversions
│   ├── CPL
│   └── ROAS
├── Channel Breakdown
├── Campaign Results Table
├── Content Performance Table
└── Generate PDF Report
```

### Acceptance criteria

- PM can open Reporting Hub from internal navigation.
- PM can select client/date/channel filters.
- KPI cards update from selected filters.
- Campaign result table supports create/edit/delete.
- Channel breakdown chart updates with filters.
- Content performance section appears.
- Generate PDF action is available.

---

## Feature 9 — PDF Report Generation

### Requirement

The PRD requires downloadable PDF reports from dashboard data, including charts, KPIs, and channel breakdown.

### Current issue

No dedicated report/PDF export API was visible in the inspected backend module list.

### Prisma model

```prisma
model ClientReport {
  id            String    @id @default(uuid()) @db.Uuid
  tenant_id     String    @db.Uuid
  client_id     String    @db.Uuid
  title         String
  period_start  DateTime  @db.Date
  period_end    DateTime  @db.Date
  status        String    @default("draft")
  pdf_url       String?
  generated_by  String?   @db.Uuid
  generated_at  DateTime? @db.Timestamptz
  created_at    DateTime  @default(now()) @db.Timestamptz
  updated_at    DateTime  @updatedAt @db.Timestamptz

  @@index([tenant_id, client_id, period_start])
  @@map("client_reports")
  @@schema("erp")
}
```

### API endpoints

```http
POST  /api/reporting/reports
POST  /api/reporting/reports/:id/generate-pdf
PATCH /api/reporting/reports/:id/publish
GET   /api/reporting/reports/:id/download
```

### PDF flow

```text
Fetch campaign + content + channel data
→ render server-side report HTML
→ generate PDF
→ upload PDF to object storage
→ save pdf_url on ClientReport
→ allow internal download
→ optionally publish to client portal
```

### Acceptance criteria

- PM can generate a report PDF for a client and date range.
- PDF includes KPI cards.
- PDF includes campaign results.
- PDF includes channel breakdown.
- PDF includes content performance when present.
- PDF is stored and downloadable.
- Published PDF appears on client dashboard.

---

## Feature 10 — Client Dashboard PPC Reports

### Requirement

The PRD requires client dashboard deliverable downloads for reports, creatives, and assets.

### Current issue

Client dashboard exists partially, but PPC reports and reporting assets must be connected to generated/published reports.

### Client portal PPC sections

```text
Client Dashboard
├── Current Month Progress
├── PPC Tasks In Progress
├── Upcoming Milestones
├── Campaign Reports
├── Creatives / Assets / PDFs
└── Pending Approvals
```

### Backend endpoints

```http
GET /api/client-portal/progress
GET /api/client-portal/today
GET /api/client-portal/milestones
GET /api/client-portal/reports
GET /api/client-portal/downloads
```

### Access rules

Client users can only see records linked to their `ClientUser` relationship.

Client users must not see:

- internal workload
- cost rates
- internal notes
- draft campaign results
- unpublished reports
- team capacity
- admin-only data

### Acceptance criteria

- Client can download published PPC report.
- Client can view current month PPC progress.
- Client cannot access internal Reporting Hub.
- Client cannot edit campaign result data.

---

## Feature 11 — PPC Notifications and Reminder Automation

### Requirement

The PRD requires in-app notifications, email notifications, read/unread state, bulk mark-all-read, and preferences by notification type/channel.

### PPC notification events

```text
Task assigned → assigned user
Task overdue → assignee + PM
Campaign report due → PM + Performance Marketer
Blocker flagged → assignee + PM
Blocker escalated → PM + Account Manager / Client Partner
Monthly report generated → PM
Report published → client user
Month planning alert → PM
```

### Scheduler jobs

```text
Hourly:
- overdue task reminders
- blocker escalation checks

Daily morning:
- daily digest
- PPC reporting reminders
- month planning alerts
```

### Email channel

Use Resend through a dedicated mail layer:

```text
MailModule
├── MailService
├── ResendProvider
├── Email templates
└── Delivery logs
```

### Notification preferences API

```http
GET   /api/notification-preferences
PATCH /api/notification-preferences
PATCH /api/notification-preferences/:type
```

### Acceptance criteria

- Users can enable/disable email by notification type.
- In-app notifications are created for required events.
- Emails send only when preferences allow.
- Duplicate reminders are prevented.
- Bulk mark-all-read exists.

---

## Feature 12 — PPC Month Planning

### Requirement

The PRD Month Planning module requires:

- start date algorithm
- PM alert 14 days before next month should start
- task pre-population from scope template
- planning timeline

### Why this matters for PPC

PPC retainers need recurring optimization/reporting workflows. Month 1 setup is not enough.

### Suggested PPC month structure

Month 1:

- access and audit
- tracking setup
- campaign structure
- creative/copy preparation
- launch
- baseline reporting

Month 2:

- performance review
- creative testing
- keyword/audience refinement
- budget reallocation
- lead quality review
- monthly client report

Month 3:

- scaling plan
- CPL/ROAS trend review
- funnel optimization
- new creative concepts
- next-quarter media plan

### Backend endpoints

```http
GET  /api/month-planning
GET  /api/workflows/:id/next-month-preview
POST /api/workflows/:id/generate-next-month
```

### Acceptance criteria

- PM sees PPC clients needing next-month planning.
- System previews next-month PPC tasks before creation.
- PM confirms and generates next-month workflow.
- Duplicate month workflows cannot be created.
- Planning alert is sent 14 days before next month should start.

---

## Feature 13 — Later CRM Handoff for PPC

### Requirement

The PRD CRM module requires:

- bidirectional client data sync
- checklist sync
- pipeline handoff trigger when CRM deal moves to `Won`

### Current priority

This is acknowledged as later work. It should not block the first PPC implementation.

### Later implementation flow

```text
CRM deal marked Won
→ ERP receives CRM event
→ create draft onboarding record
→ preselect industry and service type
→ PM verifies details
→ PM confirms PPC scope template
→ ERP generates PPC workflow
```

### Acceptance criteria

- CRM-created draft does not bypass PM review.
- Duplicate clients are prevented.
- Checklist sync is tenant-safe.
- Sync failures are logged and retryable.

---

# 6. Required Backend Modules

Add these modules:

```text
ReportingModule
MailModule
SchedulerModule
ClientPortalModule
MonthPlanningModule
```

Do not put PPC campaign reporting into `TasksModule`. Task analytics and campaign performance reporting are different domains.

## 6.1 Module responsibility map

```text
ReportingModule
├── Campaign results
├── Channel breakdown
├── Content performance
├── Client reports
└── PDF export

MailModule
├── Resend provider
├── email templates
└── delivery logs

SchedulerModule
├── overdue task reminders
├── blocker escalations
├── daily digest
├── PPC reporting reminders
└── month planning alerts

ClientPortalModule
├── published reports
├── downloads
├── progress
└── milestones

MonthPlanningModule
├── next month preview
├── next month generation
├── planning timeline
└── planning alerts
```

---

# 7. Required Database Changes

## 7.1 New models

Minimum required models:

```text
CampaignResult
ContentPerformance
ClientReport
NotificationDeliveryLog
```

## 7.2 Existing model enhancements

Recommended additions:

```text
Task.estimated_hours
Task.target_role or generated_from_template_key
User.weekly_available_hours
ScopeTemplate.default_tasks schema validation
ScopeTemplate.kpi_framework schema validation
```

## 7.3 Reporting tables

```text
campaign_results
content_performance
client_reports
notification_delivery_logs
```

---

# 8. Required Frontend Work

## 8.1 Client onboarding

Add/verify:

- `Performance Marketing (PPC)` option
- PPC scope template preview
- closest template suggestions
- assignment preview for PPC tasks
- warnings for missing PPC assignee

## 8.2 Scope template builder

Add/verify:

- PPC task builder
- KPI framework builder
- month-by-month template editor
- structured validation instead of raw JSON-only editing

## 8.3 Reporting Hub

Add:

- campaign result entry
- campaign result table
- channel breakdown chart
- content performance table
- report preview
- PDF generation action

## 8.4 Client dashboard

Add:

- published PPC report downloads
- current-month PPC progress
- milestone timeline
- deliverable downloads

## 8.5 Notifications settings

Add:

- in-app/email preference toggles
- notification type controls
- mark-all-read support

## 8.6 Month planning

Add:

- PPC next-month preview
- generate next-month workflow
- readiness timeline
- planning alert display

---

# 9. Implementation Order

## Sprint 1 — PPC Foundation

### Build

- Normalize `Performance Marketing (PPC)` service type.
- Add aliases for existing performance marketing templates.
- Add complete PPC template pack for PRD industries.
- Add structured validation for `default_tasks` and `kpi_framework`.
- Add `estimated_hours` to tasks.
- Implement `target_role → user` assignment.

### Deliverable

```text
A PPC client can be onboarded and receives a correct Month 1 PPC workflow.
```

---

## Sprint 2 — Campaign Results Backend

### Build

- `ReportingModule`
- `CampaignResult` Prisma model
- campaign result CRUD APIs
- filtering by client/date/channel
- CPL auto-calculation
- audit logging

### Deliverable

```text
PM can manually log Google Ads, Meta, LinkedIn, Organic, and Email campaign results.
```

---

## Sprint 3 — Reporting Hub Frontend

### Build

- Reporting Hub page
- campaign result table
- campaign result form
- KPI cards
- channel breakdown chart
- filters for client/date/channel

### Deliverable

```text
PM can view PPC campaign performance inside CHERP without spreadsheets.
```

---

## Sprint 4 — Content Performance and PDF Reports

### Build

- `ContentPerformance` model and APIs
- content performance UI
- `ClientReport` model
- PDF report generation
- object storage upload
- report publish/unpublish

### Deliverable

```text
PM can generate a monthly PPC report PDF and publish it to the client.
```

---

## Sprint 5 — Client Dashboard PPC Reports

### Build

- client report list
- report downloads
- current PPC workflow progress
- milestone timeline
- client-only access rules

### Deliverable

```text
Client can log in and download published PPC reports/assets.
```

---

## Sprint 6 — Notifications and Automation

### Build

- Resend email channel
- notification preferences API
- overdue task reminder scheduler
- PPC reporting reminder scheduler
- daily digest
- blocker escalation email

### Deliverable

```text
PPC operations get automatic reminders and emails instead of manual chasing.
```

---

## Sprint 7 — Month Planning for PPC Retainers

### Build

- next-month preview
- start-date algorithm
- PM alert 14 days before next month
- auto-create next-month PPC workflow
- duplicate prevention

### Deliverable

```text
PPC retainers continue month after month without manually recreating checklists.
```

---

# 10. Future Scope — Not Detailed in Shared PRD

The shared PRD summary lists Phase 3 as including:

- ad platform APIs
- rules engine
- ML insights
- anomaly detection
- churn prediction

However, the uploaded document does not provide detailed feature specifications, data models, endpoints, acceptance criteria, or UI requirements for those Phase 3 items.

Therefore, do not implement the following as Phase 1–2 PPC requirements unless a Phase 3 PRD is written or approved:

```text
Google Ads API sync
Meta Ads API sync
LinkedIn Ads API sync
automated anomaly detection
rules engine
ML campaign insights
churn prediction
```

A future module could be:

```text
AdPlatformIntegrationModule
├── Google Ads connector
├── Meta Ads connector
├── LinkedIn Ads connector
├── OAuth/account connection
├── scheduled metric sync
├── anomaly detection
├── rules engine
└── insight generation
```

But this is future scope, not supported as a detailed requirement by the shared Phase 1–2 PRD.

---

# 11. Final Priority List

## Must implement first

1. Normalize `Performance Marketing (PPC)` service type.
2. Create complete PPC scope templates for PRD industries.
3. Add estimated hours and PPC skill-based assignment.
4. Add campaign result data model and CRUD APIs.
5. Add channel breakdown table and chart.
6. Add Reporting Hub frontend.
7. Add PDF report export.
8. Publish reports to Client Dashboard.

## Should implement next

9. Content performance tracking.
10. PPC month planning.
11. Resend email notifications.
12. Notification preferences.
13. Daily digest and reporting reminders.
14. CRM won-deal handoff.

## Future only, unless separate Phase 3 PRD is approved

15. Google Ads / Meta Ads API sync.
16. Rules engine.
17. ML insights.
18. Anomaly detection.
19. Churn prediction.

---

# 12. Final Verdict

The PPC work required by the shared PRD is not only a template problem.

The repo already has some performance-marketing task content and a generic workflow/task engine. That means CHERP can begin managing PPC execution tasks. But it cannot yet fully support PPC operations as described in the PRD because the PRD-required Reporting Hub is not complete.

The most important missing PPC loop is:

```text
manual campaign result logging
→ channel breakdown
→ PDF report generation
→ client-facing report download
```

Until that exists, CHERP can track PPC tasks, but it cannot properly run PPC reporting as described in the shared PRD.
