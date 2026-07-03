const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || "postgresql://postgres.xuojujpjnybocuukdgur:qJz5nG7JzKEbUzpW@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=erp"
    }
  }
})

async function main() {
  console.log('Running raw SQL migration on erp.users table...')
  
  // 1. Add microsoft_id column if not exists
  await prisma.$executeRawUnsafe(`
    ALTER TABLE erp.users ADD COLUMN IF NOT EXISTS microsoft_id text;
  `)
  
  // 2. Add unique index if not exists
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS users_microsoft_id_key ON erp.users(microsoft_id);
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
