/// <reference types="node" />

import assert from 'node:assert/strict'
import { HttpException, UnauthorizedException } from '@nestjs/common'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { AuthService } from '../src/auth/auth.service'
import { CreateClientDto } from '../src/clients/dto/create-client.dto'
import { CreateTaskDto } from '../src/tasks/dto/create-task.dto'
import { RequestUser } from '../src/common/types/request-user.type'
import { UserRole } from '../src/common/enums/user-role.enum'

const testUser: RequestUser = {
  id: '11111111-1111-4111-8111-111111111111',
  authUserId: '21111111-1111-4111-8111-111111111111',
  tenantId: '31111111-1111-4111-8111-111111111111',
  email: 'test@cherp.com',
  fullName: 'Test User',
  role: UserRole.SuperAdmin,
  isActive: true,
}

async function run() {
  console.log('===========================================================')
  console.log('       SPRINT 1 AUTH & VALIDATION VERIFICATION SUITE       ')
  console.log('===========================================================\n')

  await testLogoutAndLogoutAll()
  await testLoginRateLimiting()
  await testStrictClientContactValidation()
  await testTaskAssigneeAndDueDateValidation()

  console.log('\n✅ ALL SPRINT 1 TEST SCENARIOS PASSED CLEANLY!\n')
}

async function testLogoutAndLogoutAll() {
  console.log('1. Testing Logout and Logout-All Services...')

  let loggedActivity: any = null
  let updatedRevocationDate: Date | null = null

  const mockPrisma = {
    user: {
      update: async (input: any) => {
        updatedRevocationDate = input.data.sessions_revoked_at
        return { id: testUser.id }
      },
    },
    authAttempt: {
      count: async () => 0,
      create: async () => ({}),
    },
  }

  const mockActivityRepo = {
    create: async (input: any) => {
      loggedActivity = input
    },
  }

  const mockConfig = { get: () => 'http://localhost' }
  const authService = new AuthService(mockConfig as never, mockPrisma as never, mockActivityRepo as never)

  // Test Logout
  const logoutRes = await authService.logout(testUser)
  assert.equal(logoutRes.user_id, testUser.id)
  assert.equal(loggedActivity.actionType, 'auth_logout')

  // Test Logout-All
  const logoutAllRes = await authService.logoutAll(testUser)
  assert.equal(logoutAllRes.user_id, testUser.id)
  assert.ok(updatedRevocationDate instanceof Date, 'sessions_revoked_at should be updated')
  assert.equal(loggedActivity.actionType, 'auth_logout_all')

  console.log('  ✔ Logout and Logout-All updated revocation timestamp and logged audit activities.')
}

async function testLoginRateLimiting() {
  console.log('2. Testing Login Rate Limiting Wrapper...')

  let failedAttemptsCount = 0
  const mockPrisma = {
    authAttempt: {
      count: async (query: any) => {
        if (query.where.success === false) {
          return failedAttemptsCount
        }
        return 0
      },
      create: async () => ({}),
    },
  }

  const mockActivityRepo = { create: async () => ({}) }
  const mockConfig = { get: () => 'http://localhost' }
  const authService = new AuthService(mockConfig as never, mockPrisma as never, mockActivityRepo as never)

  // Under limit (4 failures)
  failedAttemptsCount = 4
  // Supabase login attempt will fail with Invalid credentials since no mock supabase exists
  await assert.rejects(
    async () => {
      await authService.login({ email: 'user@test.com', password: 'wrongpassword' }, '127.0.0.1')
    },
    (err: any) => {
      assert.ok(err instanceof UnauthorizedException)
      return true
    }
  )

  // Exceed limit (5 failures)
  failedAttemptsCount = 5
  await assert.rejects(
    async () => {
      await authService.login({ email: 'user@test.com', password: 'wrongpassword' }, '127.0.0.1')
    },
    (err: any) => {
      assert.ok(err instanceof HttpException)
      assert.equal(err.getStatus(), 429)
      assert.match(err.message, /Too many failed login attempts/)
      return true
    }
  )

  console.log('  ✔ Login rate limiting correctly rejected request exceeding 5 failed attempts with 429.')
}

async function testStrictClientContactValidation() {
  console.log('3. Testing Strict Client Contact Details Validation...')

  // Missing contact_name and contact_email
  const invalidDto = plainToInstance(CreateClientDto, {
    name: 'Acme Corp',
    industry: 'Technology',
    service_type: 'SEO',
    currency: 'USD',
    contract_duration: 12,
    contract_start: '2026-09-01',
    scope_template_id: '11111111-1111-4111-8111-111111111111',
  })

  const errors = await validate(invalidDto)
  assert.ok(errors.length > 0, 'Validation should fail when contact fields are missing')
  const errorProperties = errors.map((e) => e.property)
  assert.ok(errorProperties.includes('contact_name'), 'contact_name should be invalid')
  assert.ok(errorProperties.includes('contact_email'), 'contact_email should be invalid')

  // Valid DTO
  const validDto = plainToInstance(CreateClientDto, {
    name: 'Acme Corp',
    industry: 'Technology',
    service_type: 'SEO',
    contact_name: 'John Doe',
    contact_email: 'john@acme.com',
    currency: 'USD',
    contract_duration: 12,
    contract_start: '2026-09-01',
    scope_template_id: '11111111-1111-4111-8111-111111111111',
  })

  const validErrors = await validate(validDto)
  assert.equal(validErrors.length, 0, 'Validation should pass when contact fields are present')

  console.log('  ✔ Client DTO strictly enforced contact_name and contact_email.')
}

async function testTaskAssigneeAndDueDateValidation() {
  console.log('4. Testing Task Due Date & Daily Slot Conditional Validation...')

  // Standard task without due_date should fail conditional validation
  const invalidStandardTask = plainToInstance(CreateTaskDto, {
    title: 'Standard Task',
    is_daily: false,
  })

  const standardErrors = await validate(invalidStandardTask)
  assert.ok(
    standardErrors.some((e) => e.property === 'due_date'),
    'due_date should be required when is_daily is false'
  )

  // Daily task without slot should fail conditional validation
  const invalidDailyTask = plainToInstance(CreateTaskDto, {
    title: 'Daily Task',
    is_daily: true,
  })

  const dailyErrors = await validate(invalidDailyTask)
  assert.ok(
    dailyErrors.some((e) => e.property === 'slot'),
    'slot should be required when is_daily is true'
  )

  // Valid Daily Task with slot
  const validDailyTask = plainToInstance(CreateTaskDto, {
    title: 'Daily Standup Task',
    is_daily: true,
    slot: '09:00 AM',
  })

  const validDailyErrors = await validate(validDailyTask)
  assert.equal(validDailyErrors.length, 0)

  console.log('  ✔ Task conditional due_date and slot rules enforced correctly.')
}

run().catch((err) => {
  console.error('❌ Sprint 1 test suite failed:', err)
  process.exit(1)
})
