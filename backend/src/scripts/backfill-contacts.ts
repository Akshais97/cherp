/// <reference types="node" />
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  await prisma.$executeRawUnsafe(
    `UPDATE erp.clients SET contact_name = 'Primary Contact' WHERE contact_name IS NULL OR trim(contact_name) = '';`
  )
  await prisma.$executeRawUnsafe(
    `UPDATE erp.clients SET contact_email = 'contact@client.com' WHERE contact_email IS NULL OR trim(contact_email) = '';`
  )
  await prisma.$executeRawUnsafe(
    `ALTER TABLE erp.clients ALTER COLUMN contact_name SET NOT NULL;`
  )
  await prisma.$executeRawUnsafe(
    `ALTER TABLE erp.clients ALTER COLUMN contact_email SET NOT NULL;`
  )
  console.log('Successfully set NOT NULL constraints on contact_name and contact_email in erp.clients table!')
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
