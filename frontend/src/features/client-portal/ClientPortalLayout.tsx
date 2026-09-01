import { useAuth } from '../../app/providers/useAuth'
import { ShieldCheck, LogOut, CheckCircle2, Clock, Download } from 'lucide-react'

interface ClientPortalLayoutProps {
  activeTab: 'overview' | 'today' | 'downloads'
  onTabChange: (tab: 'overview' | 'today' | 'downloads') => void
}

export function ClientPortalLayout({ activeTab, onTabChange }: ClientPortalLayoutProps) {
  const { currentUser, signOut } = useAuth()

  return (
    <div className="client-portal-layout" style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      {/* Client Portal Isolated Top Navbar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 32px',
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--accent-light, #EEF4FF)', padding: '8px', borderRadius: '8px' }}>
            <ShieldCheck size={24} style={{ color: 'var(--accent, #3B6DD6)' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--text)' }}>
              Cherp Client Portal
            </h1>
            <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>
              Brand Portal • {currentUser?.name || currentUser?.email}
            </span>
          </div>
        </div>

        <button
          onClick={signOut}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 14px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            color: 'var(--text)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <LogOut size={15} />
          Sign Out
        </button>
      </header>

      {/* Navigation Sub-header Tabs */}
      <nav
        style={{
          display: 'flex',
          gap: '24px',
          padding: '0 32px',
          background: 'var(--card)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          type="button"
          onClick={() => onTabChange('overview')}
          style={{
            padding: '12px 4px',
            fontSize: '13px',
            fontWeight: '600',
            color: activeTab === 'overview' ? 'var(--accent)' : 'var(--secondary-text)',
            borderBottom: activeTab === 'overview' ? '2px solid var(--accent)' : '2px solid transparent',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <CheckCircle2 size={16} />
          Overview
        </button>

        <button
          type="button"
          onClick={() => onTabChange('today')}
          style={{
            padding: '12px 4px',
            fontSize: '13px',
            fontWeight: '600',
            color: activeTab === 'today' ? 'var(--accent)' : 'var(--secondary-text)',
            borderBottom: activeTab === 'today' ? '2px solid var(--accent)' : '2px solid transparent',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Clock size={16} />
          Today's Work
        </button>

        <button
          type="button"
          onClick={() => onTabChange('downloads')}
          style={{
            padding: '12px 4px',
            fontSize: '13px',
            fontWeight: '600',
            color: activeTab === 'downloads' ? 'var(--accent)' : 'var(--secondary-text)',
            borderBottom: activeTab === 'downloads' ? '2px solid var(--accent)' : '2px solid transparent',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Download size={16} />
          Reports & Assets
        </button>
      </nav>
    </div>
  )
}
