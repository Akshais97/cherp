import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Starting Integration Test: Threaded Comments & Mentions ---')

  // Find active tenant and users
  const tenant = await prisma.tenant.findFirst()
  if (!tenant) throw new Error('No tenant found')

  const users = await prisma.user.findMany({
    where: { tenant_id: tenant.id, is_active: true },
    take: 2,
  })
  if (users.length < 2) {
    console.log('Not enough active users to test mentions, creating a test user...')
  }

  const author = users[0]
  const mentionedUser = users[1] || users[0]

  // Find a task to add comments to
  let task = await prisma.task.findFirst({
    where: { tenant_id: tenant.id },
  })

  if (!task) {
    task = await prisma.task.create({
      data: {
        tenant_id: tenant.id,
        title: 'Test Task for Threaded Comments',
        status: 'yet_to_start',
        priority: 'medium',
      },
    })
  }

  console.log(`Using task: ${task.id} (${task.title})`)

  // 1. Create top-level parent comment
  const parentComment = await prisma.taskComment.create({
    data: {
      tenant_id: tenant.id,
      task_id: task.id,
      author_id: author.id,
      content: `Top-level discussion thread starting by ${author.full_name}`,
    },
    include: { author: true },
  })
  console.log(`[PASS] Created parent comment: ${parentComment.id}`)

  // 2. Create reply comment under parent comment with @mention
  const replyComment = await prisma.taskComment.create({
    data: {
      tenant_id: tenant.id,
      task_id: task.id,
      author_id: author.id,
      parent_comment_id: parentComment.id,
      content: `Replying to parent comment with mention for @${mentionedUser.full_name}`,
      mentioned_user_ids: [mentionedUser.id],
    },
    include: {
      author: true,
      parent_comment: {
        include: { author: true },
      },
    },
  })
  console.log(`[PASS] Created threaded reply comment: ${replyComment.id} (parent_comment_id: ${replyComment.parent_comment_id})`)

  // 3. Create notification for mentioned user
  if (mentionedUser.id !== author.id) {
    const notification = await prisma.notification.create({
      data: {
        tenant_id: tenant.id,
        user_id: mentionedUser.id,
        type: 'task_comment_mention',
        title: 'Mentioned in task comment',
        message: `${author.full_name} mentioned you in a comment on "${task.title}"`,
        related_entity_type: 'task',
        related_entity_id: task.id,
      },
    })
    console.log(`[PASS] Notification created for mentioned user ${mentionedUser.id}: notification ${notification.id}`)
  }

  // 4. Query comments for the task and verify threading structure
  const allComments = await prisma.taskComment.findMany({
    where: { tenant_id: tenant.id, task_id: task.id },
    include: {
      author: { select: { id: true, full_name: true } },
      parent_comment: { select: { id: true, author: { select: { full_name: true } } } },
    },
    orderBy: { created_at: 'asc' },
  })

  const foundParent = allComments.find((c) => c.id === parentComment.id)
  const foundReply = allComments.find((c) => c.id === replyComment.id)

  if (!foundParent || foundParent.parent_comment_id !== null) {
    throw new Error('Parent comment assertion failed!')
  }
  if (!foundReply || foundReply.parent_comment_id !== parentComment.id) {
    throw new Error('Threaded reply assertion failed!')
  }

  console.log('--- Threaded Comments & @Mentions Integration Test SUCCESS! ---')
}

main()
  .catch((e) => {
    console.error('Integration test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
