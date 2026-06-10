const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

async function main() {
  const sqlPath = path.join(__dirname, '../../prisma/task_logs_and_checklist.sql')
  const sqlContent = fs.readFileSync(sqlPath, 'utf8')
  console.log('Running migration SQL on database...')
  
  // Split statements by semicolon and filter out empty ones
  const statements = sqlContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0)

  for (const stmt of statements) {
    // Skip comments
    if (stmt.startsWith('--')) continue;
    console.log(`Executing: ${stmt.split('\n')[0]}...`)
    await prisma.$executeRawUnsafe(stmt)
  }
  
  console.log('Database migration successfully completed!')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
