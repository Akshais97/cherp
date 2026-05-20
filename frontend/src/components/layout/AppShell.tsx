import {
  AlertTriangle,
  BriefcaseBusiness,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Search,
  UserPlus,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../app/providers/useAuth'
import { BlockersPage } from '../../features/blockers/BlockersPage'
import {
  canManageClients,
  canManageUsers,
  canViewTeamMembers,
  roleLabels,
} from '../../lib/permissions/roles'
import { DashboardPage } from '../../features/dashboard/DashboardPage'
import { ClientDirectoryPage } from '../../features/clients/ClientDirectoryPage'
import { ClientsPage } from '../../features/clients/ClientsPage'
import { TeamMembersPage } from '../../features/users/TeamMembersPage'
import { UserManagementPage } from '../../features/users/UserManagementPage'
import { WorkflowsPage } from '../../features/workflows/WorkflowsPage'

type AppRoute =
  | 'dashboard'
  | 'clients'
  | 'workflows'
  | 'blockers'
  | 'users'
  | 'client-directory'
  | 'team-members'

const baseNavItems: {
  id: AppRoute
  label: string
  icon: React.ReactNode
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
  { id: 'client-directory', label: 'Client Directory', icon: <FolderOpen size={17} /> },
  {
    id: 'workflows',
    label: 'Workflows',
    icon: <BriefcaseBusiness size={17} />,
  },
  { id: 'team-members', label: 'Team Members', icon: <UserRoundCheck size={17} /> },
  { id: 'blockers', label: 'Blockers', icon: <AlertTriangle size={17} /> },
]

export function AppShell() {
  const [route, setRoute] = useState<AppRoute>('dashboard')
  const [targetWorkflowId, setTargetWorkflowId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const { currentUser, signOut } = useAuth()
  const canManageClientRoutes = currentUser?.role ? canManageClients(currentUser.role) : false
  const canViewTeamMemberRoutes = currentUser?.role ? canViewTeamMembers(currentUser.role) : false
  const visibleBaseNavItems = canViewTeamMemberRoutes
    ? baseNavItems
    : baseNavItems.filter((item) => item.id !== 'team-members')
  const operationalNavItems = currentUser?.role && canManageClients(currentUser.role)
    ? [
        visibleBaseNavItems[0],
        { id: 'clients' as const, label: 'Client Onboarding', icon: <UserPlus size={17} /> },
        ...visibleBaseNavItems.slice(1),
      ]
    : visibleBaseNavItems
  const navItems = currentUser?.role && canManageUsers(currentUser.role)
    ? [
        ...operationalNavItems,
        { id: 'users' as const, label: 'Users', icon: <Users size={17} /> },
      ]
    : operationalNavItems
  const initials = currentUser?.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const activeRoute =
    (route === 'clients' && !canManageClientRoutes) ||
    (route === 'team-members' && !canViewTeamMemberRoutes)
      ? 'dashboard'
      : route

  return (
    <div
      className={sidebarCollapsed ? 'app-shell sidebar-collapsed' : 'app-shell'}
      data-testid="app-shell"
    >
      <aside className="sidebar">
        <div className="shell-brand">
          <img alt="CHERP" className="brand-logo" src="/cherp-logo.png" />
          <div>
            <strong>CHERP</strong>
            <span>Command Center</span>
          </div>
        </div>

        <nav aria-label="Primary navigation">
          <p>Operations</p>
          {navItems.map((item) => (
            <button
              className={activeRoute === item.id ? 'active' : ''}
              data-testid={`nav-${item.id}`}
              key={item.id}
              onClick={() => {
                setTargetWorkflowId(null)
                setRoute(item.id)
              }}
              type="button"
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="user-card">
          <div className="avatar">{currentUser?.avatar_url ? '' : initials}</div>
          <div>
            <strong>{currentUser?.name}</strong>
            <span>{currentUser ? roleLabels[currentUser.role] : ''}</span>
          </div>
        </div>
      </aside>

      <main className="shell-main">
        <header className="topbar">
          <button
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="icon-button"
            data-testid="button-toggle-sidebar"
            onClick={() => setSidebarCollapsed((value) => !value)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            <Menu size={18} />
          </button>
          <div className="search-box">
            <Search size={16} />
            <input placeholder="Search clients, workflows, blockers..." />
          </div>
          <button className="logout-button" data-testid="button-logout" onClick={signOut} type="button">
            <LogOut size={16} />
            Logout
          </button>
        </header>

        <div className="content-area">
          {activeRoute === 'dashboard' ? (
            <DashboardPage
              onNavigate={(nextRoute, ids) => {
                setTargetWorkflowId(ids?.workflowId ?? null)
                setRoute(nextRoute)
              }}
            />
          ) : null}
          {activeRoute === 'clients' ? <ClientsPage /> : null}
          {activeRoute === 'client-directory' ? <ClientDirectoryPage /> : null}
          {activeRoute === 'team-members' ? <TeamMembersPage /> : null}
          {activeRoute === 'workflows' ? <WorkflowsPage initialWorkflowId={targetWorkflowId} /> : null}
          {activeRoute === 'blockers' ? <BlockersPage /> : null}
          {activeRoute === 'users' ? <UserManagementPage /> : null}
        </div>
      </main>
    </div>
  )
}
