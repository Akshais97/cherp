import { UserRole } from '../enums/user-role.enum'

export type RequestUser = {
  id: string
  authUserId: string
  tenantId: string
  email: string
  fullName: string
  role: UserRole
  avatarUrl?: string
  isActive: boolean
}
