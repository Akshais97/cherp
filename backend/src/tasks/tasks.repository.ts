import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TasksRepository {
  constructor(private readonly prisma: PrismaService) {}

  findMany(input: {
    tenantId: string
    userId: string
    role: string
    startDate?: string
    endDate?: string
  }) {
    const { tenantId, userId, role, startDate, endDate } = input
    const where: Prisma.TaskWhereInput = {
      tenant_id: tenantId,
    }

    const andConditions: Prisma.TaskWhereInput[] = []

    if (role === 'team_member') {
      andConditions.push({ assigned_to: userId })
    } else if (role === 'project_manager') {
      andConditions.push({
        OR: [
          { assigned_to: userId },
          { assignee: { role: { name: 'team_member' } } },
          { assigned_to: null },
        ]
      })
    }

    if (role !== 'super_admin') {
      andConditions.push({
        OR: [
          {
            workflow: {
              client: {
                client_users: {
                  some: {
                    user_id: userId,
                  },
                },
              },
            },
          },
          {
            client: {
              client_users: {
                some: {
                  user_id: userId,
                },
              },
            },
          },
        ]
      })
    }

    if (startDate && endDate) {
      andConditions.push({
        OR: [
          {
            due_date: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          },
          {
            is_daily: true,
          },
        ],
      })
    }

    if (andConditions.length > 0) {
      where.AND = andConditions
    }

    return this.prisma.task.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        due_date: true,
        is_daily: true,
        workflow_id: true,
        client_id: true,
        slot: true,
        assigned_to: true,
        assignee: {
          select: {
            id: true,
            full_name: true,
            email: true,
          },
        },
        workflow: {
          select: {
            id: true,
            title: true,
            client: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { due_date: 'asc' },
    })
  }

  findWorkflowForCreate(input: { tenantId: string; workflowId: string }) {
    return this.prisma.workflow.findFirst({
      where: {
        id: input.workflowId,
        tenant_id: input.tenantId,
        client: { tenant_id: input.tenantId },
      },
      select: {
        id: true,
        tenant_id: true,
        status: true,
        _count: { select: { tasks: true } },
      },
    })
  }

  findTaskForAccess(input: { tenantId: string; taskId: string }) {
    return this.prisma.task.findFirst({
      where: {
        id: input.taskId,
        tenant_id: input.tenantId,
        OR: [
          { workflow: { tenant_id: input.tenantId } },
          { client: { tenant_id: input.tenantId } },
        ],
      },
      select: {
        id: true,
        tenant_id: true,
        workflow_id: true,
        client_id: true,
        slot: true,
        assigned_to: true,
        completed_by: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        sort_order: true,
        due_date: true,
        is_daily: true,
        completed_at: true,
        checklist: true,
        _count: { select: { blockers: { where: { status: 'open' } } } },
      },
    })
  }

  userExists(tenantId: string, userId: string) {
    return this.prisma.user.findFirst({
      where: { id: userId, tenant_id: tenantId, is_active: true },
      select: { id: true },
    })
  }

  createWithCompletion(input: {
    tenantId: string
    userId: string
    workflowId: string | null
    data: Prisma.TaskCreateInput
  }) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: input.data,
        select: this.taskSelect(),
      })

      if (input.workflowId) {
        await this.recalculateCompletion(tx, input.tenantId, input.workflowId)
      }

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.userId,
          action_type: 'created',
          entity_type: 'task',
          entity_id: task.id,
          after_values: {
            workflow_id: input.workflowId,
            title: task.title,
            assigned_to: task.assigned_to,
          },
        },
      })

      if (task.assigned_to) {
        await this.syncHistory(tx, input.tenantId, task.assigned_to)
        const clientId = task.workflow?.client?.id || task.client_id
        if (clientId) {
          const clientUserExists = await tx.clientUser.findFirst({
            where: {
              tenant_id: input.tenantId,
              client_id: clientId,
              user_id: task.assigned_to,
            },
          })
          if (!clientUserExists) {
            await tx.clientUser.create({
              data: {
                tenant_id: input.tenantId,
                client_id: clientId,
                user_id: task.assigned_to,
              },
            })
          }
        }
      }

      return task
    })
  }

  updateWithCompletion(input: {
    tenantId: string
    userId: string
    taskId: string
    workflowId: string | null
    data: Prisma.TaskUpdateInput
    beforeValues: Prisma.InputJsonValue
    actionType: 'updated' | 'assigned' | 'status_changed' | 'completed'
    reason?: string | null
  }) {
    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id: input.taskId, tenant_id: input.tenantId },
        data: input.data,
        select: this.taskSelect(),
      })

      if (input.workflowId) {
        await this.recalculateCompletion(tx, input.tenantId, input.workflowId)
      }

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.userId,
          action_type: input.actionType,
          entity_type: 'task',
          entity_id: input.taskId,
          before_values: input.beforeValues,
          after_values: {
            title: task.title,
            status: task.status,
            priority: task.priority,
            assigned_to: task.assigned_to,
            completed_by: task.completed_by,
            completed_at: task.completed_at,
          },
        },
      })

      // Compare old and new values to write to TaskLog
      const before = input.beforeValues as any
      const after = task as any

      const fieldsToCompare = [
        { key: 'title', label: 'title' },
        { key: 'description', label: 'description' },
        { key: 'status', label: 'status' },
        { key: 'priority', label: 'priority' },
      ]

      for (const field of fieldsToCompare) {
        const oldValue = before[field.key]
        const newValue = after[field.key]
        if (oldValue !== newValue) {
          await tx.taskLog.create({
            data: {
              tenant_id: input.tenantId,
              task_id: input.taskId,
              user_id: input.userId,
              field: field.label,
              old_value: oldValue ? String(oldValue) : null,
              new_value: newValue ? String(newValue) : null,
              reason: input.reason || null,
            }
          })
        }
      }

      // Compare assignee
      const oldAssignedTo = before.assigned_to
      const newAssignedTo = after.assigned_to
      if (oldAssignedTo !== newAssignedTo) {
        let oldName: string | null = null
        let newName: string | null = null
        if (oldAssignedTo) {
          const oldUser = await tx.user.findUnique({ where: { id: oldAssignedTo }, select: { full_name: true } })
          oldName = oldUser?.full_name || oldAssignedTo
        }
        if (newAssignedTo) {
          const newUser = await tx.user.findUnique({ where: { id: newAssignedTo }, select: { full_name: true } })
          newName = newUser?.full_name || newAssignedTo
        }
        await tx.taskLog.create({
          data: {
            tenant_id: input.tenantId,
            task_id: input.taskId,
            user_id: input.userId,
            field: 'assignee',
            old_value: oldName,
            new_value: newName,
            reason: input.reason || null,
          }
        })
      }

      // Compare due_date
      const oldDueDate = before.due_date ? new Date(before.due_date).toISOString().slice(0, 10) : null
      const newDueDate = after.due_date ? new Date(after.due_date).toISOString().slice(0, 10) : null
      if (oldDueDate !== newDueDate) {
        await tx.taskLog.create({
          data: {
            tenant_id: input.tenantId,
            task_id: input.taskId,
            user_id: input.userId,
            field: 'due_date',
            old_value: oldDueDate,
            new_value: newDueDate,
            reason: input.reason || null,
          }
        })
      }

      // Compare checklist
      const oldChecklistStr = before.checklist ? JSON.stringify(before.checklist) : '[]'
      const newChecklistStr = after.checklist ? JSON.stringify(after.checklist) : '[]'
      if (oldChecklistStr !== newChecklistStr) {
        await tx.taskLog.create({
          data: {
            tenant_id: input.tenantId,
            task_id: input.taskId,
            user_id: input.userId,
            field: 'checklist',
            old_value: oldChecklistStr,
            new_value: newChecklistStr,
            reason: input.reason || null,
          }
        })
      }

      const oldAssignee = (input.beforeValues as any)?.assigned_to
      const newAssignee = task.assigned_to
      if (oldAssignee) {
        await this.syncHistory(tx, input.tenantId, oldAssignee)
      }
      if (newAssignee && newAssignee !== oldAssignee) {
        await this.syncHistory(tx, input.tenantId, newAssignee)
        const clientId = task.workflow?.client?.id || task.client_id
        if (clientId) {
          const clientUserExists = await tx.clientUser.findFirst({
            where: {
              tenant_id: input.tenantId,
              client_id: clientId,
              user_id: newAssignee,
            },
          })
          if (!clientUserExists) {
            await tx.clientUser.create({
              data: {
                tenant_id: input.tenantId,
                client_id: clientId,
                user_id: newAssignee,
              },
            })
          }
        }
      }

      return task
    })
  }

  deleteWithCompletion(input: {
    tenantId: string
    userId: string
    taskId: string
    workflowId: string | null
    beforeValues: Prisma.InputJsonValue
  }) {
    return this.prisma.$transaction(async (tx) => {
      await tx.taskComment.deleteMany({
        where: { tenant_id: input.tenantId, task_id: input.taskId },
      })
      await tx.taskAttachment.deleteMany({
        where: { tenant_id: input.tenantId, task_id: input.taskId },
      })
      await tx.timeEntry.deleteMany({
        where: { tenant_id: input.tenantId, task_id: input.taskId },
      })
      await tx.blocker.deleteMany({
        where: { tenant_id: input.tenantId, task_id: input.taskId },
      })
      const task = await tx.task.delete({
        where: { id: input.taskId, tenant_id: input.tenantId },
        select: { id: true, title: true },
      })

      if (input.workflowId) {
        await this.recalculateCompletion(tx, input.tenantId, input.workflowId)
      }

      await tx.activityLog.create({
        data: {
          tenant_id: input.tenantId,
          user_id: input.userId,
          action_type: 'deleted',
          entity_type: 'task',
          entity_id: input.taskId,
          before_values: input.beforeValues,
          after_values: { deleted: true, title: task.title },
        },
      })

      const assignee = (input.beforeValues as any)?.assigned_to
      if (assignee) {
        await this.syncHistory(tx, input.tenantId, assignee)
      }

      return { id: task.id, deleted: true }
    })
  }

  async syncHistory(tx: Prisma.TransactionClient, tenantId: string, userId: string) {
    if (!userId) return

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setUTCHours(0, 0, 0, 0)

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    thirtyDaysAgo.setUTCHours(0, 0, 0, 0)

    const [daily, weekly, monthly, completedTasksToday] = await Promise.all([
      tx.task.count({
        where: {
          tenant_id: tenantId,
          assigned_to: userId,
          status: { in: ['completed', 'task_approved_by_manager', 'task_approved_by_client'] },
          completed_at: { gte: today },
        },
      }),
      tx.task.count({
        where: {
          tenant_id: tenantId,
          assigned_to: userId,
          status: { in: ['completed', 'task_approved_by_manager', 'task_approved_by_client'] },
          completed_at: { gte: sevenDaysAgo },
        },
      }),
      tx.task.count({
        where: {
          tenant_id: tenantId,
          assigned_to: userId,
          status: { in: ['completed', 'task_approved_by_manager', 'task_approved_by_client'] },
          completed_at: { gte: thirtyDaysAgo },
        },
      }),
      tx.task.findMany({
        where: {
          tenant_id: tenantId,
          assigned_to: userId,
          status: { in: ['completed', 'task_approved_by_manager', 'task_approved_by_client'] },
          completed_at: { gte: today },
        },
        select: {
          id: true,
          title: true,
          status: true,
          completed_at: true,
          workflow: {
            select: {
              title: true,
              client: { select: { name: true } },
            },
          },
          client: {
            select: {
              name: true,
            },
          },
        },
      }),
    ])

    const existing = await tx.history.findFirst({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        date: today,
      },
    })

    const completed_tasks = completedTasksToday.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      completed_at: t.completed_at,
      workflow_title: t.workflow?.title || null,
      client_name: t.workflow?.client?.name || t.client?.name || null,
    }))

    const payload = {
      completed_daily: daily,
      completed_weekly: weekly,
      completed_monthly: monthly,
      completed_tasks,
    }

    if (existing) {
      await tx.history.update({
        where: { id: existing.id },
        data: { payload },
      })
    } else {
      await tx.history.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          date: today,
          payload,
        },
      })
    }
  }

  private async recalculateCompletion(
    tx: Prisma.TransactionClient,
    tenantId: string,
    workflowId: string,
  ) {
    const total = await tx.task.count({
      where: { tenant_id: tenantId, workflow_id: workflowId },
    })
    const completed = await tx.task.count({
      where: {
        tenant_id: tenantId,
        workflow_id: workflowId,
        status: {
          in: ['completed', 'task_approved_by_manager', 'task_approved_by_client'],
        },
      },
    })
    const completion = total === 0 ? 0 : Math.round((completed / total) * 10000) / 100

    await tx.workflow.update({
      where: { id: workflowId, tenant_id: tenantId },
      data: { completion_percentage: completion },
    })
  }

  private taskSelect() {
    return {
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
      checklist: true,
      slot: true,
      client_id: true,
      created_at: true,
      updated_at: true,
      assignee: {
        select: { id: true, full_name: true, email: true },
      },
      workflow: {
        select: {
          id: true,
          project_manager_id: true,
          client: { select: { id: true, name: true } },
        },
      },
      completer: {
        select: { id: true, full_name: true, email: true },
      },
      _count: { select: { blockers: { where: { status: 'open' } } } },
    } satisfies Prisma.TaskSelect
  }

  findLogs(tenantId: string, taskId: string) {
    return this.prisma.taskLog.findMany({
      where: { tenant_id: tenantId, task_id: taskId },
      include: {
        user: {
          select: { id: true, full_name: true, email: true }
        }
      },
      orderBy: { created_at: 'desc' }
    })
  }

  findComments(tenantId: string, taskId: string) {
    return this.prisma.taskComment.findMany({
      where: { tenant_id: tenantId, task_id: taskId },
      include: {
        author: {
          select: { id: true, full_name: true, email: true }
        }
      },
      orderBy: { created_at: 'asc' }
    })
  }

  createComment(tenantId: string, taskId: string, userId: string, content: string) {
    return this.prisma.$transaction(async (tx) => {
      const comment = await tx.taskComment.create({
        data: {
          tenant_id: tenantId,
          task_id: taskId,
          author_id: userId,
          content,
        },
        include: {
          author: { select: { id: true, full_name: true } }
        }
      })

      await tx.taskLog.create({
        data: {
          tenant_id: tenantId,
          task_id: taskId,
          user_id: userId,
          field: 'comment',
          old_value: null,
          new_value: content.length > 50 ? `${content.substring(0, 50)}...` : content,
        }
      })

      return comment
    })
  }

  findAttachments(tenantId: string, taskId: string) {
    return this.prisma.taskAttachment.findMany({
      where: { tenant_id: tenantId, task_id: taskId },
      include: {
        uploader: {
          select: { id: true, full_name: true }
        }
      },
      orderBy: { created_at: 'desc' }
    })
  }

  createAttachment(tenantId: string, taskId: string, userId: string, fileName: string, fileUrl: string) {
    return this.prisma.$transaction(async (tx) => {
      const attachment = await tx.taskAttachment.create({
        data: {
          tenant_id: tenantId,
          task_id: taskId,
          uploaded_by: userId,
          file_name: fileName,
          file_url: fileUrl,
          file_size: 0,
          mime_type: 'link',
        }
      })

      await tx.taskLog.create({
        data: {
          tenant_id: tenantId,
          task_id: taskId,
          user_id: userId,
          field: 'attachment',
          old_value: null,
          new_value: fileName,
        }
      })

      return attachment
    })
  }

  deleteAttachment(tenantId: string, taskId: string, attachmentId: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.taskAttachment.findFirst({
        where: { id: attachmentId, tenant_id: tenantId, task_id: taskId }
      })
      if (!existing) return null

      await tx.taskAttachment.delete({
        where: { id: attachmentId }
      })

      await tx.taskLog.create({
        data: {
          tenant_id: tenantId,
          task_id: taskId,
          user_id: userId,
          field: 'attachment',
          old_value: existing.file_name,
          new_value: null,
        }
      })

      return existing
    })
  }

  async findDailyReportTasks(tenantId: string, userId: string, dateStr: string) {
    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`)
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`)

    const assigned = await this.prisma.task.findMany({
      where: {
        tenant_id: tenantId,
        assigned_to: userId,
        status: { notIn: ['completed', 'task_approved_by_manager', 'task_approved_by_client'] },
        OR: [
          {
            due_date: {
              gte: startOfDay,
              lte: endOfDay,
            },
          },
          {
            is_daily: true,
          },
        ],
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        due_date: true,
        is_daily: true,
        slot: true,
        client: { select: { id: true, name: true } },
        workflow: { select: { id: true, title: true, client: { select: { name: true } } } },
      },
      orderBy: { due_date: 'asc' },
    })

    const completed = await this.prisma.task.findMany({
      where: {
        tenant_id: tenantId,
        completed_by: userId,
        completed_at: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        due_date: true,
        is_daily: true,
        slot: true,
        completed_at: true,
        client: { select: { id: true, name: true } },
        workflow: { select: { id: true, title: true, client: { select: { name: true } } } },
      },
      orderBy: { completed_at: 'asc' },
    })

    return { assigned, completed }
  }
}
