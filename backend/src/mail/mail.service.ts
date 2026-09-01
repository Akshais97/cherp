import { Injectable } from '@nestjs/common'
import { ResendProvider } from './resend.provider'

export interface TaskAssignedEmailInput {
  tenantId?: string
  tenantName?: string
  assignedByName: string
  assigneeEmail: string
  recipientUserId?: string
  taskId: string
  taskTitle: string
  taskUrl?: string
  resendApiKey?: string
  fromEmail?: string
}

export interface TaskCreatedEmailInput {
  tenantId?: string
  tenantName?: string
  createdByName: string
  recipientEmail: string
  recipientUserId?: string
  taskId: string
  taskTitle: string
  taskUrl?: string
  resendApiKey?: string
  fromEmail?: string
}

export interface TaskNotificationEmailInput {
  tenantId?: string
  tenantName?: string
  recipientEmail: string
  recipientUserId?: string
  actorName: string
  notificationType: 'task_assigned' | 'task_created' | 'due_soon' | 'overdue' | 'comment' | 'mention' | string
  taskId: string
  taskTitle: string
  taskUrl?: string
  resendApiKey?: string
  fromEmail?: string
  subject?: string
  emailBody?: string
}

export interface DailyDigestEmailInput {
  tenantId: string
  toEmail: string
  recipientName: string
  dueTodayCount: number
  overdueCount: number
  openBlockersCount: number
}

export interface DeadlineReminderEmailInput {
  tenantId: string
  toEmail: string
  recipientName: string
  taskTitle: string
  dueDate: string
  isOverdue: boolean
}

@Injectable()
export class MailService {
  constructor(private readonly resendProvider: ResendProvider) {}

  /**
   * Specifically handles Task Assignment Notification Emails
   */
  async sendTaskAssignedEmail(input: TaskAssignedEmailInput) {
    const {
      tenantId,
      tenantName,
      assignedByName,
      assigneeEmail,
      recipientUserId,
      taskId,
      taskTitle,
      taskUrl = `http://localhost:5173/tasks?id=${taskId}`,
      resendApiKey,
      fromEmail,
    } = input

    const subject = `New task assigned: ${taskTitle}`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
        <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">📌 Task Assigned to You</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
          <strong>${assignedByName}</strong> assigned you a new task in <strong>${tenantName || 'Cherp ERP'}</strong>.
        </p>
        <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #0f172a;">${taskTitle}</p>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">Task ID: ${taskId}</p>
        </div>
        <p style="margin-top: 24px;">
          <a href="${taskUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
            Open Task in Cherp ERP
          </a>
        </p>
      </div>
    `

    return this.resendProvider.sendMail({
      tenantId,
      tenantName,
      recipientUserId,
      notificationType: 'task_assigned',
      taskId,
      resendApiKey,
      fromEmail,
      to: assigneeEmail,
      subject,
      html,
    })
  }

  /**
   * Specifically handles Task Created Notification Emails
   */
  async sendTaskCreatedEmail(input: TaskCreatedEmailInput) {
    const {
      tenantId,
      tenantName,
      createdByName,
      recipientEmail,
      recipientUserId,
      taskId,
      taskTitle,
      taskUrl = `http://localhost:5173/tasks?id=${taskId}`,
      resendApiKey,
      fromEmail,
    } = input

    const subject = `New task created: ${taskTitle}`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
        <h2 style="color: #1e293b; font-size: 20px; margin-top: 0;">✨ New Task Created</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
          <strong>${createdByName}</strong> created a new task in <strong>${tenantName || 'Cherp ERP'}</strong>.
        </p>
        <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #0f172a;">${taskTitle}</p>
          <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">Task ID: ${taskId}</p>
        </div>
        <p style="margin-top: 24px;">
          <a href="${taskUrl}" style="background-color: #059669; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
            Open Task in Cherp ERP
          </a>
        </p>
      </div>
    `

    return this.resendProvider.sendMail({
      tenantId,
      tenantName,
      recipientUserId,
      notificationType: 'task_created',
      taskId,
      resendApiKey,
      fromEmail,
      to: recipientEmail,
      subject,
      html,
    })
  }

  /**
   * Generic Task Event Notification Email Dispatcher
   */
  async sendTaskNotificationEmail(input: TaskNotificationEmailInput) {
    const {
      tenantId,
      tenantName,
      recipientEmail,
      recipientUserId,
      actorName,
      notificationType,
      taskId,
      taskTitle,
      taskUrl = `http://localhost:5173/tasks?id=${taskId}`,
      resendApiKey,
      fromEmail,
      subject: customSubject,
      emailBody: customBody,
    } = input

    const subject = customSubject || `[${notificationType.replaceAll('_', ' ').toUpperCase()}] ${taskTitle}`
    const html = customBody || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 10px; background-color: #ffffff;">
        <h2 style="color: #2563eb; font-size: 20px; margin-top: 0;">📌 Task Update</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.5;">
          <strong>${actorName}</strong> triggered an update for task <strong>${taskTitle}</strong>.
        </p>
        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 15px; font-weight: 600; color: #0f172a;">${taskTitle}</p>
          <p style="margin: 4px 0 0 0; font-size: 13px; color: #475569;">Event: ${notificationType}</p>
          <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Updated by: ${actorName}</p>
        </div>
        <p style="margin-top: 24px;">
          <a href="${taskUrl}" style="background-color: #2563eb; color: #ffffff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block;">
            Open Task in Cherp ERP
          </a>
        </p>
      </div>
    `

    return this.resendProvider.sendMail({
      tenantId,
      tenantName,
      recipientUserId,
      notificationType,
      taskId,
      resendApiKey,
      fromEmail,
      to: recipientEmail,
      subject,
      html,
    })
  }

  async sendBlockerEscalationEmail(input: {
    tenantId: string
    toEmail: string
    recipientName: string
    blockerTitle: string
    severity: string
    taskTitle: string
    daysOpen: number
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #d9534f;">⚠️ Blocker Escalation Notice</h2>
        <p>Hello <strong>${input.recipientName}</strong>,</p>
        <p>A <strong>${input.severity.toUpperCase()}</strong> severity blocker has breached SLA threshold and requires immediate attention.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #d9534f; margin: 15px 0;">
          <p style="margin: 0; font-weight: bold;">Blocker Title: ${input.blockerTitle}</p>
          <p style="margin: 5px 0 0 0; color: #555;">Task: ${input.taskTitle}</p>
          <p style="margin: 5px 0 0 0; color: #777;">Time Open: ${input.daysOpen} days</p>
        </div>
        <p>Please log in to your Cherp ERP dashboard to resolve or reassign this blocker.</p>
      </div>
    `
    return this.resendProvider.sendMail({
      tenantId: input.tenantId,
      to: input.toEmail,
      subject: `[ESCALATION] ${input.severity.toUpperCase()} Blocker: ${input.blockerTitle}`,
      html,
    })
  }

  async sendDailyDigestEmail(input: DailyDigestEmailInput) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2>☀️ Daily Digest Briefing</h2>
        <p>Hello <strong>${input.recipientName}</strong>,</p>
        <p>Here is your daily task and operational summary for today:</p>
        <ul>
          <li><strong>Tasks Due Today:</strong> ${input.dueTodayCount}</li>
          <li><strong>Overdue Tasks:</strong> ${input.overdueCount}</li>
          <li><strong>Open Blockers:</strong> ${input.openBlockersCount}</li>
        </ul>
        <p>Have a productive day!</p>
      </div>
    `
    return this.resendProvider.sendMail({
      tenantId: input.tenantId,
      to: input.toEmail,
      subject: `☀️ Daily Digest Briefing for ${input.recipientName}`,
      html,
    })
  }

  async sendDeadlineReminderEmail(input: DeadlineReminderEmailInput) {
    const statusText = input.isOverdue ? 'is OVERDUE' : 'is due in 24 hours'
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2>⏰ Task Deadline Alert</h2>
        <p>Hello <strong>${input.recipientName}</strong>,</p>
        <p>Your assigned task <strong>${input.taskTitle}</strong> ${statusText} (Due Date: ${input.dueDate}).</p>
        <p>Please check your Cherp ERP task board for updates.</p>
      </div>
    `
    return this.resendProvider.sendMail({
      tenantId: input.tenantId,
      to: input.toEmail,
      subject: `[DEADLINE ALERT] ${input.taskTitle} ${input.isOverdue ? 'OVERDUE' : 'Due Soon'}`,
      html,
    })
  }
}
