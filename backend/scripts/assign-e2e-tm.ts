/// <reference types="node" />
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Assigning task and client user link to static E2E Team Member...');
  
  // 1. Find the TM user
  const user = await prisma.user.findFirst({
    where: { email: 'akshairofficial@gmail.com' }
  });

  if (!user) {
    console.error('TM user akshairofficial@gmail.com not found!');
    return;
  }

  // 2. Find the first workflow
  const workflow = await prisma.workflow.findFirst({
    include: { client: true }
  });

  if (!workflow) {
    console.error('No workflows found in database to assign!');
    return;
  }

  // 3. Find the first task in this workflow
  let task = await prisma.task.findFirst({
    where: { workflow_id: workflow.id }
  });

  if (!task) {
    // Create a dummy task in the workflow
    console.log(`No tasks found in workflow ${workflow.id}. Creating one...`);
    task = await prisma.task.create({
      data: {
        tenant_id: workflow.tenant_id,
        workflow_id: workflow.id,
        title: 'E2E Seed Task',
        status: 'yet_to_start',
        priority: 'medium',
      }
    });
  }

  // 4. Assign the task to the TM user
  await prisma.task.update({
    where: { id: task.id },
    data: { assigned_to: user.id }
  });

  // 5. Create client_users link
  await prisma.clientUser.upsert({
    where: {
      tenant_id_user_id_client_id: {
        tenant_id: user.tenant_id,
        user_id: user.id,
        client_id: workflow.client_id
      }
    },
    create: {
      tenant_id: user.tenant_id,
      user_id: user.id,
      client_id: workflow.client_id
    },
    update: {}
  });

  console.log(`Successfully assigned task "${task.title}" (Workflow: "${workflow.title}") and linked client to user ${user.email}.`);
}

main().finally(() => prisma.$disconnect());
