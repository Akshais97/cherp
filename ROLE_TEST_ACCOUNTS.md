# Test Role Accounts & Team Specifications

Below is the complete directory of role-specific test accounts created in Supabase Auth and synced to `erp.users`. Every team member account specifies their **Team**, **Designation**, and **Specialty/Skills** as enforced by the database schema and PostgreSQL constraints.

---

## 🔑 Test Credentials & Team Specifications Summary

| Full Name | Role | Team Category (`user.team`) | Job Designation (`user.designation`) | Specialty / Skills (`user.skills`) | Email / Username | Password |
|---|---|---|---|---|---|---|
| **Super Admin User** | `super_admin` | `Brand Manager` | Executive Director | `["Agency Management", "Operations Strategy"]` | `superadmin@agency.com` | `Password123!` |
| **Project Manager User** | `project_manager` | `Brand Manager` | Project Manager | `["Workflow Orchestration", "Client Delivery"]` | `pm@agency.com` | `Password123!` |
| **Graphic Designer User** | `team_member` | `Creative Designer` | Graphic Designer | `["Graphic Design", "Key Visuals", "Carousels"]` | `team.designer@agency.com` | `Password123!` |
| **Content Writer User** | `team_member` | `Copywriter` | Content Writer | `["Copywriting", "Reel Scripts", "Ad Copy"]` | `team.writer@agency.com` | `Password123!` |
| **Performance Marketer User** | `team_member` | `Performance Marketer` | Performance Marketer | `["Meta Ads", "Google Ads", "GA4 & UTMs"]` | `team.performance@agency.com` | `Password123!` |
| **SEO Specialist User** | `team_member` | `SEO Specialist` | SEO Specialist | `["Technical SEO", "Keyword Strategy", "Search Console"]` | `team.seo@agency.com` | `Password123!` |
| **CRM Specialist User** | `team_member` | `Marketing Automation` | CRM Specialist | `["CRM Architecture", "Email Drip Sequences"]` | `team.crm@agency.com` | `Password123!` |
| **Social Media Manager User** | `team_member` | `Video Editor` | Social Media Manager | `["Content Calendar", "ORM Monitoring", "Reels"]` | `team.smm@agency.com` | `Password123!` |
| **Client Portal User** | `client` | *(None)* | Client Partner | `["Deliverable Review", "Approval Governance"]` | `client@agency.com` | `Password123!` |

---

## 🏛️ Database Team Architecture (`users_team_check`)

The PostgreSQL database enforces the **universal Team taxonomy** via the `users_team_check` constraint:

```sql
CHECK (
  (team IS NULL) OR 
  (team = ANY (ARRAY[
    'Brand Manager'::text, 
    'Copywriter'::text, 
    'Creative Designer'::text, 
    'Video Editor'::text, 
    'SEO Specialist'::text, 
    'Performance Marketer'::text, 
    'Marketing Automation'::text
  ]))
)
```

### Team Fields in Prisma Schema:
- **`user.team`**: The universal department/team group (enforced by DB check constraint).
- **`user.designation`**: Specific job title / role label (e.g., `Graphic Designer`, `Content Writer`).
- **`user.skills`**: JSON array of specialized capabilities (e.g., `["Graphic Design", "Visual Identity", "Carousels"]`).

---

## 🎯 Role & Team Capabilities Guide

### 1. Super Admin (`superadmin@agency.com`)
- **Team**: `Brand Manager`
- **Permissions**: Full platform and tenant administrative permissions.

### 2. Project Manager (`pm@agency.com`)
- **Team**: `Brand Manager`
- **Permissions**: Operational delivery, client onboarding, team workload management, task assignment by team/designation, and blocker resolution.

### 3. Creative Designer (`team.designer@agency.com`)
- **Team**: `Creative Designer`
- **Specialty**: Key visuals, launch posters, 10 statics/mo, 5 carousels/mo, and visual identity direction.

### 4. Copywriter (`team.writer@agency.com`)
- **Team**: `Copywriter`
- **Specialty**: Tagline frameworks, master brand video scripts, 10 reel scripts/mo, Meta/Google ad copy bank, and blog writing.

### 5. Performance Marketer (`team.performance@agency.com`)
- **Team**: `Performance Marketer`
- **Specialty**: Ad account setup, Pixel/GA4/UTM conversion tracking, Meta CTWA, Google Search/Display/YouTube ads, and weekly CPL optimization.

### 6. SEO Specialist (`team.seo@agency.com`)
- **Team**: `SEO Specialist`
- **Specialty**: Technical website SEO audits, sitemap & robots.txt, Search Console, Google My Business, and off-page SEO distribution.

### 7. Marketing Automation (`team.crm@agency.com`)
- **Team**: `Marketing Automation`
- **Specialty**: CRM deal stages, lead source integration, automated email nurture flows, and WhatsApp broadcast engines.

### 8. Video Editor & Social Manager (`team.smm@agency.com`)
- **Team**: `Video Editor`
- **Specialty**: 2-week advance content calendar scheduling, ORM comment/DM monitoring, Google/RE portal review management, and monthly sentiment reporting.

### 9. Client (`client@agency.com`)
- **Team**: *(None)*
- **Specialty**: Read-only progress view and final client deliverable approvals.
