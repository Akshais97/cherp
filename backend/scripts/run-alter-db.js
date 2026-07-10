const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('Adding assigned_by column to tasks table...');
  await prisma.$executeRawUnsafe('ALTER TABLE erp.tasks ADD COLUMN IF NOT EXISTS assigned_by uuid REFERENCES erp.users(id) ON DELETE SET NULL;');
  console.log('Column added successfully.');
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('Error running database migration:', e);
  await prisma.$disconnect();
  process.exit(1);
});
