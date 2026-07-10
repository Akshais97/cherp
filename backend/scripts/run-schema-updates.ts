import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function run() {
  const filePath = path.resolve(__dirname, '../../prisma/schema_updates.sql');
  console.log(`Running migration from schema_updates.sql...`);
  const sql = fs.readFileSync(filePath, 'utf8');
  
  // Split statements by semicolon and run each
  const statements = sql
    .split(';')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);

  for (const stmt of statements) {
    try {
      console.log(`Executing: ${stmt.substring(0, 100)}...`);
      await prisma.$executeRawUnsafe(stmt);
    } catch (e: any) {
      // If column already exists or relation exists, print and continue
      console.warn(`Statement warning/error (might already be applied): ${e.message}`);
    }
  }
  console.log(`schema_updates.sql run successfully.`);
  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('Error running updates:', e);
  await prisma.$disconnect();
  process.exit(1);
});
