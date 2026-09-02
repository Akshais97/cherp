import {
  AlertTriangle,
  AngleDown,
  AngleRight,
  Briefcase,
  Calendar,
  Category2,
  ChartBar,
  ChartBarTrendUp,
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
import { lazy, Suspense, useEffect, useState } from 'react'
import { useAuth } from '../../app/providers/useAuth'
import { useTheme } from '../../app/providers/ThemeContext'
import { NotificationsBell } from '../../features/notifications/NotificationsBell'
import { AiChatWidget } from '../../features/ai-chat/AiChatWidget'
import {
  canManageClients,
  canManageUsers,
  canViewTeamMembers,
  roleLabels,
} from '../../lib/permissions/roles'
import { DashboardPage } from '../../features/dashboard/DashboardPage'
import { searchWorkspace, type SearchResult } from '../../features/dashboard/api'
import { type NotificationRow } from '../../features/notifications/api'

const AnalyticsPage = lazyPage(() => import('../../features/analytics/AnalyticsPage'), 'AnalyticsPage')
const BrandsPage = lazyPage(() => import('../../features/brands/BrandsPage'), 'BrandsPage')
const BlockersPage = lazyPage(() => import('../../features/blockers/BlockersPage'), 'BlockersPage')
const ClientDirectoryPage = lazyPage(() => import('../../features/clients/ClientDirectoryPage'), 'ClientDirectoryPage')
const ClientsPage = lazyPage(() => import('../../features/clients/ClientsPage'), 'ClientsPage')
const TeamMembersPage = lazyPage(() => import('../../features/users/TeamMembersPage'), 'TeamMembersPage')
const TasksOverviewPage = lazyPage(() => import('../../features/tasks/TasksOverviewPage'), 'TasksOverviewPage')
const EmployeeProfilesPage = lazyPage(() => import('../../features/profiles/EmployeeProfilesPage'), 'EmployeeProfilesPage')
const UserManagementPage = lazyPage(() => import('../../features/users/UserManagementPage'), 'UserManagementPage')
const WorkflowsPage = lazyPage(() => import('../../features/workflows/WorkflowsPage'), 'WorkflowsPage')
const CalendarPage = lazyPage(() => import('../../features/calendar/CalendarPage'), 'CalendarPage')
const ClientDashboardPage = lazyPage(() => import('../../features/dashboard/ClientDashboardPage'), 'ClientDashboardPage')
const ScopeTemplatesPage = lazyPage(() => import('../../features/clients/ScopeTemplatesPage'), 'ScopeTemplatesPage')
const DailyTaskReportPage = lazyPage(() => import('../../features/tasks/DailyTaskReportPage'), 'DailyTaskReportPage')
const IntegrationsPage = lazyPage(() => import('../../features/integrations/IntegrationsPage'), 'IntegrationsPage')
const AuditLogPage = lazyPage(() => import('../../features/activity-logs/AuditLogPage'), 'AuditLogPage')
const TimeTrackingPage = lazyPage(() => import('../../features/time-entries/TimeTrackingPage'), 'TimeTrackingPage')
const NotificationPreferencesPage = lazyPage(() => import('../../features/notifications/NotificationPreferencesPage'), 'NotificationPreferencesPage')
const ReportingHubPage = lazyPage(() => import('../../features/reporting/ReportingHubPage'), 'ReportingHubPage')
const AdIntegrationsPage = lazyPage(() => import('../../features/integrations/AdIntegrationsPage'), 'AdIntegrationsPage')

function lazyPage<TModule, TKey extends keyof TModule>(
  loader: () => Promise<TModule>,
  exportName: TKey,
) {
  return lazy(async () => ({ default: (await loader())[exportName] as React.ComponentType<any> }))
}

type AppRoute =
  | 'dashboard'
  | 'clients'
  | 'workflows'
  | 'blockers'
  | 'tasks'
  | 'brands'
  | 'analytics'
  | 'reporting-hub'
  | 'employee-profiles'
  | 'users'
  | 'client-directory'
  | 'team-members'
  | 'calendar'
  | 'client-dashboard'
  | 'scope-templates'
  | 'daily-report'
  | 'integrations'
  | 'ad-integrations'
  | 'audit-logs'
  | 'time-tracking'
  | 'notification-preferences'

const routeToPathMap: Record<AppRoute, string> = {
  dashboard: '/dashboard',
  'client-dashboard': '/client-dashboard',
  'daily-report': '/daily-report',
  tasks: '/tasks',
  'time-tracking': '/time-tracking',
  calendar: '/calendar',
  'client-directory': '/clients/directory',
  clients: '/clients/onboarding',
  workflows: '/workflows',
  'scope-templates': '/scope-templates',
  brands: '/brands',
  'team-members': '/team-members',
  'employee-profiles': '/employee-profiles',
  analytics: '/analytics',
  'reporting-hub': '/reporting-hub',
  blockers: '/blockers',
  users: '/users',
  integrations: '/integrations',
  'ad-integrations': '/ad-platform-integrations',
  'audit-logs': '/audit-logs',
  'notification-preferences': '/notification-settings',
}

const pathToRouteMap: Record<string, AppRoute> = {
  '/': 'dashboard',
  '/dashboard': 'dashboard',
  '/client-dashboard': 'client-dashboard',
  '/daily-report': 'daily-report',
  '/tasks': 'tasks',
  '/time-tracking': 'time-tracking',
  '/calendar': 'calendar',
  '/clients/directory': 'client-directory',
  '/clients/onboarding': 'clients',
  '/clients': 'clients',
  '/workflows': 'workflows',
  '/scope-templates': 'scope-templates',
  '/brands': 'brands',
  '/team-members': 'team-members',
  '/employee-profiles': 'employee-profiles',
  '/analytics': 'analytics',
  '/reporting-hub': 'reporting-hub',
  '/blockers': 'blockers',
  '/users': 'users',
  '/integrations': 'integrations',
  '/ad-platform-integrations': 'ad-integrations',
  '/ad-integrations': 'ad-integrations',
  '/audit-logs': 'audit-logs',
  '/notification-settings': 'notification-preferences',
}

const baseNavItems: {
  id: AppRoute
  label: string
  icon: React.ReactNode
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Layout size={18} /> },
  { id: 'client-dashboard', label: 'Client Dashboard', icon: <Home size={18} /> },
  { id: 'daily-report', label: 'Daily Report', icon: <File size={18} /> },
  { id: 'tasks', label: 'Tasks', icon: <ClipboardList size={18} /> },
  { id: 'time-tracking', label: 'Time Tracking', icon: <Briefcase size={18} /> },
  { id: 'calendar', label: 'Calendar', icon: <Calendar size={18} /> },
  { id: 'client-directory', label: 'Client Directory', icon: <FolderOpen size={18} /> },
  { id: 'brands', label: 'Brands', icon: <Palette size={18} /> },
  { id: 'reporting-hub', label: 'Reporting Hub', icon: <ChartBarTrendUp size={18} /> },
  { id: 'analytics', label: 'Analytics', icon: <ChartBar size={18} /> },
  { id: 'workflows', label: 'Workflows', icon: <Briefcase size={18} /> },
  { id: 'scope-templates', label: 'Scope Templates', icon: <Layers size={18} /> },
  { id: 'team-members', label: 'Team Members', icon: <UserCheck size={18} /> },
  { id: 'employee-profiles', label: 'Employee Profiles', icon: <Personalcard size={18} /> },
  { id: 'blockers', label: 'Blockers', icon: <AlertTriangle size={18} /> },
  { id: 'users', label: 'Users', icon: <Users size={18} /> },
  { id: 'integrations', label: 'Integrations', icon: <Plug size={18} /> },
  { id: 'ad-integrations', label: 'PPC Ad Connectors', icon: <Layers size={18} /> },
  { id: 'audit-logs', label: 'Audit Logs', icon: <File size={18} /> },
  { id: 'notification-preferences', label: 'Notification Settings', icon: <Settings size={18} /> },
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
    items: ['dashboard', 'client-dashboard', 'daily-report', 'tasks', 'time-tracking', 'calendar', 'blockers']
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
    items: ['team-members', 'employee-profiles', 'reporting-hub', 'analytics']
  },
  {
    id: 'system-settings',
    label: 'System & Security',
    icon: <Settings size={15} />,
    items: ['users', 'integrations', 'ad-integrations', 'audit-logs', 'notification-preferences']
  }
]

export function AppShell() {
  const { currentUser, signOut } = useAuth()
  
  // Initialize route from current browser URL path if matched
  const initialPathRoute = pathToRouteMap[window.location.pathname]
  const [route, setRouteState] = useState<AppRoute>(
    initialPathRoute || (currentUser?.role === 'client' ? 'client-dashboard' : 'dashboard')
  )

  const [targetWorkflowId, setTargetWorkflowId] = useState<string | null>(null)
  const [targetTaskId, setTargetTaskId] = useState<string | null>(null)
  const [targetBlockerId, setTargetBlockerId] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  // Function to change route and push URL to browser history
  const setRoute = (nextRoute: AppRoute) => {
    setRouteState(nextRoute)
    const targetPath = routeToPathMap[nextRoute] || '/dashboard'
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath)
    }
  }

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const matched = pathToRouteMap[window.location.pathname]
      if (matched) {
        setRouteState(matched)
      }
    }
    window.addEventListener('popstate', handlePopState)

    // Sync browser URL on initial load if needed
    const currentPath = window.location.pathname
    const matchedRoute = pathToRouteMap[currentPath]
    if (matchedRoute) {
      setRouteState(matchedRoute)
    } else {
      const defaultPath = routeToPathMap[route] || '/dashboard'
      window.history.replaceState({}, '', defaultPath)
    }

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleNotificationClick = (notification: NotificationRow) => {
    const type = notification.related_entity_type
    const id = notification.related_entity_id

    if (type === 'task' && id) {
      setTargetTaskId(id)
      setRoute('tasks')
    } else if (type === 'blocker' && id) {
      setTargetBlockerId(id)
      setRoute('blockers')
    } else if (type === 'workflow' && id) {
      setTargetWorkflowId(id)
      setRoute('workflows')
    } else if (type === 'client' && id) {
      if (currentUser?.role === 'team_member') {
        setRoute('brands')
      } else {
        setRoute('client-directory')
      }
    } else if (notification.type === 'daily_report' || notification.title?.toLowerCase().includes('daily')) {
      setRoute('daily-report')
    } else {
      setRoute('dashboard')
    }
  }

  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    workspace: false,
    'clients-delivery': false,
    'team-performance': false,
    'system-settings': false,
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
        item.id === 'scope-templates' ||
        item.id === 'users' ||
        item.id === 'integrations'
      ) {
        return false
      }
    }
    if (currentUser?.role === 'project_manager') {
      if (item.id === 'users' || item.id === 'integrations') {
        return false
      }
    }
    if (item.id === 'integrations' && currentUser?.role !== 'super_admin') {
      return false
    }
    if (item.id === 'users' && (!currentUser?.role || !canManageUsers(currentUser.role))) {
      return false
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

  const finalNavItems = [...operationalNavItems]

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
    (route === 'team-members' && !canViewTeamMemberRoutes) ||
    (route === 'integrations' && currentUser?.role !== 'super_admin') ||
    (route === 'users' && (!currentUser?.role || !canManageUsers(currentUser.role)))
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

            const isExpanded = sidebarCollapsed || Boolean(expandedSections[section.id]) || section.items.includes(activeRoute)

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
          <NotificationsBell onNotificationClick={handleNotificationClick} />
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
          <Suspense fallback={<div className="boot-screen">Loading page...</div>}>
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
          {activeRoute === 'tasks' ? <TasksOverviewPage initialTaskId={targetTaskId} /> : null}
          {activeRoute === 'calendar' ? <CalendarPage /> : null}
          {activeRoute === 'brands' ? <BrandsPage /> : null}
          {activeRoute === 'analytics' ? <AnalyticsPage /> : null}
          {activeRoute === 'reporting-hub' ? <ReportingHubPage /> : null}
          {activeRoute === 'employee-profiles' ? <EmployeeProfilesPage /> : null}
          {activeRoute === 'client-directory' ? <ClientDirectoryPage /> : null}
          {activeRoute === 'team-members' ? <TeamMembersPage /> : null}
          {activeRoute === 'workflows' ? <WorkflowsPage initialWorkflowId={targetWorkflowId} /> : null}
          {activeRoute === 'blockers' ? <BlockersPage initialBlockerId={targetBlockerId} /> : null}
          {activeRoute === 'users' ? <UserManagementPage /> : null}
          {activeRoute === 'client-dashboard' ? <ClientDashboardPage /> : null}
          {activeRoute === 'scope-templates' ? <ScopeTemplatesPage /> : null}
          {activeRoute === 'daily-report' ? <DailyTaskReportPage /> : null}
          {activeRoute === 'integrations' ? <IntegrationsPage /> : null}
          {activeRoute === 'ad-integrations' ? <AdIntegrationsPage /> : null}
          {activeRoute === 'audit-logs' ? <AuditLogPage /> : null}
          {activeRoute === 'time-tracking' ? <TimeTrackingPage /> : null}
          {activeRoute === 'notification-preferences' ? <NotificationPreferencesPage /> : null}
              </motion.div>
            </AnimatePresence>
          </Suspense>
        </div>
      </main>
      <AiChatWidget />
    </div>
  )
}
