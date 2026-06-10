/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { role: true }
  });

  console.log('--- USERS ---');
  for (const u of users) {
    const taskCount = await prisma.task.count({ where: { assigned_to: u.id } });
    const clientUserCount = await prisma.clientUser.count({ where: { user_id: u.id } });
    console.log(`Email: ${u.email}, Role: ${u.role.name}, Tasks Assigned: ${taskCount}, ClientUser Links: ${clientUserCount}`);
  }
}

main().finally(() => prisma.$disconnect());
