import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findHistory(tenantId: string, userId: string, startDate?: string, endDate?: string) {
    const where: Prisma.HistoryWhereInput = {
      tenant_id: tenantId,
      user_id: userId,
    }

    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      }
    }

    return this.prisma.history.findMany({
      where,
      orderBy: { date: 'asc' },
    })
  }

  findByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenant_id: tenantId },
      orderBy: { created_at: 'desc' },
      take: 100,
      select: this.safeSelect(),
    })
  }

  findTeamMembersByTenant(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenant_id: tenantId,
        role: { name: 'team_member' },
      },
      orderBy: [{ full_name: 'asc' }],
      take: 100,
      select: this.safeSelect(),
    })
  }

  findTeamWorkloadSummaries(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenant_id: tenantId,
        role: { name: 'team_member' },
      },
      orderBy: [{ full_name: 'asc' }],
      take: 100,
      select: {
        id: true,
        full_name: true,
        email: true,
        designation: true,
        availability: true,
        client_users: {
          where: { tenant_id: tenantId },
          select: { client: { select: { name: true } } },
        },
        _count: {
          select: {
            assigned_tasks: {
              where: {
                tenant_id: tenantId,
                status: {
                  notIn: [
                    'completed',
                    'task_approved_by_manager',
                    'task_approved_by_client',
                  ],
                },
              },
            },
          },
        },
      },
    })
  }

  findById(tenantId: string, id: string) {
    return this.prisma.user.findFirst({
      where: { id, tenant_id: tenantId },
      select: this.safeSelect(),
    })
  }

  findTeamMemberById(tenantId: string, id: string) {
    return this.prisma.user.findFirst({
      where: {
        id,
        tenant_id: tenantId,
        role: { name: 'team_member' },
      },
      select: this.safeSelect(),
    })
  }

  findRoleByName(name: string) {
    return this.prisma.role.findUnique({ where: { name } })
  }

  countUsersByRole(tenantId: string, role: string) {
    return this.prisma.user.count({
      where: { tenant_id: tenantId, role: { name: role } },
    })
  }

  countProtectedDeleteReferences(tenantId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => ({
      createdClients: await tx.client.count({
        where: { tenant_id: tenantId, created_by: userId },
      }),
      createdScopeTemplates: await tx.scopeTemplate.count({
        where: { tenant_id: tenantId, created_by: userId },
      }),
      flaggedBlockers: await tx.blocker.count({
        where: { tenant_id: tenantId, flagged_by: userId },
      }),
      taskComments: await tx.taskComment.count({
        where: { tenant_id: tenantId, author_id: userId },
      }),
      taskAttachments: await tx.taskAttachment.count({
        where: { tenant_id: tenantId, uploaded_by: userId },
      }),
      timeEntries: await tx.timeEntry.count({
        where: { tenant_id: tenantId, user_id: userId },
      }),
    }))
  }

  findAssignedTasks(tenantId: string, userId: string) {
    return this.prisma.task.findMany({
      where: {
        tenant_id: tenantId,
        assigned_to: userId,
        workflow: { tenant_id: tenantId, client: { tenant_id: tenantId } },
      },
      orderBy: [{ status: 'asc' }, { due_date: 'asc' }, { created_at: 'desc' }],
      take: 200,
      select: {
        id: true,
        workflow_id: true,
        assigned_to: true,
        completed_by: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        sort_order: true,
        due_date: true,
        completed_at: true,
        created_at: true,
        updated_at: true,
        workflow: {
          select: {
            id: true,
            title: true,
            month_number: true,
            status: true,
            completion_percentage: true,
            client: {
              select: {
                id: true,
                name: true,
                industry: true,
                service_type: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: { blockers: { where: { status: 'open' } } },
        },
      },
    })
  }

  findAssignedTaskBlockers(tenantId: string, userId: string) {
    return this.prisma.blocker.findMany({
      where: {
        tenant_id: tenantId,
        task: {
          tenant_id: tenantId,
          assigned_to: userId,
          workflow: { tenant_id: tenantId, client: { tenant_id: tenantId } },
        },
        client: { tenant_id: tenantId },
      },
      orderBy: [{ status: 'asc' }, { severity: 'asc' }, { flagged_at: 'desc' }],
      take: 200,
      select: {
        id: true,
        task_id: true,
        client_id: true,
        flagged_by: true,
        resolved_by: true,
        title: true,
        description: true,
        severity: true,
        status: true,
        impact: true,
        resolution_notes: true,
        flagged_at: true,
        resolved_at: true,
        created_at: true,
        updated_at: true,
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            due_date: true,
            workflow: {
              select: {
                id: true,
                title: true,
                month_number: true,
                completion_percentage: true,
              },
            },
          },
        },
        client: {
          select: {
            id: true,
            name: true,
            industry: true,
            service_type: true,
          },
        },
        flagger: { select: { id: true, full_name: true, email: true } },
        resolver: { select: { id: true, full_name: true, email: true } },
      },
    })
  }

  createWithLog(input: {
    tenantId: string
    actorId: string
    roleId: string
    authUserId: string
    email: string
    fullName: string
    avatarUrl?: string
  }) {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenant_id: input.tenantId,
          role_id: input.roleId,
          auth_user_id: input.authUserId,
          email: input.email,
          full_name: input.fullName,
          avatar_url: input.avatarUrl,
          created_by: input.actorId,
          is_active: true,
        },
        select: this.safeSelect(),
      })

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.actorId,
          action_type: 'created',
          entity_type: 'user',
          entity_id: user.id,
          after_values: {
            email: user.email,
            role: user.role.name,
            is_active: user.is_active,
          },
        },
      })

      if (user.role.name === 'client') {
        const client = await tx.client.findFirst({
          where: { tenant_id: input.tenantId },
          orderBy: { created_at: 'desc' },
        })
        if (client) {
          await tx.clientUser.create({
            data: {
              tenant_id: input.tenantId,
              client_id: client.id,
              user_id: user.id,
            },
          })
        }
      }

      return user
    })
  }

  updateWithLog(input: {
    tenantId: string
    actorId: string
    userId: string
    data: Prisma.UserUpdateInput
    beforeValues: Prisma.InputJsonValue
  }) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: input.userId, tenant_id: input.tenantId },
        data: input.data,
        select: this.safeSelect(),
      })

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.actorId,
          action_type: 'updated',
          entity_type: 'user',
          entity_id: input.userId,
          before_values: input.beforeValues,
          after_values: {
            full_name: updated.full_name,
            avatar_url: updated.avatar_url,
            role: updated.role.name,
            is_active: updated.is_active,
          },
        },
      })

      return updated
    })
  }

  logDelete(input: {
    tenantId: string
    actorId: string
    user: NonNullable<Awaited<ReturnType<UsersRepository['findById']>>>
  }) {
    return this.prisma.activityLog.create({
      data: {
        tenant_id: input.tenantId,
        user_id: input.actorId,
        action_type: 'archived',
        entity_type: 'user',
        entity_id: input.user.id,
        before_values: {
          email: input.user.email,
          role: input.user.role.name,
          is_active: input.user.is_active,
        },
      },
    })
  }

  deleteWithLog(input: {
    tenantId: string
    actorId: string
    user: NonNullable<Awaited<ReturnType<UsersRepository['findById']>>>
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.task.updateMany({
        where: { tenant_id: input.tenantId, assigned_to: input.user.id },
        data: { assigned_to: null },
      })

      await tx.task.updateMany({
        where: { tenant_id: input.tenantId, completed_by: input.user.id },
        data: { completed_by: null },
      })

      await tx.workflow.updateMany({
        where: { tenant_id: input.tenantId, project_manager_id: input.user.id },
        data: { project_manager_id: null },
      })

      await tx.blocker.updateMany({
        where: { tenant_id: input.tenantId, resolved_by: input.user.id },
        data: { resolved_by: null },
      })

      await tx.activityLog.updateMany({
        where: { tenant_id: input.tenantId, user_id: input.user.id },
        data: { user_id: null },
      })

      await tx.notification.deleteMany({
        where: { tenant_id: input.tenantId, user_id: input.user.id },
      })

      await tx.notificationPreference.deleteMany({
        where: { tenant_id: input.tenantId, user_id: input.user.id },
      })

      await tx.user.updateMany({
        where: { tenant_id: input.tenantId, created_by: input.user.id },
        data: { created_by: null },
      })

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.actorId,
          action_type: 'archived',
          entity_type: 'user',
          entity_id: input.user.id,
          before_values: {
            email: input.user.email,
            role: input.user.role.name,
            is_active: input.user.is_active,
          },
        },
      })

      await tx.user.delete({
        where: { id: input.user.id, tenant_id: input.tenantId },
      })

      return input.user
    })
  }

  private safeSelect() {
    return {
      id: true,
      email: true,
      full_name: true,
      avatar_url: true,
      is_active: true,
      auth_user_id: true,
      created_at: true,
      updated_at: true,
      designation: true,
      availability: true,
      skills: true,
      current_workload: true,
      team: true,
      role: { select: { name: true, description: true } },
    } satisfies Prisma.UserSelect
  }

}
