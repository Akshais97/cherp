import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- ALL TABLES IN ERP SCHEMA ---')
  
  try {
    const tables: any[] = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'erp';
    `)
    console.log('Tables:', tables.map(t => t.table_name))
    
    for (const table of tables) {
      const columns: any[] = await prisma.$queryRawUnsafe(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'erp' AND table_name = '${table.table_name}'
        ORDER BY column_name;
      `)
      console.log(`\nTable ${table.table_name} columns:`, columns.map(c => `${c.column_name} (${c.data_type})`))
    }
  } catch (err: any) {
    console.error('Failed to diagnose schema:', err.message)
  }
}

main().finally(() => prisma.$disconnect())
