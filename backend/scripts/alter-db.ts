import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  console.log('Running database schema updates...');
  await prisma.$executeRawUnsafe('ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS is_daily boolean DEFAULT false;');
  console.log('Database updates completed successfully.');
}
run()
  .catch((e) => {
    console.error('Error running schema updates:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
