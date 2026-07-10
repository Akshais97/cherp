import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './AuthProvider'
import { ThemeProvider } from './ThemeContext'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
    },
  },
})

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>{children}</AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}
