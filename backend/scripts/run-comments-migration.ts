import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

async function main() {
  const sqlPath = path.resolve(__dirname, '../../prisma/task_comments_threading_mentions.sql')
  console.log(`Reading migration SQL from ${sqlPath}...`)
  const sql = fs.readFileSync(sqlPath, 'utf8')
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const stmt of statements) {
    console.log('Executing statement:', stmt)
    await prisma.$executeRawUnsafe(stmt)
  }

  console.log('Migration task_comments_threading_mentions finished successfully!')
}

main()
  .catch((e) => {
    console.error('Error running migration:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
