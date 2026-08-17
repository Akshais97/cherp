import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Plus,
  Sparkles,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useAuth } from '../../app/providers/useAuth'
import { normalizeApiError } from '../../lib/api/errors'
import { canManageClients } from '../../lib/permissions/roles'
import {
  createClient,
  getScopeTemplates,
  seedScopeTemplates,
  type ScopeTemplate,
} from './api'
import { getUsers } from '../users/api'
import {
  clientOnboardingSchema,
  type ClientOnboardingInput,
  type ClientOnboardingValues,
} from './clientSchemas'

type OnboardingStep = 'client_details' | 'scope_templates' | 'team_mapping' | 'review'

const clientDetailFields: Array<keyof ClientOnboardingInput> = [
  'name',
  'contact_email',
  'contact_name',
  'contact_phone',
  'monthly_retainer',
  'currency',
  'contract_start',
  'contract_duration',
  'payment_terms',
  'renewal_date',
]

const onboardingSteps: Array<{ id: OnboardingStep; label: string }> = [
  { id: 'client_details', label: 'Client Details' },
  { id: 'scope_templates', label: 'Scope Templates' },
  { id: 'team_mapping', label: 'Team Mapping' },
  { id: 'review', label: 'Review' },
]

const defaultOnboardingValues: Partial<ClientOnboardingInput> = {
  currency: 'INR',
  contract_duration: 3,
  contract_start: new Date().toISOString().slice(0, 10),
  team_assignments: {},
}

export function ClientsPage() {
  const queryClient = useQueryClient()
  const { currentUser } = useAuth()
  const canManage = currentUser ? canManageClients(currentUser.role) : false
  const [pageError, setPageError] = useState<string | null>(null)
  const { data: templatesData, error: templatesQueryError } = useQuery({
    queryKey: ['scope-templates'],
    queryFn: getScopeTemplates,
    enabled: canManage,
  })
  const seedMutation = useMutation({
    mutationFn: seedScopeTemplates,
    onSuccess: () => {
      setPageError(null)
      queryClient.invalidateQueries({ queryKey: ['scope-templates'] })
    },
    onError: (error) => setPageError(normalizeApiError(error).message),
  })

  const templates = canManage ? templatesData ?? [] : []
  const templatesError = canManage && templatesQueryError
    ? normalizeApiError(templatesQueryError).message
    : null

  return (
    <section className="clients-page" data-testid="clients-page">
      <div className="page-heading">
        <div>
          <p>Client onboarding</p>
          <h1>Onboarding</h1>
        </div>
        <span className="pill">Slice 1 and 2 closure</span>
      </div>

      {pageError || templatesError ? (
        <div className="notice error">
          {pageError ?? templatesError}
        </div>
      ) : null}

      {canManage && templates.length === 0 ? (
        <section className="panel empty-panel">
          <Sparkles size={22} />
          <div>
            <h2>Seed Phase 1 scope templates</h2>
            <p>Load the mandatory industry presets before onboarding clients.</p>
          </div>
          <button
            className="primary-action compact"
            data-testid="button-seed-templates"
            disabled={seedMutation.isPending}
            onClick={() => seedMutation.mutate()}
            type="button"
          >
            {seedMutation.isPending ? 'Seeding...' : 'Seed templates'}
          </button>
        </section>
      ) : null}

      <div className="onboarding-grid">
        {canManage ? <ClientOnboardingForm templates={templates} /> : null}
      </div>
    </section>
  )
}

function ClientOnboardingForm({ templates }: { templates: ScopeTemplate[] }) {
  const queryClient = useQueryClient()
  const [step, setStep] = useState<OnboardingStep>('client_details')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    reset,
    formState: { errors },
  } = useForm<ClientOnboardingInput, unknown, ClientOnboardingValues>({
    resolver: zodResolver(clientOnboardingSchema),
    defaultValues: defaultOnboardingValues,
  })
  const formValues = useWatch({ control })
  const selectedTemplateId = useWatch({ control, name: 'scope_template_id' })
  const selectedTemplate = templates.find(
    (template) => template.id === selectedTemplateId,
  )
  const contractStart = useWatch({ control, name: 'contract_start' })
  const contractDuration = useWatch({ control, name: 'contract_duration' })
  const teamAssignments = (useWatch({ control, name: 'team_assignments' }) as Record<string, string[]> | undefined) || {}

  const createMutation = useMutation({
    mutationFn: createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setSubmitError(null)
      setSubmitSuccess('Client has been created and workflow tasks auto-assigned to team members!')
      reset(defaultOnboardingValues)
      setStep('client_details')
    },
    onError: (error) => {
      setSubmitSuccess(null)
      setSubmitError(formatClientCreationError(error))
    },
  })

  const contractEnd = useMemo(() => {
    return calculateContractEnd(contractStart, contractDuration)
  }, [contractStart, contractDuration])

  useEffect(() => {
    if (!selectedTemplate) return
    setValue('contract_duration', selectedTemplate.duration_months)
  }, [selectedTemplate, setValue])

  function submit(values: ClientOnboardingValues) {
    createMutation.mutate({
      ...values,
      industry: selectedTemplate?.industry ?? '',
      service_type: selectedTemplate?.service_type ?? '',
      team_assignments: teamAssignments,
    })
  }

  async function goToScopeTemplates() {
    if (await trigger(clientDetailFields)) {
      setSubmitError(null)
      setSubmitSuccess(null)
      setStep('scope_templates')
    }
  }

  async function goToTeamMapping() {
    if (await trigger('scope_template_id')) {
      setSubmitError(null)
      setSubmitSuccess(null)
      setStep('team_mapping')
    }
  }

  async function goToReview() {
    setSubmitError(null)
    setSubmitSuccess(null)
    setStep('review')
  }

  return (
    <form className="panel onboarding-panel" data-testid="client-onboarding-form" onSubmit={handleSubmit(submit)}>
      <div className="panel-header">
        <h2>New client</h2>
        <Plus size={18} />
      </div>

      {createMutation.isPending ? (
        <div className="notice" data-testid="alert-client-creation-pending" role="status">
          Creating client & generating workflow tasks...
        </div>
      ) : null}
      {submitError ? (
        <div className="notice error" data-testid="alert-client-creation-error" role="alert">
          {submitError}
        </div>
      ) : null}
      {submitSuccess ? (
        <div className="notice success" data-testid="alert-client-creation" role="status">
          {submitSuccess}
        </div>
      ) : null}

      <div className="stepper" aria-label="Client onboarding steps">
        {onboardingSteps.map((item, index) => {
          const activeIndex = onboardingSteps.findIndex((inner) => inner.id === step)
          return (
            <div
              className={index === activeIndex ? 'stepper-item active' : index < activeIndex ? 'stepper-item complete' : 'stepper-item'}
              key={item.id}
            >
              <span>{index + 1}</span>
              {item.label}
            </div>
          )
        })}
      </div>

      {step === 'client_details' ? (
        <section className="onboarding-step" data-testid="onboarding-step-client-details">
          <div className="panel-header compact-header">
            <h2>Client Details</h2>
            <ClipboardList size={16} />
          </div>
          <label className="field">
            <span>Client Name</span>
            <input data-testid="input-client-name" {...register('name')} />
            {errors.name ? <small>{errors.name.message}</small> : null}
          </label>
          <label className="field">
            <span>Contact Email</span>
            <input data-testid="input-client-contact-email" {...register('contact_email')} />
            {errors.contact_email ? <small>{errors.contact_email.message}</small> : null}
          </label>
          <label className="field">
            <span>Contact Name</span>
            <input data-testid="input-client-contact-name" {...register('contact_name')} />
          </label>
          <label className="field">
            <span>Contact Phone</span>
            <input {...register('contact_phone')} />
          </label>
          <div className="form-pair">
            <label className="field">
              <span>Monthly Retainer</span>
              <input data-testid="input-client-retainer" type="number" {...register('monthly_retainer')} />
            </label>
            <label className="field">
              <span>Currency</span>
              <input data-testid="input-client-currency" {...register('currency')} />
            </label>
          </div>
          <div className="form-pair">
            <label className="field">
              <span>Contract Start</span>
              <input data-testid="input-client-contract-start" type="date" {...register('contract_start')} />
              {errors.contract_start ? <small>{errors.contract_start.message}</small> : null}
            </label>
            <label className="field">
              <span>Duration Months</span>
              <input data-testid="input-client-contract-duration" type="number" {...register('contract_duration')} />
              {errors.contract_duration ? <small>{errors.contract_duration.message}</small> : null}
            </label>
          </div>
          <div className="computed-date">
            <CalendarDays size={16} />
            Contract end: <strong>{contractEnd || '-'}</strong>
          </div>
          <div className="form-pair">
            <label className="field">
              <span>Payment Terms</span>
              <input data-testid="input-client-payment-terms" placeholder="Net 15, advance, milestone" {...register('payment_terms')} />
            </label>
            <label className="field">
              <span>Renewal Date</span>
              <input data-testid="input-client-renewal-date" type="date" {...register('renewal_date')} />
              {errors.renewal_date ? <small>{errors.renewal_date.message}</small> : null}
            </label>
          </div>
          <div className="onboarding-actions">
            <button
              className="primary-action compact"
              data-testid="button-onboarding-next-client-details"
              onClick={goToScopeTemplates}
              type="button"
            >
              Next
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
      ) : null}

      {step === 'scope_templates' ? (
        <section className="onboarding-step" data-testid="onboarding-step-scope-templates">
          <div className="panel-header compact-header">
            <h2>Scope Templates</h2>
            <Sparkles size={16} />
          </div>
          <div className="template-preview">
            <label className="field">
              <span>Scope Template</span>
              <select data-testid="select-scope-template" {...register('scope_template_id')}>
                <option value="">Select template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name ? `${template.name} (${template.industry} - ${template.service_type})` : `${template.industry} - ${template.service_type}`}
                  </option>
                ))}
              </select>
              {errors.scope_template_id ? (
                <small>{errors.scope_template_id.message}</small>
              ) : null}
            </label>

            {selectedTemplate ? (
              <TemplatePreview template={selectedTemplate} />
            ) : (
              <div className="template-card muted-card">Select a template to preview tasks, KPIs, and duration.</div>
            )}
          </div>
          <div className="onboarding-actions spread">
            <button
              className="ghost-button"
              data-testid="button-onboarding-back-scope-templates"
              onClick={() => setStep('client_details')}
              type="button"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              className="primary-action compact"
              data-testid="button-onboarding-next-scope-templates"
              disabled={templates.length === 0}
              onClick={goToTeamMapping}
              type="button"
            >
              Next: Team Mapping
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
      ) : null}

      {step === 'team_mapping' ? (
        <section className="onboarding-step" data-testid="onboarding-step-team-mapping">
          <div className="panel-header compact-header">
            <h2>Team Mapping & Candidates Selection</h2>
            <Sparkles size={16} />
          </div>
          <TeamMappingSection
            selectedTemplate={selectedTemplate}
            teamAssignments={teamAssignments}
            onChangeAssignments={(newAssignments) => setValue('team_assignments', newAssignments)}
          />
          <div className="onboarding-actions spread">
            <button
              className="ghost-button"
              data-testid="button-onboarding-back-team-mapping"
              onClick={() => setStep('scope_templates')}
              type="button"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              className="primary-action compact"
              data-testid="button-onboarding-next-team-mapping"
              onClick={goToReview}
              type="button"
            >
              Next: Review
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
      ) : null}

      {step === 'review' ? (
        <section className="onboarding-step" data-testid="onboarding-step-review">
          <div className="panel-header compact-header">
            <h2>Review</h2>
            <CheckCircle2 size={16} />
          </div>
          <ReviewSection
            contractEnd={contractEnd}
            selectedTemplate={selectedTemplate}
            teamAssignments={teamAssignments}
            values={formValues as any}
          />
          <div className="onboarding-actions spread">
            <button
              className="ghost-button"
              data-testid="button-onboarding-back-review"
              onClick={() => setStep('team_mapping')}
              type="button"
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              className="primary-action compact"
              data-testid="button-create-client"
              disabled={createMutation.isPending || templates.length === 0}
              type="submit"
            >
              {createMutation.isPending ? 'Creating...' : 'Confirm'}
            </button>
          </div>
        </section>
      ) : null}
    </form>
  )
}

function formatClientCreationError(error: unknown) {
  const apiError = normalizeApiError(error)
  const statusPrefix = apiError.status ? `Request failed with ${apiError.status}. ` : ''
  return `Client Creation Unsuccessful due to ${statusPrefix}${apiError.message}`
}

function TeamMappingSection({
  selectedTemplate,
  teamAssignments,
  onChangeAssignments,
}: {
  selectedTemplate: ScopeTemplate | undefined
  teamAssignments: Record<string, string[]>
  onChangeAssignments: (newAssignments: Record<string, string[]>) => void
}) {
  const { data: users = [] } = useQuery({
    queryKey: ['all-users-list'],
    queryFn: getUsers,
  })

  const requiredRoles = useMemo(() => {
    if (!selectedTemplate || !selectedTemplate.default_tasks?.month_1) return []
    const roles = new Set<string>()
    for (const task of selectedTemplate.default_tasks.month_1) {
      if (task.target_role) roles.add(task.target_role)
      if (task.subtasks) {
        for (const sub of task.subtasks) {
          if (sub.target_role) roles.add(sub.target_role)
        }
      }
    }
    if (roles.size === 0) {
      return [
        'Brand Manager',
        'Creative Designer',
        'Copywriter',
        'Performance Marketer',
        'SEO Specialist',
        'CRM Specialist',
        'Social Media Manager',
      ]
    }
    return Array.from(roles)
  }, [selectedTemplate])

  const toggleUser = (role: string, userId: string) => {
    const current = teamAssignments[role] || []
    const updated = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId]

    onChangeAssignments({
      ...teamAssignments,
      [role]: updated,
    })
  }

  if (!selectedTemplate) {
    return (
      <div className="template-card muted-card">
        Please select a Scope Template first to see required team roles.
      </div>
    )
  }

  return (
    <div className="team-mapping-container" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '0.875rem', color: 'var(--secondary)' }}>
        Map team members to the required task roles in <strong>{selectedTemplate.name}</strong>. Multiple candidates per role can be selected for load distribution.
      </p>

      {requiredRoles.map((role) => {
        const matchingUsers = users.filter((u) => {
          if (u.role?.name === 'client') return false
          const uDesig = (u.designation || '').toLowerCase()
          const uTeam = (u.team || '').toLowerCase()
          const rLower = role.toLowerCase()

          return (
            uTeam.includes(rLower) ||
            uDesig.includes(rLower) ||
            (rLower.includes('graphic') && (uDesig.includes('graphic') || uTeam.includes('creative'))) ||
            (rLower.includes('designer') && (uDesig.includes('graphic') || uTeam.includes('creative'))) ||
            (rLower.includes('writer') && (uDesig.includes('writer') || uTeam.includes('copywriter'))) ||
            (rLower.includes('performance') && (uDesig.includes('performance') || uTeam.includes('performance'))) ||
            (rLower.includes('seo') && (uDesig.includes('seo') || uTeam.includes('seo'))) ||
            (rLower.includes('crm') && (uDesig.includes('crm') || uTeam.includes('automation'))) ||
            (rLower.includes('social') && (uDesig.includes('social') || uTeam.includes('video'))) ||
            (rLower.includes('brand') && (uDesig.includes('brand') || uDesig.includes('project')))
          )
        })

        const displayUsers = matchingUsers.length > 0 ? matchingUsers : users.filter((u) => u.role?.name !== 'client')
        const selectedIds = teamAssignments[role] || []

        return (
          <div key={role} className="role-mapping-card" style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>🏷️ Required Role: {role}</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--secondary)' }}>
                {selectedIds.length} candidate{selectedIds.length === 1 ? '' : 's'} selected
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '8px' }}>
              {displayUsers.map((user) => {
                const isSelected = selectedIds.includes(user.id)
                return (
                  <label
                    key={user.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 10px',
                      borderRadius: '6px',
                      border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border)',
                      background: isSelected ? 'rgba(59,130,246,0.1)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleUser(role, user.id)}
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>{user.full_name}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--secondary)' }}>
                        {user.designation || user.team || user.role?.name}
                      </div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ReviewSection({
  contractEnd,
  selectedTemplate,
  teamAssignments,
  values,
}: {
  contractEnd: string
  selectedTemplate: ScopeTemplate | undefined
  teamAssignments: Record<string, string[]>
  values: Partial<ClientOnboardingInput>
}) {
  const { data: users = [] } = useQuery({
    queryKey: ['all-users-list'],
    queryFn: getUsers,
  })

  return (
    <div className="review-grid">
      <section className="review-card">
        <h3>Client Details</h3>
        <dl>
          <div>
            <dt>Name</dt>
            <dd>{displayValue(values.name)}</dd>
          </div>
          <div>
            <dt>Contact Email</dt>
            <dd>{displayValue(values.contact_email)}</dd>
          </div>
          <div>
            <dt>Contact Name</dt>
            <dd>{displayValue(values.contact_name)}</dd>
          </div>
          <div>
            <dt>Contact Phone</dt>
            <dd>{displayValue(values.contact_phone)}</dd>
          </div>
          <div>
            <dt>Monthly Retainer</dt>
            <dd>{displayValue(values.monthly_retainer)}</dd>
          </div>
          <div>
            <dt>Currency</dt>
            <dd>{displayValue(values.currency)}</dd>
          </div>
          <div>
            <dt>Contract Start</dt>
            <dd>{displayValue(values.contract_start)}</dd>
          </div>
          <div>
            <dt>Contract End</dt>
            <dd>{displayValue(contractEnd)}</dd>
          </div>
          <div>
            <dt>Payment Terms</dt>
            <dd>{displayValue(values.payment_terms)}</dd>
          </div>
          <div>
            <dt>Renewal Date</dt>
            <dd>{displayValue(values.renewal_date)}</dd>
          </div>
        </dl>
      </section>
      <section className="review-card">
        <h3>Scope Template & Team Assignments</h3>
        {selectedTemplate ? <TemplatePreview template={selectedTemplate} /> : <p>No template selected.</p>}

        <div style={{ marginTop: '16px' }}>
          <h4>Assigned Team Members per Role:</h4>
          {Object.keys(teamAssignments).length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--secondary)' }}>No explicit team members mapped.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              {Object.entries(teamAssignments).map(([role, userIds]) => {
                const assignedUsers = users.filter((u) => userIds.includes(u.id))
                return (
                  <div key={role} style={{ fontSize: '0.85rem' }}>
                    <strong>{role}:</strong>{' '}
                    {assignedUsers.length > 0
                      ? assignedUsers.map((u) => u.full_name).join(', ')
                      : 'Unassigned'}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function TemplatePreview({ template }: { template: ScopeTemplate }) {
  const kpis = formatKpis(template.kpi_framework)

  return (
    <div className="template-card" data-testid="template-preview-card">
      <h3>{template.name}</h3>
      <p>{template.description}</p>
      <div className="template-meta">
        <span>{template.duration_months} months</span>
        <span>{kpis.length} KPIs</span>
      </div>
      <div className="task-preview">
        {(template.default_tasks.month_1 ?? []).map((task) => (
          <div key={task.title} className="preview-task">
            <span>{task.priority ?? 'medium'}</span>
            {task.title}
          </div>
        ))}
      </div>
      <div className="kpi-preview">
        {kpis.slice(0, 4).map((kpi) => (
          <div key={kpi}>{kpi}</div>
        ))}
      </div>
    </div>
  )
}

function calculateContractEnd(
  contractStart: unknown,
  contractDuration: unknown,
) {
  if (typeof contractStart !== 'string' || !contractStart) return ''

  const duration = Number(contractDuration)
  if (!Number.isFinite(duration) || duration <= 0) return ''

  const date = new Date(`${contractStart}T00:00:00.000Z`)
  if (Number.isNaN(date.getTime())) return ''

  date.setUTCMonth(date.getUTCMonth() + duration)
  if (Number.isNaN(date.getTime())) return ''

  return date.toISOString().slice(0, 10)
}

function displayValue(value: unknown) {
  if (value === undefined || value === null || value === '') return '-'
  return String(value)
}

function formatKpis(kpiFramework: Record<string, unknown>) {
  if (Array.isArray(kpiFramework)) {
    return kpiFramework.map((item, index) =>
      typeof item === 'object' && item && 'name' in item
        ? String(item.name)
        : `KPI ${index + 1}`,
    )
  }

  return Object.entries(kpiFramework).map(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      return `${key}: ${value}`
    }

    return key
  })
}
