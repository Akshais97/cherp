import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkConstraint() {
  const result: any = await prisma.$queryRaw`
    SELECT pg_get_constraintdef(c.oid) AS constraint_def
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE t.relname = 'users' AND c.conname = 'users_team_check';
  `

  console.log('users_team_check definition:')
  console.log(result)
}

checkConstraint().finally(async () => await prisma.$disconnect())
