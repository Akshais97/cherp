import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugOAuth() {
  try {
    const tenant = await prisma.tenant.findFirst()
    console.log('Found tenant:', tenant?.id)

    if (!tenant) {
      console.log('No tenant found in DB!')
      return
    }

    const platform = 'google_ads'
    const integration = await prisma.tenantAdIntegration.findUnique({
      where: {
        tenant_id_platform: { tenant_id: tenant.id, platform },
      },
    })
    console.log('Integration result:', integration)
  } catch (err) {
    console.error('Prisma Error caught:', err)
  } finally {
    await prisma.$disconnect()
  }
}

debugOAuth()
