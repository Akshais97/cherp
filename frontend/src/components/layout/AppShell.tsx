import {
  AlertTriangle,
  BriefcaseBusiness,
  LayoutDashboard,
  LogOut,
  Search,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../app/providers/useAuth'
import { roleLabels } from '../../lib/permissions/roles'
import { ComingSoon } from '../shared/ComingSoon'
import { DashboardPage } from '../../features/dashboard/DashboardPage'

type AppRoute = 'dashboard' | 'clients' | 'workflows' | 'blockers'

const navItems: {
  id: AppRoute
  label: string
  icon: React.ReactNode
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={17} /> },
  { id: 'clients', label: 'Clients', icon: <Users size={17} /> },
  {
    id: 'workflows',
    label: 'Workflows',
    icon: <BriefcaseBusiness size={17} />,
  },
  { id: 'blockers', label: 'Blockers', icon: <AlertTriangle size={17} /> },
]

export function AppShell() {
  const [route, setRoute] = useState<AppRoute>('dashboard')
  const { currentUser, signOut } = useAuth()
  const initials = currentUser?.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="shell-brand">
          <strong>Command Center</strong>
          <span>Agency ERP</span>
        </div>

        <nav aria-label="Primary navigation">
          <p>Operations</p>
          {navItems.map((item) => (
            <button
              className={route === item.id ? 'active' : ''}
              key={item.id}
              onClick={() => setRoute(item.id)}
              type="button"
            >
              {item.icon}
              {item.label}
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
          <div className="search-box">
            <Search size={16} />
            <input placeholder="Search clients, workflows, blockers..." />
          </div>
          <button className="logout-button" onClick={signOut} type="button">
            <LogOut size={16} />
            Logout
          </button>
        </header>

        <div className="content-area">
          {route === 'dashboard' ? <DashboardPage /> : null}
          {route === 'clients' ? <ComingSoon title="Clients" /> : null}
          {route === 'workflows' ? <ComingSoon title="Workflows" /> : null}
          {route === 'blockers' ? <ComingSoon title="Blockers" /> : null}
        </div>
      </main>
    </div>
  )
}
