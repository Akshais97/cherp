import { NestFactory } from '@nestjs/core'
import { AppModule } from '../src/app.module'
import { TasksService } from '../src/tasks/tasks.service'
import { PrismaService } from '../src/prisma/prisma.service'
import { UserRole } from '../src/common/enums/user-role.enum'
import { RequestUser } from '../src/common/types/request-user.type'

async function run() {
  console.log('Bootstrapping NestJS application context...')
  const app = await NestFactory.createApplicationContext(AppModule)
  const tasksService = app.get(TasksService)
  const prisma = app.get(PrismaService)

  const pmEmail = 'akshaiindia97@gmail.com'
  console.log(`Querying user ${pmEmail} from database...`)
  const dbUser = await prisma.user.findFirst({
    where: { email: pmEmail },
    include: { role: true }
  })

  if (!dbUser) {
    console.error(`User ${pmEmail} not found in database!`)
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

  console.log(`Using actor: ${user.fullName} (${user.role})`)
  
  try {
    console.log('Calling tasksService.findAnalyticsSummary directly...')
    const result = await tasksService.findAnalyticsSummary({}, user)
    console.log('Success! Result statusCounts:', result.statusCounts)
  } catch (err: any) {
    console.error('CRITICAL ERROR CAUGHT:')
    console.error(err)
  } finally {
    await app.close()
  }
}

run().catch(console.error)
