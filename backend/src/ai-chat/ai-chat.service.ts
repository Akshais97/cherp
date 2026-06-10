import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UserRole } from '../common/enums/user-role.enum'
import { RequestUser } from '../common/types/request-user.type'
import { BlockersService } from '../blockers/blockers.service'
import { TasksService } from '../tasks/tasks.service'
import { AiChatRepository } from './ai-chat.repository'
import { AiChatDto } from './dto/ai-chat.dto'

@Injectable()
export class AiChatService {
  constructor(
    private readonly repository: AiChatRepository,
    private readonly tasksService: TasksService,
    private readonly blockersService?: BlockersService,
    private readonly config?: ConfigService,
  ) {}

  async chat(dto: AiChatDto, user: RequestUser) {
    if (dto.action === 'menu') {
      return this.menu(user)
    }

    const roleName = user.role
    const isPm = roleName === UserRole.ProjectManager || roleName === UserRole.SuperAdmin

    if (dto.action === 'create_task' || dto.action === 'delete_task' || dto.action === 'give_approval') {
      if (!isPm) {
        if (dto.action === 'give_approval') {
          throw new ForbiddenException('Only project managers and super admins can give approval.')
        }
        throw new ForbiddenException(`Only project managers and super admins can ${dto.action === 'create_task' ? 'create' : 'delete'} tasks.`)
      }
    }

    const apiKey = this.config?.get<string>('GEMINI_API_KEY') ?? process.env.GEMINI_API_KEY
    if (!apiKey) {
      return {
        type: 'chat_response',
        text: 'API Key not configured. Please set GEMINI_API_KEY in backend/.env',
      }
    }

    const menuOptionsText = isPm
      ? '- Create Task\n- Update Status\n- Read Task Details\n- Delete Task\n- Give Approval\n- Add Blocker'
      : '- Update Status\n- Read Task Details\n- Ask Approval\n- Add Blocker'

    const systemPrompt = `You are a helpful PM tool assistant. You must strictly follow the rules below depending on the user's role:
Current User Role: ${roleName} (super_admin is treated exactly like project_manager).
Current User Name: ${user.fullName}

If the conversation starts or is in a neutral state, present the options list as a conversational menu:
${menuOptionsText}

You MUST follow these strict sequences for user requests:
1. **Create Task flow (PM only)**: Prompt the PM: "Please mention the task details including Title, Brand/Client, Assignee name, and Due date/time (e.g. 'Create task Write Copy for Bright Homes assigned to Jane due on 2026-06-10 at 15:00')." If details are missing, conversational questions must ask for the specific missing fields. Only set \`execute\` to "create_task" once all details (Title, Brand/Client, Assignee Name, and Due date/time) are successfully obtained.
2. **Delete Task flow (PM only)**: Ask the PM: "What is the Task Name you would like to know about?" Once they specify the task name, set \`execute\` to "delete_task".
3. **Read Task Details flow**: Ask the user: "What Task Name? or Tasks Assigned to who?" Once they specify the task name or assignee, set \`execute\` to "read_task".
4. **Give Approval flow (PM only)**: Reply to the PM: "Give approval for task." If they specify a task, set \`execute\` to "give_approval".
5. **Ask Approval flow (TM only)**: Reply to the TM: "Call the Client to ask approval." If they specify a task, set \`execute\` to "ask_approval".
6. **Add Blocker flow**: Ask the user: "Who should the blocker be assigned to?" Once they specify, set \`execute\` to "add_blocker".
7. **Update Status flow**: Ask the user: "Which task would you like to update and what status should it change to?" (For PM: yet_to_start, ongoing, blocked, completed, task_approved_by_manager, rework, task_approved_by_client. For TM, restrict to status values: yet_to_start, ongoing, blocked, completed). Once they specify the task and status, set \`execute\` to "update_task_status".

Always return a JSON object. The response must NOT contain any formatting prefix, markdown outside of standard text, or other wrappers. Output exactly this JSON structure:
{
  "execute": "create_task" | "update_task_status" | "read_task" | "delete_task" | "give_approval" | "ask_approval" | "add_blocker" | "none",
  "params": {
    "taskTitle": string | null,
    "status": string | null,
    "assigneeName": string | null,
    "brandName": string | null,
    "dueDate": string | null (ISO timestamp, e.g., "2026-06-10T15:00:00Z"),
    "blockerTitle": string | null
  },
  "response": "Conversational reply text to display to the user"
}`

    const history = dto.history || []
    const contents = [
      ...history.map(h => ({
        role: h.role,
        parts: h.parts.map(p => ({ text: p.text }))
      })),
      {
        role: 'user',
        parts: [{ text: dto.message }]
      }
    ]

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }]
            },
            contents,
            generationConfig: {
              temperature: 0.2,
              responseMimeType: 'application/json',
            },
          }),
        },
      )

      if (!response.ok) {
        const errorText = await response.text()
        return {
          type: 'chat_response',
          text: `Error calling Gemini API: ${response.statusText} (${errorText})`,
        }
      }

      const payload = (await response.json()) as any
      const text = payload.candidates?.[0]?.content?.parts?.[0]?.text
      if (!text) {
        return {
          type: 'chat_response',
          text: 'No response from the assistant.',
        }
      }

      const parsed = JSON.parse(text)
      const execute = parsed.execute || 'none'
      const params = parsed.params || {}
      const responseText = parsed.response || ''

      if (execute === 'create_task') {
        if (!isPm) {
          throw new ForbiddenException('Only project managers and super admins can create tasks.')
        }
        try {
          const brandName = params.brandName
          const title = params.taskTitle
          const assigneeName = params.assigneeName
          const dueDate = params.dueDate

          let workflow = await this.repository.findWorkflowByBrand({
            tenantId: user.tenantId,
            brandName,
          })

          let workflowId: string | null = null
          let clientId: string | null = null

          if (workflow) {
            workflowId = workflow.id
            clientId = workflow.client?.id || null
          } else {
            const client = await this.repository.findBrandByName({
              tenantId: user.tenantId,
              brandName,
            })
            if (client) {
              clientId = client.id
            }
          }

          if (!workflowId && !clientId) {
            return {
              type: 'chat_response',
              text: `Brand/Client not found for "${brandName}". ${responseText}`,
            }
          }

          const assignee = assigneeName
            ? await this.repository.findUserByName({ tenantId: user.tenantId, name: assigneeName })
            : null

          const task = await this.tasksService.create(
            workflowId,
            {
              title,
              assigned_to: assignee?.id || undefined,
              due_date: dueDate || undefined,
              client_id: clientId || undefined,
            },
            user,
          )

          return {
            type: 'task_created',
            task,
            text: responseText || `Task "${title}" created successfully!`,
          }
        } catch (e: any) {
          return {
            type: 'chat_response',
            text: `Failed to create task: ${e.message}`,
          }
        }
      }

      if (execute === 'update_task_status') {
        try {
          const taskTitle = params.taskTitle
          const status = params.status

          const task = await this.repository.findTaskByTitle({
            tenantId: user.tenantId,
            title: taskTitle,
          })
          if (!task) {
            return {
              type: 'chat_response',
              text: `Task not found with name "${taskTitle}". ${responseText}`,
            }
          }

          if (user.role === UserRole.TeamMember && task.assigned_to !== user.id) {
            throw new ForbiddenException('Team members can only update their own assigned tasks.')
          }

          const updated = await this.tasksService.update(task.id, { status }, user)
          return {
            type: 'task_updated',
            task: updated,
            text: responseText || `Task status updated to "${status}" successfully.`,
          }
        } catch (e: any) {
          return {
            type: 'chat_response',
            text: `Failed to update status: ${e.message}`,
          }
        }
      }

      if (execute === 'read_task') {
        try {
          const taskTitle = params.taskTitle
          const task = await this.repository.findTaskByTitle({
            tenantId: user.tenantId,
            title: taskTitle,
          })
          if (!task) {
            return {
              type: 'chat_response',
              text: `Task not found with name "${taskTitle}". ${responseText}`,
            }
          }

          return {
            type: 'task_card',
            task,
            text: responseText || `Here is the task details for "${task.title}":`,
          }
        } catch (e: any) {
          return {
            type: 'chat_response',
            text: `Failed to read task: ${e.message}`,
          }
        }
      }

      if (execute === 'delete_task') {
        if (!isPm) {
          throw new ForbiddenException('Only project managers and super admins can delete tasks.')
        }
        try {
          const taskTitle = params.taskTitle
          const task = await this.repository.findTaskByTitle({
            tenantId: user.tenantId,
            title: taskTitle,
          })
          if (!task) {
            return {
              type: 'chat_response',
              text: `Task not found with name "${taskTitle}". ${responseText}`,
            }
          }

          const result = await this.tasksService.delete(task.id, user)
          return {
            type: 'task_deleted',
            result,
            text: responseText || `Task "${taskTitle}" deleted successfully.`,
          }
        } catch (e: any) {
          return {
            type: 'chat_response',
            text: `Failed to delete task: ${e.message}`,
          }
        }
      }

      if (execute === 'add_blocker') {
        try {
          const taskTitle = params.taskTitle
          const blockerTitle = params.blockerTitle

          const task = await this.repository.findTaskByTitle({
            tenantId: user.tenantId,
            title: taskTitle,
          })
          if (!task) {
            return {
              type: 'chat_response',
              text: `Task not found with name "${taskTitle}". ${responseText}`,
            }
          }

          if (user.role === UserRole.TeamMember && task.assigned_to !== user.id) {
            throw new ForbiddenException('Team members can only report blockers on their own assigned tasks.')
          }

          const blocker = await this.blockersService?.create(
            {
              task_id: task.id,
              title: blockerTitle,
              description: blockerTitle,
              severity: 'medium',
              assigned_to: task.assigned_to || user.id,
            },
            user,
          )

          return {
            type: 'blocker_created',
            blocker,
            text: responseText || `Blocker reported successfully on task "${taskTitle}".`,
          }
        } catch (e: any) {
          return {
            type: 'chat_response',
            text: `Failed to create blocker: ${e.message}`,
          }
        }
      }

      if (execute === 'give_approval') {
        if (!isPm) {
          throw new ForbiddenException('Only project managers and super admins can give approval.')
        }
        try {
          const taskTitle = params.taskTitle
          if (taskTitle) {
            const task = await this.repository.findTaskByTitle({
              tenantId: user.tenantId,
              title: taskTitle,
            })
            if (task) {
              const updated = await this.tasksService.update(task.id, { status: 'task_approved_by_manager' }, user)
              return {
                type: 'task_updated',
                task: updated,
                text: responseText || `Task approved successfully.`,
              }
            }
          }
          return {
            type: 'chat_response',
            text: responseText || 'Give approval.',
          }
        } catch (e: any) {
          return {
            type: 'chat_response',
            text: `Failed during give approval: ${e.message}`,
          }
        }
      }

      if (execute === 'ask_approval') {
        try {
          const taskTitle = params.taskTitle
          if (taskTitle) {
            const task = await this.repository.findTaskByTitle({
              tenantId: user.tenantId,
              title: taskTitle,
            })
            if (task) {
              const updated = await this.tasksService.update(task.id, { status: 'completed' }, user)
              return {
                type: 'task_updated',
                task: updated,
                text: responseText || `Call the Client to ask approval.`,
              }
            }
          }
          return {
            type: 'chat_response',
            text: responseText || 'Call the Client to ask approval.',
          }
        } catch (e: any) {
          return {
            type: 'chat_response',
            text: `Failed during ask approval: ${e.message}`,
          }
        }
      }

      return {
        type: 'chat_response',
        text: responseText,
      }
    } catch (error: any) {
      return {
        type: 'chat_response',
        text: `Error processing your chat message: ${error.message}`,
      }
    }
  }

  private menu(user: RequestUser) {
    const pmOptions = [
      'Create Task',
      'Update Status',
      'Read Task Details',
      'Delete Task',
      'Give Approval',
      'Add Blocker',
    ]
    const teamOptions = ['Update Status', 'Read Task Details', 'Ask Approval', 'Add Blocker']

    return {
      type: 'guided_menu',
      options:
        user.role === UserRole.ProjectManager || user.role === UserRole.SuperAdmin
          ? pmOptions
          : teamOptions,
    }
  }
}
