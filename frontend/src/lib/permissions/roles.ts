import type { UserRole } from '../../types/auth'

export const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  project_manager: 'Project Manager',
  team_member: 'Team Member',
  client: 'Client',
}

export function canViewInternalDashboard(role: UserRole) {
  return role === 'super_admin' || role === 'project_manager' || role === 'team_member'
}

export function canManageUsers(role: UserRole) {
  return role === 'super_admin'
}

export function canManageClients(role: UserRole) {
  return role === 'super_admin' || role === 'project_manager'
}

export function canArchiveClients(role: UserRole) {
  return role === 'super_admin'
}

export function canManageTasks(role: UserRole) {
  return role === 'super_admin' || role === 'project_manager'
}
