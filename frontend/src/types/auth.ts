export type UserRole =
  | 'super_admin'
  | 'project_manager'
  | 'team_member'
  | 'client'

export type CurrentUser = {
  id: string
  email: string
  name: string
  role: UserRole
  avatar_url?: string
}

export type AuthSession = {
  access_token: string
  refresh_token: string
}
