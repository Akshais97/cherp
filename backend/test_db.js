require('dotenv').config()
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    await prisma.$connect()
    console.log('Successfully connected to database!')
    const count = await prisma.scopeTemplate.count()
    console.log('Scope Templates count:', count)
    process.exit(0)
  } catch (err) {
    console.error('Connection failed:', err.message)
    process.exit(1)
  }
}

main()
