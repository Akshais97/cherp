import {
  AlertTriangle,
  AngleDown,
  AngleRight,
  Briefcase,
  Calendar,
  Category2,
  ChartBar,
  ClipboardList,
  File,
  FolderBookmark,
  FolderOpen,
  Home,
  Layers,
  Layout,
  Logout,
  Menu,
  Palette,
  People,
  Personalcard,
  Plug,
  Search,
  Settings,
  UserAdd,
  UserCheck,
  Users
} from 'reicon-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { useAuth } from '../../app/providers/useAuth'
import { useTheme } from '../../app/providers/ThemeContext'
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
import { IntegrationsPage } from '../../features/integrations/IntegrationsPage'

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
  | 'integrations'

const baseNavItems: {
  id: AppRoute
  label: string
  icon: React.ReactNode
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Layout size={18} /> },
  { id: 'client-dashboard', label: 'Client Dashboard', icon: <Home size={18} /> },
  { id: 'daily-report', label: 'Daily Report', icon: <File size={18} /> },
  { id: 'tasks', label: 'Tasks', icon: <ClipboardList size={18} /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={18} /> },
  { id: 'client-directory', label: 'Client Directory', icon: <FolderOpen size={18} /> },
  { id: 'brands', label: 'Brands', icon: <Palette size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <ChartBar size={18} /> },
  {
    id: 'workflows',
    label: 'Workflows',
    icon: <Briefcase size={18} />,
  },
  { id: 'scope-templates', label: 'Scope Templates', icon: <Layers size={18} /> },
  { id: 'team-members', label: 'Team Members', icon: <UserCheck size={18} /> },
  { id: 'employee-profiles', label: 'Employee Profiles', icon: <Personalcard size={18} /> },
  { id: 'blockers', label: 'Blockers', icon: <AlertTriangle size={18} /> },
]

interface NavSection {
  id: string
  label: string
  icon: React.ReactNode
  items: AppRoute[]
}

const navSections: NavSection[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    icon: <Category2 size={15} />,
    items: ['dashboard', 'client-dashboard', 'daily-report', 'tasks', 'calendar', 'blockers']
  },
  {
    id: 'clients-delivery',
    label: 'Clients & Delivery',
    icon: <FolderBookmark size={15} />,
    items: ['client-directory', 'clients', 'workflows', 'scope-templates', 'brands']
  },
  {
    id: 'team-performance',
    label: 'Team & Performance',
    icon: <People size={15} />,
    items: ['team-members', 'employee-profiles', 'analytics']
  },
  {
    id: 'platform',
    label: 'Platform',
    icon: <Settings size={15} />,
    items: ['users', 'integrations']
  }
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
  const { theme, toggleTheme } = useTheme()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    workspace: false,
    'clients-delivery': false,
    'team-performance': false,
    platform: false,
  })

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }))
  }

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
        { id: 'clients' as const, label: 'Client Onboarding', icon: <UserAdd size={18} /> },
        ...visibleBaseNavItems.slice(1),
      ]
    : visibleBaseNavItems
  const navItems = currentUser?.role && canManageUsers(currentUser.role)
    ? [
        ...operationalNavItems,
        { id: 'users' as const, label: 'Users', icon: <Users size={18} /> },
      ]
    : operationalNavItems
  
  const finalNavItems = [...navItems]
  if (currentUser?.email === 'akshaiofficial97@gmail.com') {
    finalNavItems.push({
      id: 'integrations' as any,
      label: 'Integrations',
      icon: <Plug size={18} />
    })
  }

  const matchingNavItems = searchQuery.trim().length >= 1
    ? finalNavItems.filter((item) =>
        item.label.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : []

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
          <img alt="Saarthii Cherp" className="brand-logo" src="/cherp-logo.png" />
          <div>
            <strong>Saarthii Cherp</strong>
            <span>Agency ERP</span>
          </div>
        </div>

        <nav aria-label="Primary navigation">
          {navSections.map((section) => {
            const sectionItems = finalNavItems.filter((item) => section.items.includes(item.id))
            if (sectionItems.length === 0) return null

            const isExpanded = sidebarCollapsed || (expandedSections[section.id] !== false)

            return (
              <div className="nav-section" key={section.id}>
                <button
                  type="button"
                  className="sidebar-section-header"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="sidebar-section-header-left">
                    {section.icon}
                    <span>{section.label}</span>
                  </div>
                  {isExpanded && !sidebarCollapsed ? <AngleDown size={13} /> : <AngleRight size={13} />}
                </button>
                {isExpanded && (
                  <div className="nav-section-items">
                    {sectionItems.map((item) => (
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
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="user-card">
          <div className="avatar">{currentUser?.avatar_url ? '' : initials}</div>
          <div className="user-info">
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
            {(searchResults || matchingNavItems.length > 0) ? (
              <div className="search-dropdown">
                {matchingNavItems.length > 0 ? (
                  <div>
                    <div className="search-group-title">Navigation Sections</div>
                    {matchingNavItems.map((item) => (
                      <button
                        key={item.id}
                        className="search-item"
                        onClick={() => {
                          setSearchQuery('')
                          setSearchResults(null)
                          setTargetWorkflowId(null)
                          setRoute(item.id)
                        }}
                        type="button"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                      >
                        {item.icon}
                        <strong>{item.label}</strong>
                      </button>
                    ))}
                  </div>
                ) : null}

                {searchResults?.clients && searchResults.clients.length > 0 ? (
                  <div>
                    <div className="search-group-title">{currentUser?.role === 'team_member' ? 'Brands' : 'Clients'}</div>
                    {searchResults.clients.map((c) => (
                      <button key={c.id} className="search-item" onClick={() => handleSearchResultClick('client', c)} type="button">
                        <strong>{c.name}</strong>
                      </button>
                    ))}
                  </div>
                ) : null}
                {searchResults?.workflows && searchResults.workflows.length > 0 ? (
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
                {searchResults?.tasks && searchResults.tasks.length > 0 ? (
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
                {searchResults?.blockers && searchResults.blockers.length > 0 ? (
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
                {searchResults?.users && searchResults.users.length > 0 ? (
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
                {searchResults &&
                searchResults.clients.length === 0 &&
                searchResults.workflows.length === 0 &&
                searchResults.tasks.length === 0 &&
                searchResults.blockers.length === 0 &&
                searchResults.users.length === 0 &&
                matchingNavItems.length === 0 ? (
                  <div style={{ padding: '8px', fontSize: '12px', color: 'var(--muted)', textAlign: 'center' }}>
                    No results found.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <NotificationsBell />
          <label className="switch" title="Toggle theme">
            <input
              id="theme-toggle-input"
              type="checkbox"
              checked={theme === 'dark'}
              onChange={toggleTheme}
            />
            <div className="slider round">
              <div className="sun-moon">
                <svg id="moon-dot-1" className="moon-dot" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="50"></circle>
                </svg>
                <svg id="moon-dot-2" className="moon-dot" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="50"></circle>
                </svg>
                <svg id="moon-dot-3" className="moon-dot" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="50"></circle>
                </svg>
                <svg id="light-ray-1" className="light-ray" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="50"></circle>
                </svg>
                <svg id="light-ray-2" className="light-ray" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="50"></circle>
                </svg>
                <svg id="light-ray-3" className="light-ray" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="50"></circle>
                </svg>

                <svg id="cloud-1" className="cloud-dark" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="50"></circle>
                </svg>
                <svg id="cloud-2" className="cloud-dark" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="50"></circle>
                </svg>
                <svg id="cloud-3" className="cloud-dark" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="50"></circle>
                </svg>
                <svg id="cloud-4" className="cloud-light" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="50"></circle>
                </svg>
                <svg id="cloud-5" className="cloud-light" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="50"></circle>
                </svg>
                <svg id="cloud-6" className="cloud-light" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="50"></circle>
                </svg>
              </div>
              <div className="stars">
                <svg id="star-1" className="star" viewBox="0 0 20 20">
                  <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
                </svg>
                <svg id="star-2" className="star" viewBox="0 0 20 20">
                  <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
                </svg>
                <svg id="star-3" className="star" viewBox="0 0 20 20">
                  <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
                </svg>
                <svg id="star-4" className="star" viewBox="0 0 20 20">
                  <path d="M 0 10 C 10 10,10 10 ,0 10 C 10 10 , 10 10 , 10 20 C 10 10 , 10 10 , 20 10 C 10 10 , 10 10 , 10 0 C 10 10,10 10 ,0 10 Z"></path>
                </svg>
              </div>
            </div>
          </label>
          <button className="logout-button" data-testid="button-logout" onClick={signOut} type="button">
            <Logout size={16} />
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
          {activeRoute === 'integrations' ? <IntegrationsPage /> : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
      <AiChatWidget />
    </div>
  )
}
