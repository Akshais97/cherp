import { PrismaClient } from '@prisma/client'
import { templatePresets } from '../src/scope-templates/template-presets'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding presets for all tenants in database...')
  const tenants = await prisma.tenant.findMany()

  for (const tenant of tenants) {
    const user = await prisma.user.findFirst({ where: { tenant_id: tenant.id } })
    if (!user) continue

    for (const preset of templatePresets) {
      const result = await prisma.scopeTemplate.upsert({
        where: {
          tenant_id_industry_service_type: {
            tenant_id: tenant.id,
            industry: preset.industry,
            service_type: preset.service_type,
          },
        },
        update: {
          name: preset.name,
          description: preset.description,
          duration_months: preset.duration_months,
          default_tasks: preset.default_tasks,
          kpi_framework: preset.kpi_framework,
          is_active: true,
        },
        create: {
          tenant_id: tenant.id,
          created_by: user.id,
          name: preset.name,
          industry: preset.industry,
          service_type: preset.service_type,
          description: preset.description,
          duration_months: preset.duration_months,
          default_tasks: preset.default_tasks,
          kpi_framework: preset.kpi_framework,
          is_active: true,
        },
      })
      console.log(`Upserted template: ${result.name} (${result.industry} / ${result.service_type})`)
    }
  }

  console.log('All template presets successfully seeded into database!')
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
