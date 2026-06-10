import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  console.log('Reading migration SQL...')
  const sqlPath = path.join(__dirname, '../../prisma/schema_updates.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  
  console.log('Running database migrations...')
  // Split statements and execute them individually
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const stmt of statements) {
    console.log(`Executing: ${stmt}`)
    await prisma.$executeRawUnsafe(stmt)
  }
  
  console.log('Migration executed successfully!')
}

main()
  .catch((err) => {
    console.error('Migration failed:', err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
