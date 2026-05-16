import { AppProviders } from './app/providers/AppProviders'
import { useAuth } from './app/providers/useAuth'
import { AppErrorBoundary } from './components/common/AppErrorBoundary'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './features/auth/LoginPage'
import './App.css'

function AppContent() {
  const { currentUser, isLoading } = useAuth()

  if (isLoading) {
    return <div className="boot-screen" data-testid="app-loading">Loading command center...</div>
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
