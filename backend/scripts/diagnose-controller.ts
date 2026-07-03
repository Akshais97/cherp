import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { TasksController } from '../src/tasks/tasks.controller'
import { PrismaService } from '../src/prisma/prisma.service'
import { UserRole } from '../src/common/enums/user-role.enum'
import { RequestUser } from '../src/common/types/request-user.type'

async function run() {
  console.log('Bootstrapping NestJS application context...')
  const app = await NestFactory.createApplicationContext(AppModule)
  const controller = app.get(TasksController)
  const prisma = app.get(PrismaService)

  const pmEmail = 'akshaiindia97@gmail.com'
  console.log(`Querying user ${pmEmail} from database...`)
  const dbUser = await prisma.user.findFirst({
    where: { email: pmEmail },
    include: { role: true }
  })

  if (!dbUser) {
    console.error(`User ${pmEmail} not found!`)
    await app.close()
    return
  }

  const user: RequestUser = {
    id: dbUser.id,
    authUserId: dbUser.auth_user_id,
    tenantId: dbUser.tenant_id,
    email: dbUser.email,
    fullName: dbUser.full_name,
    role: dbUser.role.name as UserRole,
    isActive: dbUser.is_active,
  }

  try {
    console.log('Calling controller.getAnalytics exactly as NestJS would...')
    const result = await controller.getAnalytics(
      undefined, // startDate
      undefined, // endDate
      undefined, // targetUserId
      undefined, // clientIds
      undefined, // assigneeIds
      undefined, // labels
      undefined, // priorities
      undefined, // statuses
      undefined, // slots
      undefined, // searchText
      user
    )
    console.log('Success! Result:', result)
  } catch (err: any) {
    console.error('CRITICAL ERROR CAUGHT:')
    console.error(err)
  } finally {
    await app.close()
  }
}

run().catch(console.error)
