import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  console.log('Altering due_date column in tasks table to timestamptz...');
  await prisma.$executeRawUnsafe('ALTER TABLE erp.tasks ALTER COLUMN due_date TYPE timestamptz USING due_date::timestamptz;');
  console.log('Column altered successfully.');
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('Error running database migration:', e);
  await prisma.$disconnect();
  process.exit(1);
});
