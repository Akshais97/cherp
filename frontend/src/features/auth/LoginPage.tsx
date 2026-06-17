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
import { normalizeApiError } from '../../lib/api/errors'
import { loginSchema, type LoginFormValues } from '../../schemas/auth'
import { requestPasswordReset } from './api'
import { SoftAurora } from '../../components/ui/SoftAurora'
import { Noise } from '../../components/ui/Noise'
import { SpotlightCard } from '../../components/ui/SpotlightCard'
import { RotatingText } from '../../components/ui/RotatingText'
import { ShinyText } from '../../components/ui/ShinyText'
import { Magnet } from '../../components/ui/Magnet'

const ROTATING_TEXTS = ['Outcomes.', 'Visibility.', 'Accountability.', 'Efficiency.']

export function LoginPage() {
  const { signIn, isConfigured } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [formMessage, setFormMessage] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    getValues,
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
    setFormMessage(null)

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

  async function onForgotPassword() {
    setFormError(null)
    setFormMessage(null)

    try {
      const response = await requestPasswordReset(getValues('email'))
      setFormMessage(response.message)
    } catch (error) {
      setFormError(normalizeApiError(error).message)
    }
  }

  return (
    <main className="login-page" data-testid="login-page">
      <section className="login-story" aria-label="Product overview">
        <SoftAurora>
          <Noise />
          <div className="login-story-content">
            <div className="brand-mark">
              <img alt="Saarthii Cherp" className="brand-icon" src="/cherp-logo.png" />
              <div>
                <h1>
                  <ShinyText text="Saarthii Cherp" speed={6} />
                </h1>
                <p>
                  <ShinyText text="ENTERPRISE RESOURCE PLANNING" speed={6} />
                </p>
              </div>
            </div>

            <div className="login-copy">
              <h2>
                Intelligence. Operations.
                <br />
                <RotatingText
                  texts={ROTATING_TEXTS}
                  interval={3000}
                />
              </h2>
              <p>
                Unified execution for client onboarding, Month 1 workflows,
                operational blockers, and internal delivery visibility.
              </p>

              <div className="login-benefits">
                <SpotlightCard className="feature-card-spotlight">
                  <Feature
                    icon={<BarChart3 size={18} />}
                    title="Operational dashboard"
                    text="Live summaries for active clients, workflows, tasks, and blockers."
                  />
                </SpotlightCard>
                <SpotlightCard className="feature-card-spotlight">
                  <Feature
                    icon={<CheckCircle2 size={18} />}
                    title="Workflow accountability"
                    text="Phase 1 task status, ownership, and completion signals stay clear."
                  />
                </SpotlightCard>
                <SpotlightCard className="feature-card-spotlight">
                  <Feature
                    icon={<ShieldCheck size={18} />}
                    title="RBAC from day one"
                    text="Super Admin, Project Manager, Team Member, and Client roles are explicit."
                  />
                </SpotlightCard>
              </div>
            </div>
          </div>
        </SoftAurora>
      </section>

      <section className="login-panel" aria-label="Sign in form">
        <SpotlightCard
          as="form"
          className="login-card-spotlight-wrapper"
          data-testid="login-form"
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="login-card-icon">
            <LockKeyhole size={30} />
          </div>
          <div className="form-heading">
            <h2>Welcome Back</h2>
            <p>Sign in with your Saarthii Cherp account.</p>
          </div>

          {!isConfigured ? (
            <div className="notice error">
              Supabase environment variables are required before authentication
              can complete.
            </div>
          ) : null}

          {formError ? <div className="notice error">{formError}</div> : null}
          {formMessage ? <div className="notice success">{formMessage}</div> : null}

          <label className="field">
            <span>Email Address</span>
            <div className="field-control">
              <UserRound size={18} />
              <input
                autoComplete="email"
                data-testid="input-email"
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
                data-testid="input-password"
                placeholder="Enter your password"
                type="password"
                {...register('password')}
              />
            </div>
            {errors.password ? <small>{errors.password.message}</small> : null}
          </label>

          <label className="check-field">
            <input data-testid="input-remember-me" type="checkbox" {...register('rememberMe')} />
            <span>Remember this device</span>
          </label>

          <Magnet className="magnet-button-wrapper">
            <button className="primary-action" data-testid="button-sign-in" disabled={isSubmitting} type="submit">
              <LogIn size={18} />
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </Magnet>

          <button
            className="ghost-button full-width"
            data-testid="button-password-reset"
            disabled={isSubmitting}
            onClick={onForgotPassword}
            type="button"
          >
            Send password reset email
          </button>

          <p className="admin-note">
            Need access? Contact your system administrator to create an account.
          </p>
        </SpotlightCard>
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
