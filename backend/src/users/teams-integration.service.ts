import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class TeamsIntegrationService {
  private readonly logger = new Logger(TeamsIntegrationService.name)

  constructor(private readonly prisma: PrismaService) {}

  async getSettings(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        teams_enabled: true,
        teams_tenant_id: true,
        teams_client_id: true,
        teams_client_secret: true,
      },
    })
    return tenant
  }

  async saveSettings(
    tenantId: string,
    settings: {
      enabled: boolean
      tenantId: string | null
      clientId: string | null
      clientSecret: string | null
    },
  ) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        teams_enabled: settings.enabled,
        teams_tenant_id: settings.tenantId,
        teams_client_id: settings.clientId,
        teams_client_secret: settings.clientSecret,
      },
    })
  }

  async syncUsers(tenantId: string): Promise<{
    success: boolean
    message: string
    summary?: {
      totalErpUsers: number
      matchedCount: number
      unmatchedCount: number
      unmatchedErpUsers: { id: string; email: string; name: string }[]
      unmatchedMicrosoftUsers: { id: string; email: string; name: string }[]
    }
  }> {
    try {
      const settings = await this.getSettings(tenantId)
      if (!settings || !settings.teams_enabled) {
        return { success: false, message: 'Microsoft Teams integration is not enabled for this tenant.' }
      }

      if (
        !settings.teams_tenant_id ||
        !settings.teams_client_id ||
        !settings.teams_client_secret
      ) {
        return { success: false, message: 'Teams integration credentials are not fully configured.' }
      }

      // 1. Get Access Token
      const token = await this.getAccessToken(
        settings.teams_tenant_id,
        settings.teams_client_id,
        settings.teams_client_secret,
      )

      // 2. Fetch all users from Microsoft Graph (with pagination handling)
      const microsoftUsers: any[] = []
      let url = 'https://graph.microsoft.com/v1.0/users?$select=id,mail,userPrincipalName,displayName,jobTitle,employeeId&$top=999'

      while (url) {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          const errText = await res.text()
          throw new Error(`Graph API user fetch failed: ${res.statusText}. Details: ${errText}`)
        }

        const data: any = await res.json()
        if (data.value && Array.isArray(data.value)) {
          microsoftUsers.push(...data.value)
        }
        url = data['@odata.nextLink'] || null
      }

      // 3. Get all ERP users for the tenant
      const erpUsers = await this.prisma.user.findMany({
        where: { tenant_id: tenantId },
        select: { id: true, email: true, full_name: true, microsoft_id: true },
      })

      const unmatchedErpUsers: { id: string; email: string; name: string }[] = []
      const unmatchedMicrosoftUsersMap = new Map<string, { id: string; email: string; name: string }>()

      // Populate Microsoft users map initially as unmatched
      for (const mUser of microsoftUsers) {
        const email = mUser.mail || mUser.userPrincipalName || ''
        if (email) {
          unmatchedMicrosoftUsersMap.set(email.toLowerCase(), {
            id: mUser.id,
            email,
            name: mUser.displayName || '',
          })
        }
      }

      let matchedCount = 0

      // Match users
      for (const user of erpUsers) {
        const erpEmailLower = user.email.toLowerCase()
        let matchedMUser = unmatchedMicrosoftUsersMap.get(erpEmailLower)

        // Try matching by checking if any Microsoft user's UPN matches erpEmailLower
        if (!matchedMUser) {
          for (const [key, value] of unmatchedMicrosoftUsersMap.entries()) {
            if (key === erpEmailLower) {
              matchedMUser = value
              break
            }
          }
        }

        if (matchedMUser) {
          // Update in database if microsoft_id is not set or is different
          if (user.microsoft_id !== matchedMUser.id) {
            await this.prisma.user.update({
              where: { id: user.id },
              data: { microsoft_id: matchedMUser.id },
            })
          }
          // Remove from unmatched Map
          const mEmail = matchedMUser.email.toLowerCase()
          unmatchedMicrosoftUsersMap.delete(mEmail)
          matchedCount++
        } else {
          unmatchedErpUsers.push({
            id: user.id,
            email: user.email,
            name: user.full_name,
          })
        }
      }

      const unmatchedMicrosoftUsers = Array.from(unmatchedMicrosoftUsersMap.values())

      return {
        success: true,
        message: 'Microsoft directory synchronization completed successfully.',
        summary: {
          totalErpUsers: erpUsers.length,
          matchedCount,
          unmatchedCount: unmatchedErpUsers.length,
          unmatchedErpUsers,
          unmatchedMicrosoftUsers,
        },
      }
    } catch (err: any) {
      this.logger.error(`User sync failed: ${err.message}`)
      return { success: false, message: err.message || 'Failed to synchronize users.' }
    }
  }

  async testConnection(settings: {
    tenantId: string
    clientId: string
    clientSecret: string
  }): Promise<{ success: boolean; message: string }> {
    try {
      const token = await this.getAccessToken(
        settings.tenantId,
        settings.clientId,
        settings.clientSecret,
      )
      if (!token) {
        return { success: false, message: 'Failed to retrieve access token.' }
      }
      return { success: true, message: 'Connection successful! Graph API access token retrieved.' }
    } catch (err: any) {
      return { success: false, message: err.message || 'Connection test failed.' }
    }
  }

  async sendNotification(input: {
    tenantId: string
    userId: string
    title: string
    message: string
  }) {
    try {
      const settings = await this.getSettings(input.tenantId)
      if (!settings || !settings.teams_enabled) {
        return
      }

      if (
        !settings.teams_tenant_id ||
        !settings.teams_client_id ||
        !settings.teams_client_secret
      ) {
        this.logger.warn(`Teams integration is enabled but credentials are not configured for tenant: ${input.tenantId}`)
        return
      }

      // 1. Get recipient user email from erp.users table
      const user = await this.prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true, full_name: true },
      })
      if (!user || !user.email) {
        this.logger.warn(`Recipient user not found or has no email. UserID: ${input.userId}`)
        return
      }

      // 2. Get Access Token
      const token = await this.getAccessToken(
        settings.teams_tenant_id,
        settings.teams_client_id,
        settings.teams_client_secret,
      )

      // 3. Resolve user in Teams
      const microsoftUserId = await this.resolveMicrosoftUserId(token, user.email)
      if (!microsoftUserId) {
        this.logger.warn(`Could not resolve Microsoft User ID for email: ${user.email}`)
        return
      }

      // 4. Send Activity Notification
      await this.postActivityNotification(token, microsoftUserId, input.title, input.message)
      this.logger.log(`Teams notification successfully sent to ${user.email} (${user.full_name})`)
    } catch (err: any) {
      this.logger.error(`Failed to send Teams notification for user ${input.userId}: ${err.message}`)
    }
  }

  private async getAccessToken(
    tenantId: string,
    clientId: string,
    clientSecret: string,
  ): Promise<string> {
    const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`
    const params = new URLSearchParams()
    params.append('grant_type', 'client_credentials')
    params.append('client_id', clientId)
    params.append('client_secret', clientSecret)
    params.append('scope', 'https://graph.microsoft.com/.default')

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Token request failed: ${res.statusText}. Details: ${errText}`)
    }

    const data: any = await res.json()
    return data.access_token
  }

  private async resolveMicrosoftUserId(token: string, email: string): Promise<string | null> {
    const url = `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(email)}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      this.logger.warn(`Failed to resolve Microsoft User by email ${email}: ${res.statusText}`)
      return null
    }

    const data: any = await res.json()
    return data.id
  }

  private async postActivityNotification(
    token: string,
    microsoftUserId: string,
    title: string,
    message: string,
  ) {
    const url = `https://graph.microsoft.com/v1.0/users/${microsoftUserId}/teamwork/sendActivityNotification`
    const body = {
      topic: {
        source: 'entityUrl',
        value: `https://graph.microsoft.com/v1.0/users/${microsoftUserId}/teamwork/sendActivityNotification`,
      },
      activityType: 'userNotification',
      previewText: {
        content: title,
      },
      templateParameters: [
        {
          name: 'title',
          value: title,
        },
        {
          name: 'message',
          value: message,
        },
      ],
      recipient: {
        '@odata.type': '#microsoft.graph.aadUserNotificationRecipient',
        userId: microsoftUserId,
      },
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Failed to send Activity Notification: ${res.statusText}. Details: ${errText}`)
    }
  }
}
