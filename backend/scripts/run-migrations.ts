/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function run() {
  const sqlFiles = [
    '../../prisma/client_users.sql',
    '../../prisma/client_dashboard_schema.sql',
    '../../prisma/blockers_schema.sql'
  ];

  for (const file of sqlFiles) {
    const filePath = path.resolve(__dirname, file);
    console.log(`Running migration from ${file}...`);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    // Split by semicolon and execute statement by statement
    const statements = sql
      .split(';')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    for (const stmt of statements) {
      await prisma.$executeRawUnsafe(stmt);
    }
    console.log(`Migration ${file} finished successfully.`);
  }

  await prisma.$disconnect();
}

run().catch(async (e) => {
  console.error('Error running migrations:', e);
  await prisma.$disconnect();
  process.exit(1);
});
