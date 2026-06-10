import { useEffect } from 'react'
import { AppProviders } from './app/providers/AppProviders'
import { useAuth } from './app/providers/useAuth'
import { AppErrorBoundary } from './components/common/AppErrorBoundary'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './features/auth/LoginPage'
import './App.css'

function AppContent() {
  const { currentUser, isLoading } = useAuth()

  useEffect(() => {
    const handleMouseOver = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest(
        'button, .primary-action, .ghost-button, .logout-button, .dashboard-list-item'
      ) as HTMLElement
      if (!btn) return

      let ripple = btn.querySelector('.btn-ripple') as HTMLElement
      if (!ripple) {
        ripple = document.createElement('span')
        ripple.className = 'btn-ripple'
        btn.appendChild(ripple)
        btn.style.position = 'relative'
        btn.style.overflow = 'hidden'
      }

      const rect = btn.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      ripple.style.left = `${x}px`
      ripple.style.top = `${y}px`
    }

    const handleMouseOut = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement).closest(
        'button, .primary-action, .ghost-button, .logout-button, .dashboard-list-item'
      ) as HTMLElement
      if (!btn) return

      const ripple = btn.querySelector('.btn-ripple') as HTMLElement
      if (ripple) {
        const rect = btn.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        ripple.style.left = `${x}px`
        ripple.style.top = `${y}px`
      }
    }

    document.body.addEventListener('mouseover', handleMouseOver)
    document.body.addEventListener('mouseout', handleMouseOut)

    return () => {
      document.body.removeEventListener('mouseover', handleMouseOver)
      document.body.removeEventListener('mouseout', handleMouseOut)
    }
  }, [])

  if (isLoading) {
    return <div className="boot-screen" data-testid="app-loading">Loading Sakhaa Cherp...</div>
  }

  return currentUser ? <AppShell /> : <LoginPage />
}

function App() {
  return (
    <AppProviders>
      <AppErrorBoundary>
        <AppContent />
      </AppErrorBoundary>
    </AppProviders>
  )
}

export default App
