import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

type AppErrorBoundaryProps = {
  children: ReactNode
}

type AppErrorBoundaryState = {
  error: Error | null
}

export class AppErrorBoundary extends Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Saarthii Cherp UI boundary caught an error', {
      error,
      componentStack: info.componentStack,
    })
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <main className="app-error-boundary" data-testid="app-error-boundary">
        <section className="panel app-error-card">
          <AlertTriangle size={24} />
          <div>
            <p>Interface error</p>
            <h1>Something in this view failed to render.</h1>
            <span>
              The session is still active. Reset the view and try again.
            </span>
          </div>
          <button
            className="primary-action compact"
            onClick={() => this.setState({ error: null })}
            type="button"
          >
            <RotateCcw size={16} />
            Reset view
          </button>
        </section>
      </main>
    )
  }
}
