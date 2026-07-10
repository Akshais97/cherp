import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  console.log('Running database schema updates...');
  await prisma.$executeRawUnsafe('ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS is_daily boolean DEFAULT false;');
  await prisma.$executeRawUnsafe('ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS start_date date;');
  await prisma.$executeRawUnsafe('ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS labels text[] DEFAULT \'{}\';');
  await prisma.$executeRawUnsafe('ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS recurrence_series_id uuid;');
  await prisma.$executeRawUnsafe('ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS recurrence_rule text;');
  await prisma.$executeRawUnsafe('ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS recurrence_end_date date;');
  await prisma.$executeRawUnsafe('ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS recurrence_type text;');
  console.log('Database updates completed successfully.');
}
run()
  .catch((e) => {
    console.error('Error running schema updates:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
