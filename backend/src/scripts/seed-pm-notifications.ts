import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedPmNotifications() {
  const pmUser = await prisma.user.findFirst({
    where: { email: 'pm@agency.com' },
  })

  if (!pmUser) {
    console.error('User pm@agency.com not found in DB.')
    return
  }

  console.log(`Found PM User: ${pmUser.full_name} (${pmUser.id})`)

  const designer = await prisma.user.findFirst({
    where: { designation: { contains: 'Graphic Designer', mode: 'insensitive' } },
  })
  const writer = await prisma.user.findFirst({
    where: { designation: { contains: 'Content Writer', mode: 'insensitive' } },
  })
  const marketer = await prisma.user.findFirst({
    where: { designation: { contains: 'Performance', mode: 'insensitive' } },
  })

  const sampleTasks = await prisma.task.findMany({
    where: { workflow: { project_manager_id: pmUser.id } },
    take: 5,
    include: { workflow: { include: { client: true } } },
  })

  const notificationsToCreate = [
    {
      tenant_id: pmUser.tenant_id,
      user_id: pmUser.id,
      type: 'task_blocked',
      title: 'Task marked as blocked',
      message: `${sampleTasks[0]?.title || 'Brand Positioning & Competitor SWOT Analysis'} was moved to blocked by ${designer?.full_name || 'Graphic Designer User'}${sampleTasks[0]?.workflow?.client?.name ? ` for ${sampleTasks[0].workflow.client.name}` : ''}.`,
      related_entity_type: 'task',
      related_entity_id: sampleTasks[0]?.id || null,
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 15), // 15 mins ago
    },
    {
      tenant_id: pmUser.tenant_id,
      user_id: pmUser.id,
      type: 'task_comment_mention',
      title: 'Mentioned in task comment',
      message: `${writer?.full_name || 'Content Writer User'} mentioned you in a comment on "${sampleTasks[1]?.title || 'Social Media Content Calendar - Month 1'}": "@Project Manager User please check copy guidelines."`,
      related_entity_type: 'task',
      related_entity_id: sampleTasks[1]?.id || null,
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    },
    {
      tenant_id: pmUser.tenant_id,
      user_id: pmUser.id,
      type: 'task_blocker_created',
      title: 'Task blocker logged',
      message: `Asset Handoff Delay was logged on ${sampleTasks[2]?.title || 'Ad Campaign Setup & Tagging'}${sampleTasks[2]?.workflow?.client?.name ? ` for ${sampleTasks[2].workflow.client.name}` : ''}.`,
      related_entity_type: 'blocker',
      related_entity_id: sampleTasks[2]?.id || null,
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 5), // 5 hours ago
    },
    {
      tenant_id: pmUser.tenant_id,
      user_id: pmUser.id,
      type: 'task_approval_requested',
      title: 'Task ready for approval',
      message: `${sampleTasks[3]?.title || 'Keyword Research & Competitor Benchmarking'} was moved to task_approved_by_manager by ${marketer?.full_name || 'Performance Marketer User'}${sampleTasks[3]?.workflow?.client?.name ? ` for ${sampleTasks[3].workflow.client.name}` : ''}.`,
      related_entity_type: 'task',
      related_entity_id: sampleTasks[3]?.id || null,
      is_read: false,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
    },
    {
      tenant_id: pmUser.tenant_id,
      user_id: pmUser.id,
      type: 'task_status_changed',
      title: 'Task status updated',
      message: `${sampleTasks[4]?.title || 'Initial Client Onboarding Kickoff'} was moved from yet_to_start to ongoing.`,
      related_entity_type: 'task',
      related_entity_id: sampleTasks[4]?.id || null,
      is_read: true,
      read_at: new Date(Date.now() - 1000 * 60 * 60 * 48), // 2 days ago
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 50),
    },
  ]

  for (const notif of notificationsToCreate) {
    await prisma.notification.create({
      data: notif,
    })
  }

  console.log(`Successfully pushed ${notificationsToCreate.length} notifications for ${pmUser.email}!`)
}

seedPmNotifications()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect())
