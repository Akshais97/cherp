/// <reference types="node" />

import assert from 'node:assert/strict'
import { NotificationsService } from '../src/notifications/notifications.service'
import { RequestUser } from '../src/common/types/request-user.type'
import { UserRole } from '../src/common/enums/user-role.enum'

const user: RequestUser = {
  id: '11111111-1111-4111-8111-111111111111',
  authUserId: '21111111-1111-4111-8111-111111111111',
  tenantId: '31111111-1111-4111-8111-111111111111',
  email: 'user@cherp.com',
  fullName: 'Regular User',
  role: UserRole.TeamMember,
  isActive: true,
}

async function run() {
  console.log('===========================================================')
  console.log('       SPRINT 5 NOTIFICATIONS & IDEMPOTENCY VERIFICATION  ')
  console.log('===========================================================\n')

  await testBulkMarkAllReadAndPreferences()
  await testDeliveryLogIdempotencyGuard()

  console.log('\n✅ ALL SPRINT 5 TEST SCENARIOS PASSED CLEANLY!\n')
}

async function testBulkMarkAllReadAndPreferences() {
  console.log('1. Testing Bulk Read-All & Preference Management...')

  const prefsMap: Record<string, any> = {}
  const mockRepo = {
    findForUser: async () => [{ id: 'n1', is_read: false }, { id: 'n2', is_read: false }],
    markRead: async () => ({ id: 'n1', is_read: true }),
    markAllRead: async () => ({ count: 2 }),
    findPreferences: async () => Object.values(prefsMap),
    upsertPreference: async (_tId: string, _uId: string, type: string, inApp: boolean, email: boolean) => {
      prefsMap[type] = { notification_type: type, in_app_enabled: inApp, email_enabled: email }
      return prefsMap[type]
    },
  }

  const notifService = new NotificationsService(mockRepo as never, {} as never)

  // Mark all read
  const bulkResult = await notifService.markAllRead(user)
  assert.equal(bulkResult.count, 2)

  // Upsert preferences
  const pref = await notifService.updatePreference('task_assigned', true, true, user)
  assert.equal(pref.notification_type, 'task_assigned')
  assert.equal(pref.email_enabled, true)

  console.log('  ✔ Bulk read-all (2 notifications updated) & preference toggling verified.')
}

async function testDeliveryLogIdempotencyGuard() {
  console.log('2. Testing Notification Delivery Logging & Idempotency Guard...')

  const logs = new Set<string>()
  const mockRepo = {
    findDeliveryLog: async (_tId: string, key: string) => (logs.has(key) ? { idempotency_key: key } : null),
    createDeliveryLog: async (input: { idempotencyKey: string }) => {
      logs.add(input.idempotencyKey)
      return { id: 'log-1', idempotency_key: input.idempotencyKey }
    },
  }

  const notifService = new NotificationsService(mockRepo as never, {} as never)
  const key = 'blocker-esc-blocker123-day3'

  // First dispatch: should succeed
  const first = await notifService.checkAndLogDelivery({
    tenantId: user.tenantId,
    userId: user.id,
    channel: 'email',
    type: 'blocker_escalation',
    idempotencyKey: key,
  })
  assert.equal(first, true)

  // Duplicate dispatch: should be blocked
  const second = await notifService.checkAndLogDelivery({
    tenantId: user.tenantId,
    userId: user.id,
    channel: 'email',
    type: 'blocker_escalation',
    idempotencyKey: key,
  })
  assert.equal(second, false)

  console.log('  ✔ Idempotency guard blocked duplicate notification trigger cleanly.')
}

run().catch((err) => {
  console.error('❌ Sprint 5 test suite failed:', err)
  process.exit(1)
})
