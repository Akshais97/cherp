/// <reference types="node" />

import assert from 'node:assert/strict'
import { decryptSecret, encryptSecret } from '../src/common/utils/crypto.util'
import { AdPlatformService } from '../src/ad-platform/ad-platform.service'
import { GoogleAdsConnector } from '../src/ad-platform/connectors/google-ads.connector'
import { MetaAdsConnector } from '../src/ad-platform/connectors/meta-ads.connector'
import { LinkedInAdsConnector } from '../src/ad-platform/connectors/linkedin-ads.connector'
import { GoogleAdManagerConnector } from '../src/ad-platform/connectors/google-ad-manager.connector'
import { RequestUser } from '../src/common/types/request-user.type'
import { UserRole } from '../src/common/enums/user-role.enum'

const testAdmin: RequestUser = {
  id: 'usr-admin-777',
  authUserId: 'auth-admin-777',
  tenantId: 'tnt-ad-test-001',
  email: 'admin@agency.com',
  fullName: 'Agency Admin',
  role: UserRole.SuperAdmin,
  isActive: true,
}

async function runAdPlatformIntegrationVerification() {
  console.log('===========================================================')
  console.log('    AD PLATFORM INTEGRATION & INGESTION VERIFICATION SUITE   ')
  console.log('===========================================================\n')

  // 1. Testing Crypto AES-256-GCM Encryption
  console.log('1. Testing AES-256-GCM Encryption & Decryption Utility...')
  const rawSecret = 'GOCSPX-super-secret-token-12345'
  const encrypted = encryptSecret(rawSecret)
  assert.notEqual(encrypted, rawSecret)
  assert.ok(encrypted.includes(':'), 'Encrypted output should contain IV and Auth Tag separators')
  const decrypted = decryptSecret(encrypted)
  assert.equal(decrypted, rawSecret)
  console.log('  ✔ Encrypted secret at rest and decrypted successfully.\n')

  // 2. In-Memory Mock Store Setup
  let integrationsStore: any[] = []
  let clientAccountsStore: any[] = []
  let campaignResultsStore: any[] = []
  let syncLogsStore: any[] = []

  const mockPrisma = {
    tenantAdIntegration: {
      findUnique: async (query: any) => {
        return (
          integrationsStore.find(
            (i) => i.tenant_id === query.where.tenant_id_platform.tenant_id && i.platform === query.where.tenant_id_platform.platform,
          ) || null
        )
      },
      findMany: async (query: any) => {
        return integrationsStore.filter((i) => i.tenant_id === query.where.tenant_id)
      },
      upsert: async (query: any) => {
        const platform = query.where.tenant_id_platform.platform
        const existingIdx = integrationsStore.findIndex(
          (i) => i.tenant_id === query.where.tenant_id_platform.tenant_id && i.platform === platform,
        )
        if (existingIdx !== -1) {
          integrationsStore[existingIdx] = { ...integrationsStore[existingIdx], ...query.update }
          return integrationsStore[existingIdx]
        }
        const created = { id: `intg-${integrationsStore.length + 1}`, ...query.create }
        integrationsStore.push(created)
        return created
      },
    },
    client: {
      findFirst: async () => ({ id: 'client-real-estate-101', name: 'Acme Real Estate' }),
    },
    clientAdAccount: {
      findMany: async (query: any) => {
        return clientAccountsStore.filter((c) => c.tenant_id === query.where.tenant_id)
      },
      upsert: async (query: any) => {
        const item = { id: `link-${clientAccountsStore.length + 1}`, ...query.create }
        clientAccountsStore.push(item)
        return item
      },
    },
    campaignResult: {
      create: async (query: any) => {
        const item = { id: `cmp-${campaignResultsStore.length + 1}`, ...query.data }
        campaignResultsStore.push(item)
        return item
      },
    },
    adSyncLog: {
      create: async (query: any) => {
        const item = { id: `log-${syncLogsStore.length + 1}`, ...query.data }
        syncLogsStore.push(item)
        return item
      },
      findMany: async (query: any) => {
        return syncLogsStore.filter((l) => l.tenant_id === query.where.tenant_id)
      },
    },
  }

  const googleConnector = new GoogleAdsConnector()
  const metaConnector = new MetaAdsConnector()
  const linkedInConnector = new LinkedInAdsConnector()
  const gamConnector = new GoogleAdManagerConnector()

  const service = new AdPlatformService(
    mockPrisma as any,
    googleConnector,
    metaConnector,
    linkedInConnector,
    gamConnector,
  )

  // 3. Save Developer Credentials & Verify Masking
  console.log('2. Testing Credentials Storage & Secret Masking...')
  const savedCred = await service.saveCredentials(
    {
      platform: 'google_ads',
      client_id: '9876543210-apps.googleusercontent.com',
      client_secret: 'GOCSPX-secret-value-abcd',
      developer_token: 'DEV_TOKEN_KEY_1234',
      account_id: '123-456-7890',
    },
    testAdmin,
  )

  assert.equal(savedCred.platform, 'google_ads')
  assert.equal(savedCred.client_secret, '••••••••abcd')
  assert.equal(savedCred.developer_token, '••••••••1234')
  console.log('  ✔ Saved Google Ads credentials and returned masked secrets to API consumer.\n')

  // 4. OAuth Auth URL Generation
  console.log('3. Testing OAuth Authorization URL Generation...')
  const oauthRes = await service.getOAuthUrl('meta_ads', testAdmin)
  assert.ok(oauthRes.auth_url.includes('facebook.com'))
  assert.ok(oauthRes.auth_url.includes('ads_read'))
  console.log('  ✔ Generated Meta Ads Manager OAuth consent URL.\n')

  // 5. Link External Ad Account to Client
  console.log('4. Testing External Ad Account Linkage to Client...')
  const linkedAcc = await service.linkClientAdAccount(
    {
      client_id: 'client-real-estate-101',
      platform: 'google_ads',
      external_account_id: '123-456-7890',
      account_name: 'Acme Search & Display Account',
    },
    testAdmin,
  )
  assert.equal(linkedAcc.external_account_id, '123-456-7890')
  assert.equal(clientAccountsStore.length, 1)
  console.log('  ✔ Linked external Ad Account 123-456-7890 to client record.\n')

  // 6. Trigger Metric Ingestion Engine & Verify CampaignResult Upserts
  console.log('5. Testing Metric Ingestion & Ingested CampaignResult Records...')
  const syncRes = await service.syncMetrics({ platform: 'google_ads' }, testAdmin)
  assert.ok(syncRes.success)
  assert.ok(syncRes.records_synced >= 2, 'Should ingest at least 2 campaign metric records')

  assert.ok(campaignResultsStore.length >= 2)
  const firstCampaign = campaignResultsStore[0]
  assert.ok(firstCampaign.campaign_name.includes('Google Search LeadGen'))
  assert.equal(firstCampaign.ad_spend, 1450.5)
  assert.equal(firstCampaign.leads, 34)
  assert.ok(firstCampaign.cpl > 0, 'CPL should be auto-calculated')
  assert.ok(firstCampaign.roas > 0, 'ROAS should be auto-calculated')
  console.log('  ✔ Ingested metrics and auto-computed CPL & ROAS in CampaignResult table.\n')

  // 7. Verify AdSyncLog Execution Logs
  console.log('6. Testing Ingestion Audit Logging (AdSyncLog)...')
  const logs = await service.getSyncLogs(testAdmin)
  assert.equal(logs.length, 1)
  assert.equal(logs[0].status, 'success')
  assert.equal(logs[0].platform, 'google_ads')
  console.log('  ✔ AdSyncLog audit record recorded successfully.\n')

  console.log('===========================================================')
  console.log('✅ ALL AD PLATFORM INTEGRATION TEST SCENARIOS PASSED 100%!')
  console.log('===========================================================\n')
}

runAdPlatformIntegrationVerification().catch((err) => {
  console.error('❌ Integration test failed:', err)
  process.exit(1)
})
