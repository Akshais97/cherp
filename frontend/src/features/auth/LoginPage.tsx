import { zodResolver } from '@hookform/resolvers/zod'
import {
  BarChart3,
  CheckCircle2,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../app/providers/useAuth'
import { loginSchema, type LoginFormValues } from '../../schemas/auth'

export function LoginPage() {
  const { signIn, isConfigured } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
  })

  async function onSubmit(values: LoginFormValues) {
    setFormError(null)

    try {
      await signIn(values.email, values.password)
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Unable to sign in. Please try again.',
      )
    }
  }

  return (
    <main className="login-page">
      <section className="login-story" aria-label="Product overview">
        <div className="brand-mark">
          <div className="brand-icon">A</div>
          <div>
            <h1>Marketing Command Center</h1>
            <p>Enterprise Resource Planning</p>
          </div>
        </div>

        <div className="login-copy">
          <h2>
            Intelligence. Operations.
            <span> Outcomes.</span>
          </h2>
          <p>
            Unified execution for client onboarding, Month 1 workflows,
            operational blockers, and internal delivery visibility.
          </p>

          <div className="login-benefits">
            <Feature
              icon={<BarChart3 size={18} />}
              title="Operational dashboard"
              text="Live summaries for active clients, workflows, tasks, and blockers."
            />
            <Feature
              icon={<CheckCircle2 size={18} />}
              title="Workflow accountability"
              text="Phase 1 task status, ownership, and completion signals stay clear."
            />
            <Feature
              icon={<ShieldCheck size={18} />}
              title="RBAC from day one"
              text="Super Admin, Project Manager, Team Member, and Client roles are explicit."
            />
          </div>
        </div>
      </section>

      <section className="login-panel" aria-label="Sign in form">
        <form className="login-card" onSubmit={handleSubmit(onSubmit)}>
          <div className="login-card-icon">
            <LockKeyhole size={30} />
          </div>
          <div className="form-heading">
            <h2>Welcome Back</h2>
            <p>Sign in with your agency account.</p>
          </div>

          {!isConfigured ? (
            <div className="notice error">
              Supabase environment variables are required before authentication
              can complete.
            </div>
          ) : null}

          {formError ? <div className="notice error">{formError}</div> : null}

          <label className="field">
            <span>Email Address</span>
            <div className="field-control">
              <UserRound size={18} />
              <input
                autoComplete="email"
                placeholder="you@agency.com"
                type="email"
                {...register('email')}
              />
            </div>
            {errors.email ? <small>{errors.email.message}</small> : null}
          </label>

          <label className="field">
            <span>Password</span>
            <div className="field-control">
              <LockKeyhole size={18} />
              <input
                autoComplete="current-password"
                placeholder="Enter your password"
                type="password"
                {...register('password')}
              />
            </div>
            {errors.password ? <small>{errors.password.message}</small> : null}
          </label>

          <label className="check-field">
            <input type="checkbox" {...register('rememberMe')} />
            <span>Remember this device</span>
          </label>

          <button className="primary-action" disabled={isSubmitting} type="submit">
            <LogIn size={18} />
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="admin-note">
            Need access? Contact your system administrator to create an account.
          </p>
        </form>
      </section>
    </main>
  )
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode
  title: string
  text: string
}) {
  return (
    <article className="feature-row">
      <div>{icon}</div>
      <span>
        <strong>{title}</strong>
        <p>{text}</p>
      </span>
    </article>
  )
}
