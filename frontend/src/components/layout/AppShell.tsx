import {
  AlertTriangle,
  BarChart3,
  BriefcaseBusiness,
  Calendar,
  ClipboardList,
  Contact,
  FolderOpen,
  LayoutDashboard,
  LogOut,
  Menu,
  Palette,
  Search,
  UserPlus,
  UserRoundCheck,
  Users,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useAuth } from '../../app/providers/useAuth'
import { NotificationsBell } from '../../features/notifications/NotificationsBell'
import { AiChatWidget } from '../../features/ai-chat/AiChatWidget'
import { AnalyticsPage } from '../../features/analytics/AnalyticsPage'
import { BrandsPage } from '../../features/brands/BrandsPage'
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
import { TasksOverviewPage } from '../../features/tasks/TasksOverviewPage'
import { EmployeeProfilesPage } from '../../features/profiles/EmployeeProfilesPage'
import { UserManagementPage } from '../../features/users/UserManagementPage'
import { WorkflowsPage } from '../../features/workflows/WorkflowsPage'
import { CalendarPage } from '../../features/calendar/CalendarPage'
import { searchWorkspace, type SearchResult } from '../../features/dashboard/api'
import { ClientDashboardPage } from '../../features/dashboard/ClientDashboardPage'
import { ScopeTemplatesPage } from '../../features/clients/ScopeTemplatesPage'
import { DailyTaskReportPage } from '../../features/tasks/DailyTaskReportPage'

type AppRoute =
  | 'dashboard'
  | 'clients'
  | 'workflows'
  | 'blockers'
  | 'tasks'
  | 'brands'
  | 'analytics'
  | 'employee-profiles'
  | 'users'
  | 'client-directory'
  | 'team-members'
  | 'calendar'
  | 'client-dashboard'
  | 'scope-templates'
  | 'daily-report'

const baseNavItems: {
  id: AppRoute
  label: string
  icon: React.ReactNode
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
  { id: 'client-dashboard', label: 'Client Dashboard', icon: <LayoutDashboard size={17} /> },
  { id: 'daily-report', label: 'Daily Report', icon: <ClipboardList size={17} /> },
  { id: 'tasks', label: 'Tasks', icon: <ClipboardList size={17} /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={17} /> },
  { id: 'client-directory', label: 'Client Directory', icon: <FolderOpen size={17} /> },
  { id: 'brands', label: 'Brands', icon: <Palette size={17} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={17} /> },
  {
    id: 'workflows',
    label: 'Workflows',
    icon: <BriefcaseBusiness size={17} />,
  },
  { id: 'scope-templates', label: 'Scope Templates', icon: <BriefcaseBusiness size={17} /> },
  { id: 'team-members', label: 'Team Members', icon: <UserRoundCheck size={17} /> },
  { id: 'employee-profiles', label: 'Employee Profiles', icon: <Contact size={17} /> },
  { id: 'blockers', label: 'Blockers', icon: <AlertTriangle size={17} /> },
]

export function AppShell() {
  const { currentUser, signOut } = useAuth()
  const [route, setRoute] = useState<AppRoute>(
    currentUser?.role === 'client' ? 'client-dashboard' : 'dashboard'
  )
  const [targetWorkflowId, setTargetWorkflowId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)

  useEffect(() => {
    const q = searchQuery.trim()
    if (q.length < 2) {
      setSearchResults(null)
      return
    }
    setSearchLoading(true)
    const timer = setTimeout(() => {
      searchWorkspace(q)
        .then((data) => setSearchResults(data))
        .catch(() => setSearchResults(null))
        .finally(() => setSearchLoading(false))
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const handleSearchResultClick = (type: 'client' | 'workflow' | 'task' | 'blocker' | 'user', item: any) => {
    setSearchQuery('')
    setSearchResults(null)
    if (type === 'client') {
      if (currentUser?.role === 'team_member') {
        setRoute('brands')
      } else {
        setRoute('client-directory')
      }
    } else if (type === 'workflow') {
      setTargetWorkflowId(item.id)
      setRoute('workflows')
    } else if (type === 'task') {
      setRoute('tasks')
    } else if (type === 'blocker') {
      setRoute('blockers')
    } else if (type === 'user') {
      setRoute('team-members')
    }
  }
  const canManageClientRoutes = currentUser?.role ? canManageClients(currentUser.role) : false
  const canViewTeamMemberRoutes = currentUser?.role ? canViewTeamMembers(currentUser.role) : false
  const visibleBaseNavItems = baseNavItems.filter((item) => {
    if (currentUser?.role === 'client') {
      return item.id === 'client-dashboard' || item.id === 'calendar'
    }
    if (currentUser?.role === 'team_member') {
      if (
        item.id === 'client-directory' ||
        item.id === 'analytics' ||
        item.id === 'employee-profiles' ||
        item.id === 'team-members' ||
        item.id === 'client-dashboard' ||
        item.id === 'scope-templates'
      ) {
        return false
      }
    }
    if (item.id === 'team-members' && !canViewTeamMemberRoutes) {
      return false
    }
    if (item.id === 'client-dashboard' && (currentUser?.role as string) !== 'client' && currentUser?.role !== 'super_admin' && currentUser?.role !== 'project_manager') {
      return false
    }
    if (item.id === 'scope-templates' && currentUser?.role !== 'super_admin' && currentUser?.role !== 'project_manager') {
      return false
    }
    return true
  })
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
          <img alt="Sakhaa Cherp" className="brand-logo" src="/cherp-logo.png" />
          <div>
            <strong>Sakhaa Cherp</strong>
            <span>Agency ERP</span>
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
          <div className="search-container">
            <div className="search-box">
              <Search size={16} />
              <input
                placeholder={currentUser?.role === 'team_member' ? "Search brands, tasks, blockers..." : "Search clients, workflows, blockers..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchLoading ? <span style={{ fontSize: '11px', color: 'var(--muted)', animation: 'pulse 1s infinite' }}>...</span> : null}
            </div>
            {searchResults ? (
              <div className="search-dropdown">
                {searchResults.clients.length > 0 ? (
                  <div>
                    <div className="search-group-title">{currentUser?.role === 'team_member' ? 'Brands' : 'Clients'}</div>
                    {searchResults.clients.map((c) => (
                      <button key={c.id} className="search-item" onClick={() => handleSearchResultClick('client', c)} type="button">
                        <strong>{c.name}</strong>
                      </button>
                    ))}
                  </div>
                ) : null}
                {searchResults.workflows.length > 0 ? (
                  <div>
                    <div className="search-group-title">Workflows</div>
                    {searchResults.workflows.map((w) => (
                      <button key={w.id} className="search-item" onClick={() => handleSearchResultClick('workflow', w)} type="button">
                        <strong>{w.title}</strong>
                        <span>{w.client?.name} · Month {w.month_number}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {searchResults.tasks.length > 0 ? (
                  <div>
                    <div className="search-group-title">Tasks</div>
                    {searchResults.tasks.map((t) => (
                      <button key={t.id} className="search-item" onClick={() => handleSearchResultClick('task', t)} type="button">
                        <strong>{t.title}</strong>
                        <span>Status: {t.status.replaceAll('_', ' ')}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {searchResults.blockers.length > 0 ? (
                  <div>
                    <div className="search-group-title">Blockers</div>
                    {searchResults.blockers.map((b) => (
                      <button key={b.id} className="search-item" onClick={() => handleSearchResultClick('blocker', b)} type="button">
                        <strong>{b.title}</strong>
                        <span>Status: {b.status}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {searchResults.users.length > 0 ? (
                  <div>
                    <div className="search-group-title">Team Members</div>
                    {searchResults.users.map((u) => (
                      <button key={u.id} className="search-item" onClick={() => handleSearchResultClick('user', u)} type="button">
                        <strong>{u.full_name}</strong>
                        <span>{u.email}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {searchResults.clients.length === 0 &&
                searchResults.workflows.length === 0 &&
                searchResults.tasks.length === 0 &&
                searchResults.blockers.length === 0 &&
                searchResults.users.length === 0 ? (
                  <div style={{ padding: '8px', fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
                    No results found.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <NotificationsBell />
          <button className="logout-button" data-testid="button-logout" onClick={signOut} type="button">
            <LogOut size={16} />
            Logout
          </button>
        </header>

        <div className="content-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeRoute}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
            >
          {activeRoute === 'dashboard' ? (
            <DashboardPage
              onNavigate={(nextRoute, ids) => {
                setTargetWorkflowId(ids?.workflowId ?? null)
                setRoute(nextRoute)
              }}
            />
          ) : null}
          {activeRoute === 'clients' ? <ClientsPage /> : null}
          {activeRoute === 'tasks' ? <TasksOverviewPage /> : null}
          {activeRoute === 'calendar' ? <CalendarPage /> : null}
          {activeRoute === 'brands' ? <BrandsPage /> : null}
          {activeRoute === 'analytics' ? <AnalyticsPage /> : null}
          {activeRoute === 'employee-profiles' ? <EmployeeProfilesPage /> : null}
          {activeRoute === 'client-directory' ? <ClientDirectoryPage /> : null}
          {activeRoute === 'team-members' ? <TeamMembersPage /> : null}
          {activeRoute === 'workflows' ? <WorkflowsPage initialWorkflowId={targetWorkflowId} /> : null}
          {activeRoute === 'blockers' ? <BlockersPage /> : null}
          {activeRoute === 'users' ? <UserManagementPage /> : null}
          {activeRoute === 'client-dashboard' ? <ClientDashboardPage /> : null}
          {activeRoute === 'scope-templates' ? <ScopeTemplatesPage /> : null}
          {activeRoute === 'daily-report' ? <DailyTaskReportPage /> : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <AiChatWidget />
    </div>
  )
}
