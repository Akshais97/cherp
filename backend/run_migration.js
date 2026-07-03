const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres.xuojujpjnybocuukdgur:qJz5nG7JzKEbUzpW@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=erp"
    }
  }
})

async function main() {
  console.log('Running raw SQL migration on erp.tenants table...')
  await prisma.$executeRawUnsafe(`
    ALTER TABLE erp.tenants ADD COLUMN IF NOT EXISTS teams_enabled boolean NOT NULL DEFAULT false;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE erp.tenants ADD COLUMN IF NOT EXISTS teams_tenant_id text;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE erp.tenants ADD COLUMN IF NOT EXISTS teams_client_id text;
  `)
  await prisma.$executeRawUnsafe(`
    ALTER TABLE erp.tenants ADD COLUMN IF NOT EXISTS teams_client_secret text;
  `)
  console.log('Migration completed successfully!')
}

main()
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
