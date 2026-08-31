/// <reference types="node" />

import assert from 'node:assert/strict'
import { BadRequestException } from '@nestjs/common'
import { ScopeTemplatesService } from '../src/scope-templates/scope-templates.service'
import { RequestUser } from '../src/common/types/request-user.type'
import { UserRole } from '../src/common/enums/user-role.enum'

const adminUser: RequestUser = {
  id: '11111111-1111-4111-8111-111111111111',
  authUserId: '21111111-1111-4111-8111-111111111111',
  tenantId: '31111111-1111-4111-8111-111111111111',
  email: 'admin@cherp.com',
  fullName: 'Super Admin',
  role: UserRole.SuperAdmin,
  isActive: true,
}

async function run() {
  console.log('===========================================================')
  console.log('       SPRINT 2 TEMPLATES & ONBOARDING VERIFICATION       ')
  console.log('===========================================================\n')

  await testResolveWithSuggestions()
  await testScopeTemplateJsonValidation()

  console.log('\n✅ ALL SPRINT 2 TEST SCENARIOS PASSED CLEANLY!\n')
}

async function testResolveWithSuggestions() {
  console.log('1. Testing Scope-Template Recommendation Engine (Resolve)...')

  const templatesList = [
    { id: 'tpl-1', name: 'SEO Starter', industry: 'Technology', service_type: 'SEO', is_active: true },
    { id: 'tpl-2', name: 'Healthcare PPC', industry: 'Healthcare', service_type: 'PPC', is_active: true },
    { id: 'tpl-3', name: 'Healthcare SEO', industry: 'Healthcare', service_type: 'SEO', is_active: true },
  ]

  const mockRepo = {
    seedPresets: async () => [],
    findActiveByTenant: async () => templatesList,
    findByIndustryService: async () => null,
    resolve: async (input: { industry: string; serviceType: string }) => {
      const exact = templatesList.find(
        (t) => t.industry.toLowerCase() === input.industry.toLowerCase() && t.service_type.toLowerCase() === input.serviceType.toLowerCase()
      )
      if (exact) {
        return { exact_match: exact, suggestions: [] }
      }
      const suggestions = templatesList.map((t) => {
        const sameIndustry = t.industry.toLowerCase() === input.industry.toLowerCase()
        const sameService = t.service_type.toLowerCase() === input.serviceType.toLowerCase()
        let score = 0.5
        const reasons: string[] = []
        if (sameService) {
          score = 0.85
          reasons.push('same service type')
        } else if (sameIndustry) {
          score = 0.7
          reasons.push('same industry')
        } else {
          reasons.push('popular scope template')
        }
        return { template: t, match_score: score, reasons }
      }).sort((a, b) => b.match_score - a.match_score)

      return { exact_match: null, suggestions }
    },
  }

  const service = new ScopeTemplatesService(mockRepo as never)

  // 1. Exact match
  const exactRes = await service.resolve({ industry: 'Healthcare', service_type: 'PPC' }, adminUser)
  assert.ok(exactRes.exact_match, 'Exact match should be present')
  assert.equal(exactRes.exact_match.name, 'Healthcare PPC')

  // 2. Fallback suggestions when no exact match exists (e.g., Healthcare + Social Media)
  const fallbackRes = await service.resolve({ industry: 'Healthcare', service_type: 'Social Media' }, adminUser)
  assert.equal(fallbackRes.exact_match, null, 'Exact match should be null')
  assert.ok(fallbackRes.suggestions.length > 0, 'Suggestions should be present')
  assert.equal(fallbackRes.suggestions[0].template.name, 'Healthcare PPC')
  assert.ok(fallbackRes.suggestions[0].reasons.includes('same industry'))

  console.log('  ✔ Recommendation engine returned exact match when available and ranked fallback suggestions when absent.')
}

async function testScopeTemplateJsonValidation() {
  console.log('2. Testing Scope Template Server-Side JSON Schema Guard...')

  const mockRepo = {
    findByIndustryService: async () => null,
    createWithLog: async (input: any) => ({ id: 'new-tpl', ...input.data }),
  }

  const service = new ScopeTemplatesService(mockRepo as never)

  // Malformed template task missing title
  const malformedDto = {
    name: 'Invalid Template',
    industry: 'Retail',
    service_type: 'PPC',
    duration_months: 3,
    default_tasks: {
      month_1: [{ description: 'Missing title property' }],
    },
    kpi_framework: { leads: 50 },
  }

  await assert.rejects(
    async () => {
      await service.create(malformedDto as any, adminUser)
    },
    (err: any) => {
      assert.ok(err instanceof BadRequestException)
      assert.match(err.message, /missing required string property 'title'/)
      return true
    }
  )

  // Valid template DTO
  const validDto = {
    name: 'Valid PPC Template',
    industry: 'Retail',
    service_type: 'PPC',
    duration_months: 3,
    default_tasks: {
      month_1: [{ title: 'Setup Google Ads Campaign', estimated_hours: 4 }],
    },
    kpi_framework: { leads: 50 },
  }

  const created = await service.create(validDto as any, adminUser)
  assert.equal(created.name, 'Valid PPC Template')

  console.log('  ✔ Server-side JSON schema guard rejected malformed blueprint task missing title.')
}

run().catch((err) => {
  console.error('❌ Sprint 2 test suite failed:', err)
  process.exit(1)
})
