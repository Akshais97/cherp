# CHERP ERP — Ad Platform Integration Specification & Architecture Guide

**Document type:** Architecture & Technical Specification  
**Project:** CHERP / Agency Command Center ERP  
**Module:** Ad Platform Automated Data Pipeline (Phase 3 Integration Specification)  
**Target Platforms:** Google Ads, Meta Ads Manager, LinkedIn Ads, Google Ad Manager (GAM)  
**Target Architecture:** OAuth 2.0 + REST/gRPC Connectors + Cron Sync Pipeline + Tenant Security Layer  

---

## 1. Executive Summary & Overview

Currently, CHERP ERP supports **manual campaign results entry** and **manual content performance logging** inside the Reporting Hub.

This specification details the end-to-end technical plan to integrate external advertising platforms directly into CHERP. Once implemented, agency teams will no longer need to enter PPC campaign spend, impressions, clicks, leads, or conversions manually. Instead, CHERP will fetch daily performance metrics automatically via official platform APIs (Google Ads API, Meta Marketing API, LinkedIn Marketing API, and Google Ad Manager API), map them to CHERP clients, and populate the Reporting Hub.

```mermaid
flowchart LR
    subgraph External Ad Platforms
        GA[Google Ads API]
        MA[Meta Marketing API]
        LI[LinkedIn Ads API]
        GAM[Google Ad Manager API]
    end

    subgraph CHERP Backend Integration Engine
        OAuth[OAuth 2.0 / Credentials Manager]
        Connectors[Platform Connectors Layer]
        Cron[AdSync Daily Cron Job]
    end

    subgraph CHERP ERP Database
        DB[(CampaignResult & Client Accounts)]
    end

    subgraph Frontend Pages
        Hub[Reporting Hub]
        Portal[Client Dashboard]
    end

    GA --> Connectors
    MA --> Connectors
    LI --> Connectors
    GAM --> Connectors
    OAuth --> Connectors
    Cron --> Connectors
    Connectors --> DB
    DB --> Hub
    DB --> Portal
```

---

## 2. Cloud Console & OAuth Configuration Setup

### 2.1 Google Cloud Console Setup (Google Ads API & Google Ad Manager API)

To enable Google Ads and Google Ad Manager integrations, the agency/developer must configure Google Cloud Platform (GCP) and Google Ads Manager Accounts.

#### GCP Project Setup
1. Log in to [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project named `CHERP Agency ERP Engine`.
3. Enable the following APIs under **APIs & Services**:
   - `Google Ads API`
   - `Google Ad Manager API` (formerly DFP API)
   - `Google OAuth2 API`

#### OAuth 2.0 Credentials
1. Configure the **OAuth Consent Screen** (User type: External, Publish Status: Production/Testing).
2. Add Scopes:
   - `https://www.googleapis.com/auth/adwords` (Google Ads API access)
   - `https://www.googleapis.com/auth/dfp` (Google Ad Manager API access)
3. Create **OAuth 2.0 Client ID** (Application type: Web application).
   - **Authorized JavaScript origins:** `https://app.cherp-erp.com`
   - **Authorized redirect URIs:** `https://api.cherp-erp.com/api/ad-platform/callback/google`

#### Google Ads Developer Token
1. Log in to the agency **Google Ads Manager Account (MCC)**.
2. Navigate to **Tools & Settings → API Center**.
3. Apply for a **Developer Token**.
   - *Test Access / Basic Access* allows sandbox and production account querying.
   - Store Developer Token securely in tenant integration settings.

#### Google Ad Manager Service Account (GAM)
1. In Google Cloud Console, navigate to **IAM & Admin → Service Accounts**.
2. Create a Service Account `cherp-gam-service@project.iam.gserviceaccount.com`.
3. Generate a JSON Key file.
4. In Google Ad Manager Admin Console, add the Service Account email as a user with **Trafficker** or **Read-Only Reporting** permissions.

---

### 2.2 Meta for Developers Setup (Meta / Facebook Ads Manager)

To fetch Meta Ads (Facebook & Instagram) metrics:

#### Meta Developer App Setup
1. Log in to [Meta for Developers](https://developers.facebook.com/).
2. Create an App with type **Business**.
3. App Name: `CHERP ERP Ad Ingestion`.
4. Add Products:
   - **Marketing API**
   - **Webhooks**

#### OAuth & Permissions
1. Under **Settings → Basic**, copy **App ID** and **App Secret**.
2. Set **Valid OAuth Redirect URIs**: `https://api.cherp-erp.com/api/ad-platform/callback/meta`
3. Request App Review permissions for:
   - `ads_read` (Read ad account performance data)
   - `ads_management` (Optional: adjust budgets / pause campaigns)
   - `read_insights` (Access ad set and ad campaign analytics)

---

### 2.3 LinkedIn Developers Setup (LinkedIn Ads)

To fetch LinkedIn Sponsored Content & Lead Gen Form performance:

1. Log in to [LinkedIn Developer Portal](https://www.linkedin.com/developers/).
2. Create an App `CHERP ERP Analytics`.
3. Associate App with Agency LinkedIn Page.
4. Add Product: **Marketing Developer Platform (MDP)**.
5. In **Auth Settings**, configure Redirect URL: `https://api.cherp-erp.com/api/ad-platform/callback/linkedin`.
6. Request Scopes:
   - `r_ads` (Read ad accounts)
   - `r_ads_reporting` (Read ad reporting & insights metrics)

---

## 3. Database Schema Extensions (Prisma Models)

Add the following 3 models to `backend/prisma/schema.prisma` under the `erp` schema:

```prisma
// Tenant-level Ad Platform Credentials and OAuth Tokens
model TenantAdIntegration {
  id                   String    @id @default(uuid()) @db.Uuid
  tenant_id            String    @db.Uuid
  platform             String    // 'google_ads', 'meta_ads', 'linkedin_ads', 'google_ad_manager'
  is_enabled           Boolean   @default(true)
  client_id            String?
  client_secret        String?   // Encrypted at rest using AES-256
  developer_token      String?   // Encrypted at rest (Google Ads)
  access_token         String?   // Encrypted at rest
  refresh_token        String?   // Encrypted at rest
  token_expires_at     DateTime? @db.Timestamptz
  account_id           String?   // Agency MCC ID / Business Manager ID
  service_account_json Json?     // Encrypted JSON key for GAM service account
  created_at           DateTime  @default(now()) @db.Timestamptz
  updated_at           DateTime  @updatedAt @db.Timestamptz

  tenant Tenant @relation(fields: [tenant_id], references: [id])

  @@unique([tenant_id, platform])
  @@map("tenant_ad_integrations")
  @@schema("erp")
}

// Client-to-External-Ad-Account Linkage Mapping
model ClientAdAccount {
  id                  String   @id @default(uuid()) @db.Uuid
  tenant_id           String   @db.Uuid
  client_id           String   @db.Uuid
  platform            String   // 'google_ads', 'meta_ads', 'linkedin_ads', 'google_ad_manager'
  external_account_id String   // e.g., "123-456-7890" for Google Ads, "act_10158..." for Meta
  account_name        String
  currency            String   @default("INR")
  is_active           Boolean  @default(true)
  created_at          DateTime @default(now()) @db.Timestamptz
  updated_at          DateTime @updatedAt @db.Timestamptz

  tenant Tenant @relation(fields: [tenant_id], references: [id])
  client Client @relation(fields: [client_id], references: [id])

  @@unique([tenant_id, client_id, platform, external_account_id])
  @@index([tenant_id, platform])
  @@map("client_ad_accounts")
  @@schema("erp")
}

// Execution Logs for Automated Data Ingestion Jobs
model AdSyncLog {
  id             String    @id @default(uuid()) @db.Uuid
  tenant_id      String    @db.Uuid
  platform       String
  account_id     String
  sync_type      String    // 'scheduled_daily', 'manual_trigger'
  status         String    // 'success', 'failed', 'partial'
  records_synced Int       @default(0)
  error_message  String?
  started_at     DateTime  @default(now()) @db.Timestamptz
  completed_at   DateTime? @db.Timestamptz

  tenant Tenant @relation(fields: [tenant_id], references: [id])

  @@index([tenant_id, platform, started_at])
  @@map("ad_sync_logs")
  @@schema("erp")
}
```

---

## 4. Backend Module Architecture & API Specifications

Create backend directory `backend/src/ad-platform/`:

```text
backend/src/ad-platform/
├── ad-platform.module.ts
├── ad-platform.controller.ts
├── ad-platform.service.ts
├── crypto.util.ts
├── connectors/
│   ├── google-ads.connector.ts
│   ├── meta-ads.connector.ts
│   ├── linkedin-ads.connector.ts
│   └── google-ad-manager.connector.ts
├── scheduler/
│   └── ad-sync-cron.job.ts
└── dto/
    ├── save-credentials.dto.ts
    ├── link-account.dto.ts
    └── trigger-sync.dto.ts
```

### 4.1 REST API Specifications

#### `POST /api/ad-platform/credentials`
Saves or updates OAuth credentials / API tokens for a tenant.

**Request Body:**
```json
{
  "platform": "google_ads",
  "client_id": "9876543210-xxxx.apps.googleusercontent.com",
  "client_secret": "GOCSPX-xxxx",
  "developer_token": "DEV_TOKEN_KEY_123",
  "account_id": "123-456-7890"
}
```

#### `GET /api/ad-platform/oauth/:platform`
Returns OAuth Authorization URL to initiate user login and consent flow.

**Response:**
```json
{
  "auth_url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=...&redirect_uri=..."
}
```

#### `GET /api/ad-platform/callback/:platform?code=...`
Receives OAuth authorization code from platform redirect, exchanges it for access + refresh token, and saves encrypted refresh token.

#### `GET /api/ad-platform/accounts/:platform`
Lists all external ad accounts available under the agency's connected credentials.

**Response:**
```json
{
  "platform": "meta_ads",
  "accounts": [
    { "external_account_id": "act_1015888", "account_name": "Acme Real Estate Meta Ads", "currency": "INR" },
    { "external_account_id": "act_2024999", "account_name": "HealthCare Lead Gen Meta", "currency": "INR" }
  ]
}
```

#### `POST /api/ad-platform/link-account`
Links an external ad account to a CHERP client record.

**Request Body:**
```json
{
  "client_id": "client-uuid-here",
  "platform": "google_ads",
  "external_account_id": "123-456-7890",
  "account_name": "Acme Google Ads Search"
}
```

#### `POST /api/ad-platform/sync`
Triggers immediate manual sync for a client or tenant.

---

## 5. Daily Data Ingestion Pipeline & Scheduler Workflow

```mermaid
sequenceDiagram
    autonumber
    participant Cron as AdSyncCronJob (02:00 AM)
    participant Service as AdPlatformService
    participant Connector as Google/Meta/LinkedIn Connector
    participant API as External Ad Platform API
    participant DB as Postgres (CampaignResult)

    Cron->>Service: Execute handleDailySync()
    Service->>DB: Query active TenantAdIntegrations & ClientAdAccounts
    loop For each connected ClientAdAccount
        Service->>Connector: fetchYesterdayMetrics(credentials, externalAccountId)
        Connector->>API: Query API (GAQL / Insights / MDP)
        API-->>Connector: Return campaign metrics JSON
        Connector->>Service: Normalized metrics array (Spend, Impressions, Clicks, Leads, Conversions)
        Service->>DB: Upsert CampaignResult record
        Service->>DB: Log sync status in AdSyncLog
    end
```

### Campaign Metrics Mapping Standard

When connectors ingest platform data, they normalize fields into CHERP's `CampaignResult` schema:

| External Metric | CHERP Field | Conversion / Calculation Rule |
| :--- | :--- | :--- |
| `cost_micros` / `spend` | `ad_spend` | Convert micros (`cost / 1,000,000`) or direct currency value |
| `impressions` | `impressions` | Direct integer |
| `clicks` | `clicks` | Direct integer |
| `conversions` / `leads` | `leads` / `conversions` | Map lead forms to `leads`, purchase/goals to `conversions` |
| `conversions_value` / `revenue` | `revenue` | Direct decimal value |
| — | `cpl` | Auto-calculated: `ad_spend / leads` |
| — | `roas` | Auto-calculated: `revenue / ad_spend` |

---

## 6. Security, Encryption & Token Management

1. **AES-256-GCM Encryption**: All sensitive tokens (`client_secret`, `developer_token`, `access_token`, `refresh_token`, `service_account_json`) MUST be encrypted using `crypto.util.ts` before writing to Postgres.
2. **Automatic Refresh Token Exchange**: When fetching API metrics, if `token_expires_at` is within 5 minutes, `AdPlatformService` automatically uses `refresh_token` to request a fresh `access_token`.
3. **Tenant Isolation**: Queries strictly enforce `where: { tenant_id: user.tenantId }`.

---

## 7. Integration Roadmap & Implementation Checklist

```text
Phase 3.1: Security & Database Setup
 [ ] Add TenantAdIntegration, ClientAdAccount, AdSyncLog to schema.prisma
 [ ] Run npx prisma migrate dev --name add_ad_platform_integrations
 [ ] Implement crypto.util.ts (AES-256-GCM encrypt/decrypt helpers)

Phase 3.2: Platform Connectors Implementation
 [ ] Create google-ads.connector.ts (Google Ads Search & Display queries)
 [ ] Create meta-ads.connector.ts (Meta Marketing Graph API query)
 [ ] Create linkedin-ads.connector.ts (LinkedIn MDP Analytics API query)
 [ ] Create google-ad-manager.connector.ts (GAM DFP Service Account reporting)

Phase 3.3: OAuth Controllers & Frontend Integrations Tab
 [ ] Implement AdPlatformController OAuth endpoints & callbacks
 [ ] Build Integrations Page UI (/integrations) with OAuth Connect buttons
 [ ] Build Account Linkage Modal for mapping client records to ad accounts

Phase 3.4: Automated Sync Cron & Verification
 [ ] Implement AdSyncCronJob running daily at 02:00 AM
 [ ] Verify automatic ingestion into CampaignResult table
 [ ] Verify Reporting Hub updates automatically with synched metrics
```
