/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting optimized client_users backfill...');
  
  // 1. Fetch all users
  const users = await prisma.user.findMany({
    include: { role: true }
  });

  // 2. Fetch all clients
  const clients = await prisma.client.findMany();

  const toCreate: { tenant_id: string; user_id: string; client_id: string }[] = [];

  for (const user of users) {
    const roleName = user.role.name;
    const tenantId = user.tenant_id;

    if (roleName === 'super_admin') {
      continue;
    }

    if (roleName === 'project_manager') {
      const tenantClients = clients.filter(c => c.tenant_id === tenantId);
      for (const client of tenantClients) {
        toCreate.push({
          tenant_id: tenantId,
          user_id: user.id,
          client_id: client.id
        });
      }
    } else if (roleName === 'team_member') {
      const assignedTasks = await prisma.task.findMany({
        where: { assigned_to: user.id },
        include: { workflow: true }
      });
      const clientIds = new Set<string>();
      for (const task of assignedTasks) {
        if (task.workflow?.client_id) {
          clientIds.add(task.workflow.client_id);
        }
      }
      for (const clientId of clientIds) {
        toCreate.push({
          tenant_id: tenantId,
          user_id: user.id,
          client_id: clientId
        });
      }
    }
  }

  console.log(`Prepared ${toCreate.length} candidate links. Inserting in bulk...`);
  
  const result = await prisma.clientUser.createMany({
    data: toCreate,
    skipDuplicates: true
  });

  console.log(`Backfill complete! Inserted ${result.count} client_users links.`);
}

main()
  .catch(e => {
    console.error('Error during backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
