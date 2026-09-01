import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { decryptText } from '../common/utils/encryption.util'

export interface SendMailOptions {
  tenantId?: string
  tenantName?: string
  recipientUserId?: string
  notificationType?: string
  taskId?: string
  idempotencyKey?: string
  resendApiKey?: string
  fromEmail?: string
  to: string | string[]
  subject: string
  html?: string
  text?: string
}

@Injectable()
export class ResendProvider {
  private readonly logger = new Logger(ResendProvider.name)

  constructor(private readonly prisma: PrismaService) {}

  async sendMail(options: SendMailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const {
      tenantId,
      tenantName: customTenantName,
      recipientUserId,
      notificationType = 'email_notification',
      taskId,
      idempotencyKey: customIdempotencyKey,
      resendApiKey: overrideApiKey,
      fromEmail: overrideFrom,
      to,
      subject,
      html,
      text,
    } = options

    const recipientList = Array.isArray(to) ? (to.filter(Boolean) as string[]) : (to ? [to] : [])

    // Pre-flight Validations
    if (!subject || !subject.trim()) {
      const err = 'Validation Error: Email subject is missing.'
      this.logger.error(err)
      return { success: false, error: err }
    }

    if (recipientList.length === 0) {
      const err = 'Validation Error: Recipient email is missing.'
      this.logger.error(err)
      return { success: false, error: err }
    }

    if (!html && !text) {
      const err = 'Validation Error: Email body (html or text) is missing.'
      this.logger.error(err)
      return { success: false, error: err }
    }

    // Resolve tenant credentials if tenantId is provided
    let rawApiKey = overrideApiKey !== undefined ? overrideApiKey : process.env.RESEND_API_KEY
    let fromEmail = overrideFrom !== undefined ? overrideFrom : (process.env.RESEND_FROM_EMAIL || 'notifications@cherperp.com')
    let tenantName = customTenantName || 'Agency ERP'

    if (tenantId) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { resend_api_key: true, resend_from_email: true, name: true },
      })

      if (tenant) {
        if (tenant.name) tenantName = tenant.name
        if (tenant.resend_api_key && !overrideApiKey) {
          rawApiKey = tenant.resend_api_key
        }
        if (tenant.resend_from_email && !overrideFrom) {
          fromEmail = tenant.resend_from_email
        }
      }
    }

    if (!rawApiKey || !rawApiKey.trim()) {
      const err = 'Validation Error: Resend API Key is missing.'
      this.logger.error(err)
      return { success: false, error: err }
    }

    if (!fromEmail || !fromEmail.trim()) {
      const err = 'Validation Error: From sender email is missing.'
      this.logger.error(err)
      return { success: false, error: err }
    }

    // Decrypt API key if encrypted
    const apiKey = decryptText(rawApiKey.trim())

    // Format From Header: "Tenant Name <email@domain.com>"
    const formattedFrom = fromEmail.includes('<') ? fromEmail : `${tenantName} <${fromEmail}>`

    // Generate or use Idempotency Key
    const idempotencyKey =
      customIdempotencyKey ||
      `${notificationType}/${taskId || 'general'}/${recipientUserId || recipientList[0] || Date.now()}`

    // Construct Payload JSON (Excludes API Key)
    const payload: Record<string, any> = {
      from: formattedFrom,
      to: recipientList,
      subject: subject.trim(),
    }

    if (html) payload.html = html
    if (text) payload.text = text

    // Test / Simulated Key Handling
    if (apiKey.startsWith('re_test_') || apiKey.startsWith('simulated_') || apiKey.startsWith('re_1234')) {
      const simulatedMessageId = `simulated-${Date.now()}`
      this.logger.warn(`Simulated delivery for: "${subject}" to ${recipientList.join(', ')}`)

      await this.recordDeliveryLog({
        tenantId,
        recipientUserId,
        notificationType,
        idempotencyKey,
        status: 'SENT',
        providerId: simulatedMessageId,
      })

      return { success: true, messageId: simulatedMessageId }
    }

    try {
      // Send Resend API HTTP Request with Authorization Header
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        this.logger.error(`Resend API Error (${response.status}): ${errorText}`)

        await this.recordDeliveryLog({
          tenantId,
          recipientUserId,
          notificationType,
          idempotencyKey,
          status: 'FAILED',
          errorMessage: errorText,
        })

        return { success: false, error: errorText }
      }

      const data = (await response.json()) as { id: string }

      await this.recordDeliveryLog({
        tenantId,
        recipientUserId,
        notificationType,
        idempotencyKey,
        status: 'SENT',
        providerId: data.id,
      })

      return { success: true, messageId: data.id }
    } catch (err: any) {
      this.logger.error(`Failed to dispatch email via Resend: ${err.message}`)

      await this.recordDeliveryLog({
        tenantId,
        recipientUserId,
        notificationType,
        idempotencyKey,
        status: 'FAILED',
        errorMessage: err.message,
      })

      return { success: false, error: err.message }
    }
  }

  private async recordDeliveryLog(log: {
    tenantId?: string
    recipientUserId?: string
    notificationType: string
    idempotencyKey: string
    status: 'SENT' | 'FAILED'
    providerId?: string
    errorMessage?: string
  }) {
    if (!log.tenantId || !log.recipientUserId) return

    try {
      await this.prisma.notificationDeliveryLog.create({
        data: {
          tenant_id: log.tenantId,
          user_id: log.recipientUserId,
          channel: 'EMAIL',
          type: log.notificationType,
          idempotency_key: log.idempotencyKey,
          status: log.status,
          provider_id: log.providerId || null,
          error_message: log.errorMessage || null,
        },
      })
    } catch (err: any) {
      // Ignore duplicate log key constraint if retrying
      this.logger.debug(`Notification delivery log skipped: ${err.message}`)
    }
  }
}
