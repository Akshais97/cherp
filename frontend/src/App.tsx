import { AppProviders } from './app/providers/AppProviders'
import { useAuth } from './app/providers/useAuth'
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './features/auth/LoginPage'
import './App.css'

function AppContent() {
  const { currentUser, isLoading } = useAuth()

  if (isLoading) {
    return <div className="boot-screen">Loading command center...</div>
  }

  return currentUser ? <AppShell /> : <LoginPage />
}

function App() {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  )
}

export default App
