import { PrismaClient } from '@prisma/client'
import { templatePresets } from '../scope-templates/template-presets'

const prisma = new PrismaClient()

async function resetDatabase() {
  console.log('--- Starting Database Cleanup (Clients & Scope Templates) ---')

  await prisma.$transaction(async (tx) => {
    // 1. Delete dependent task operational entities
    console.log('Cleaning up task logs, comments, attachments, time entries, blockers...')
    await tx.taskLog.deleteMany({})
    await tx.taskComment.deleteMany({})
    await tx.taskAttachment.deleteMany({})
    await tx.timeEntry.deleteMany({})
    await tx.blocker.deleteMany({})

    // 2. Delete tasks and workflows
    console.log('Cleaning up tasks and workflows...')
    await tx.task.deleteMany({})
    await tx.workflow.deleteMany({})

    // 3. Delete client-user mapping and clients
    console.log('Cleaning up client user mappings and clients...')
    await tx.clientUser.deleteMany({})
    await tx.client.deleteMany({})

    // 4. Delete activity logs
    console.log('Cleaning up activity logs...')
    await tx.activityLog.deleteMany({})

    // 5. Delete existing scope templates
    console.log('Cleaning up old scope templates...')
    await tx.scopeTemplate.deleteMany({})
  })

  console.log('--- DB Tables Successfully Cleared ---')

  // 6. Re-seed clean scope templates for all active tenants
  const tenants = await prisma.tenant.findMany()
  for (const tenant of tenants) {
    const adminUser = await prisma.user.findFirst({
      where: { tenant_id: tenant.id, role: { name: 'super_admin' } },
    })

    const creatorId = adminUser
      ? adminUser.id
      : (await prisma.user.findFirst({ where: { tenant_id: tenant.id } }))?.id

    if (!creatorId) {
      console.log(`Skipping template seeding for tenant ${tenant.name} (no user found).`)
      continue
    }

    console.log(`Seeding fresh scope templates for tenant: ${tenant.name}`)

    for (const preset of templatePresets) {
      await prisma.scopeTemplate.create({
        data: {
          tenant_id: tenant.id,
          created_by: creatorId,
          name: preset.name,
          industry: preset.industry,
          service_type: preset.service_type,
          description: preset.description,
          duration_months: preset.duration_months,
          default_tasks: preset.default_tasks as any,
          kpi_framework: preset.kpi_framework as any,
          is_active: true,
        },
      })
    }
  }

  console.log('--- Database Reset & Scope Templates Re-seeding Complete! ---')
}

resetDatabase()
  .catch((e) => {
    console.error('Error during database reset:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
