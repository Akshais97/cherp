import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { UserRole } from '../common/enums/user-role.enum'
import { RequestUser } from '../common/types/request-user.type'
import { PrismaService } from '../prisma/prisma.service'
import { decryptText, encryptText } from '../common/utils/encryption.util'

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(user: RequestUser) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        id: true,
        name: true,
        slug: true,
        resend_api_key: true,
        resend_from_email: true,
        teams_enabled: true,
        teams_tenant_id: true,
        teams_client_id: true,
      },
    })

    if (!tenant) {
      throw new NotFoundException('Tenant not found.')
    }

    const decryptedKey = tenant.resend_api_key ? decryptText(tenant.resend_api_key) : null
    const maskedKey = decryptedKey ? '••••••••' + decryptedKey.slice(-4) : null

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      resend_from_email: tenant.resend_from_email,
      teams_enabled: tenant.teams_enabled,
      teams_tenant_id: tenant.teams_tenant_id,
      teams_client_id: tenant.teams_client_id,
      has_resend_api_key: !!tenant.resend_api_key,
      resend_api_key: maskedKey,
    }
  }

  async updateSettings(
    dto: { resend_api_key?: string; resend_from_email?: string },
    user: RequestUser,
  ) {
    if (user.role !== UserRole.SuperAdmin && user.role !== UserRole.ProjectManager) {
      throw new ForbiddenException('Only super admins and project managers can update agency integrations.')
    }

    const dataToUpdate: any = {}

    if (dto.resend_api_key !== undefined) {
      if (dto.resend_api_key && !dto.resend_api_key.startsWith('••••')) {
        // Store resend_api_key encrypted
        dataToUpdate.resend_api_key = encryptText(dto.resend_api_key.trim())
      }
    }

    if (dto.resend_from_email !== undefined) {
      dataToUpdate.resend_from_email = dto.resend_from_email.trim()
    }

    const updated = await this.prisma.tenant.update({
      where: { id: user.tenantId },
      data: dataToUpdate,
      select: {
        id: true,
        name: true,
        resend_from_email: true,
        resend_api_key: true,
      },
    })

    const decryptedKey = updated.resend_api_key ? decryptText(updated.resend_api_key) : null
    const maskedKey = decryptedKey ? '••••••••' + decryptedKey.slice(-4) : null

    return {
      id: updated.id,
      name: updated.name,
      resend_from_email: updated.resend_from_email,
      has_resend_api_key: !!updated.resend_api_key,
      resend_api_key: maskedKey,
    }
  }
}
