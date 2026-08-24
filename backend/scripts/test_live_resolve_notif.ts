import { PrismaClient } from '@prisma/client'
import { NotificationsService } from '../src/notifications/notifications.service'
import { NotificationsRepository } from '../src/notifications/notifications.repository'
import { TeamsIntegrationService } from '../src/users/teams-integration.service'

const prisma = new PrismaClient()

async function main() {
  const notifRepo = new NotificationsRepository(prisma)
  const teamsService = new TeamsIntegrationService(prisma)
  const service = new NotificationsService(notifRepo, teamsService)

  const writerId = '5efee3e0-522d-4cbe-85ad-e3e6baa10613' // team.writer@agency.com
  const pmId = '239b437f-f346-4463-892f-ee47e2a18b1a' // pm@agency.com
  const tenantId = '822d860a-a3b3-499a-883d-eacfd0d59294'

  console.log('Testing notifyBlockerResolved directly...')
  await service.notifyBlockerResolved({
    tenantId,
    actorId: pmId,
    blockerId: '63153126-9674-4e2b-b53c-c969cd6ce9a9',
    blockerTitle: 'sdklcnda',
    taskId: '72466f87-57d5-454a-a88c-163c966eac13',
    taskTitle: 'Brand Positioning & Competitor SWOT Analysis',
    flaggerId: writerId,
    assigneeId: pmId,
    taskAssigneeId: 'f75e3a88-ddf9-4b80-a9b4-f5c2efcf60d8',
    resolutionNotes: 'Test resolution note',
  })

  const created = await prisma.notification.findFirst({
    where: {
      tenant_id: tenantId,
      user_id: writerId,
      type: 'blocker_resolved',
    },
    orderBy: { created_at: 'desc' },
  })

  console.log('Created notification in DB for team.writer@agency.com:', created)

  // Cleanup test notification
  if (created) {
    await prisma.notification.delete({ where: { id: created.id } })
    console.log('Cleaned up test notification.')
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
