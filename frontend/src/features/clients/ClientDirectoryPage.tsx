import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Archive,
  ArrowDownUp,
  Pencil,
  Save,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAuth } from '../../app/providers/useAuth'
import { normalizeApiError } from '../../lib/api/errors'
import { canArchiveClients, canManageClients } from '../../lib/permissions/roles'
import {
  archiveClient,
  getClient,
  getClients,
  updateClient,
  updateClientStatus,
  type ClientDetail,
  type ClientFilters,
  type ClientRow,
  type ClientStatus,
} from './api'
import {
  clientEditSchema,
  type ClientEditInput,
  type ClientEditValues,
} from './clientSchemas'

const statusLabels: Record<ClientStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  completed: 'Completed',
  archived: 'Archived',
}

export function ClientDirectoryPage() {
  const [sortKey, setSortKey] = useState<keyof ClientRow>('name')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const [statusFilter, setStatusFilter] = useState<ClientStatus | ''>('')
  const debouncedSearch = useDebouncedValue(searchValue, 250)
  const filters = useMemo<ClientFilters>(
    () => ({
      search: debouncedSearch || undefined,
      status: statusFilter || undefined,
    }),
    [debouncedSearch, statusFilter],
  )
  const clientsQuery = useQuery({
    queryKey: ['clients', filters],
    queryFn: () => getClients(filters),
  })

  const clients = useMemo(() => {
    return [...(clientsQuery.data ?? [])].sort((a, b) =>
      String(a[sortKey] ?? '').localeCompare(String(b[sortKey] ?? '')),
    )
  }, [clientsQuery.data, sortKey])

  const clientsError = clientsQuery.error
    ? normalizeApiError(clientsQuery.error).message
    : null

  return (
    <section className="clients-page" data-testid="client-directory-page">
      <div className="page-heading">
        <div>
          <p>Client directory</p>
          <h1>Directory</h1>
        </div>
        <span className="pill">Slice 1 and 2 closure</span>
      </div>

      {clientsError ? (
        <div className="notice error">
          {clientsError}
        </div>
      ) : null}

      <div className="client-directory-layout">
        <ClientDirectory
          clients={clients}
          isLoading={clientsQuery.isLoading}
          searchValue={searchValue}
          selectedClientId={selectedClientId}
          sortKey={sortKey}
          statusFilter={statusFilter}
          onSearchChange={setSearchValue}
          onSelect={setSelectedClientId}
          onSort={setSortKey}
          onStatusFilterChange={setStatusFilter}
        />
        <ClientDetailPanel clientId={selectedClientId} />
      </div>
    </section>
  )
}

function ClientDirectory({
  clients,
  isLoading,
  searchValue,
  selectedClientId,
  sortKey,
  statusFilter,
  onSearchChange,
  onSelect,
  onSort,
  onStatusFilterChange,
}: {
  clients: ClientRow[]
  isLoading: boolean
  searchValue: string
  selectedClientId: string | null
  sortKey: keyof ClientRow
  statusFilter: ClientStatus | ''
  onSearchChange: (value: string) => void
  onSelect: (id: string) => void
  onSort: (key: keyof ClientRow) => void
  onStatusFilterChange: (status: ClientStatus | '') => void
}) {
  return (
    <section className="panel directory-panel" data-testid="client-directory">
      <div className="panel-header">
        <h2>Client directory</h2>
        <span className="muted">{isLoading ? 'Loading...' : `${clients.length} clients`}</span>
      </div>

      <div className="client-filters">
        <label className="field">
          <span>Search</span>
          <input
            value={searchValue}
            data-testid="input-client-search"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <label className="field">
          <span>Status</span>
          <select
            value={statusFilter}
            data-testid="select-client-status-filter"
            onChange={(event) =>
              onStatusFilterChange(event.target.value as ClientStatus | '')
            }
          >
            <option value="">Visible</option>
            {Object.entries(statusLabels).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {[
                ['name', 'Name'],
                ['industry', 'Industry'],
                ['service_type', 'Service'],
                ['status', 'Status'],
              ].map(([key, label]) => (
                <th key={key}>
                  <button
                className={sortKey === key ? 'table-sort active' : 'table-sort'}
                    data-testid={`button-sort-${key}`}
                    onClick={() => onSort(key as keyof ClientRow)}
                    type="button"
                  >
                    {label}
                    <ArrowDownUp size={12} />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr
                key={client.id}
                className={selectedClientId === client.id ? 'selected-row' : undefined}
                data-testid="client-row"
                onClick={() => onSelect(client.id)}
              >
                <td>{client.name}</td>
                <td>{client.industry}</td>
                <td>{client.service_type}</td>
                <td>
                  <span className={`status-badge ${client.status}`}>
                    {statusLabels[client.status]}
                  </span>
                </td>
              </tr>
            ))}
            {!isLoading && clients.length === 0 ? (
              <tr>
                <td colSpan={4}>No clients found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ClientDetailPanel({ clientId }: { clientId: string | null }) {
  const queryClient = useQueryClient()
  const { currentUser } = useAuth()
  const canManage = currentUser ? canManageClients(currentUser.role) : false
  const canArchive = currentUser ? canArchiveClients(currentUser.role) : false
  const [panelError, setPanelError] = useState<string | null>(null)
  const clientQuery = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => getClient(clientId ?? ''),
    enabled: Boolean(clientId),
  })
  const client = clientQuery.data
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ClientEditInput, unknown, ClientEditValues>({
    resolver: zodResolver(clientEditSchema),
  })
  const updateMutation = useMutation({
    mutationFn: (values: ClientEditValues) => updateClient(clientId ?? '', values),
    onSuccess: () => {
      setPanelError(null)
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client', clientId] })
    },
    onError: (error) => setPanelError(normalizeApiError(error).message),
  })
  const statusMutation = useMutation({
    mutationFn: (status: ClientStatus) => updateClientStatus(clientId ?? '', status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client', clientId] })
    },
    onError: (error) => setPanelError(normalizeApiError(error).message),
  })
  const archiveMutation = useMutation({
    mutationFn: () => archiveClient(clientId ?? ''),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client', clientId] })
    },
    onError: (error) => setPanelError(normalizeApiError(error).message),
  })

  useEffect(() => {
    if (!client) return
    reset(toEditDefaults(client))
  }, [client, reset])

  if (!clientId) {
    return (
      <section className="panel muted-card" data-testid="client-detail-empty">
        Select a client to view profile, workflow summary, and lifecycle controls.
      </section>
    )
  }

  if (clientQuery.isLoading) {
    return <section className="panel muted-card" data-testid="client-detail-loading">Loading client detail...</section>
  }

  if (!client) {
    return <section className="panel muted-card" data-testid="client-detail-unavailable">Client detail unavailable.</section>
  }

  return (
    <section className="panel client-detail-panel" data-testid="client-detail-panel">
      <div className="panel-header">
        <div>
          <h2>{client.name}</h2>
          <span className={`status-badge ${client.status}`}>
            {statusLabels[client.status]}
          </span>
        </div>
        {canManage ? (
          <div className="action-row">
            <select
              aria-label="Client status"
              data-testid="select-client-detail-status"
              disabled={statusMutation.isPending}
              value={client.status}
              onChange={(event) => statusMutation.mutate(event.target.value as ClientStatus)}
            >
              {Object.entries(statusLabels).map(([status, label]) => (
                <option key={status} value={status}>
                  {label}
                </option>
              ))}
            </select>
            {canArchive ? (
              <button
                className="ghost-button danger"
                data-testid="button-archive-client"
                disabled={archiveMutation.isPending || client.status === 'archived'}
                onClick={() => archiveMutation.mutate()}
                type="button"
              >
                <Archive size={14} />
                Archive
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {panelError ? <div className="notice error">{panelError}</div> : null}

      {canManage ? (
      <form className="client-edit-form" data-testid="client-edit-form" onSubmit={handleSubmit((values) => updateMutation.mutate(values))}>
        <div className="form-pair">
          <label className="field">
            <span>Name</span>
            <input data-testid="input-edit-client-name" {...register('name')} />
            {errors.name ? <small>{errors.name.message}</small> : null}
          </label>
          <label className="field">
            <span>Industry</span>
            <input data-testid="input-edit-client-industry" {...register('industry')} />
            {errors.industry ? <small>{errors.industry.message}</small> : null}
          </label>
        </div>
        <div className="form-pair">
          <label className="field">
            <span>Service</span>
            <input data-testid="input-edit-client-service" {...register('service_type')} />
            {errors.service_type ? <small>{errors.service_type.message}</small> : null}
          </label>
          <label className="field">
            <span>Contact Email</span>
            <input data-testid="input-edit-client-email" {...register('contact_email')} />
          </label>
        </div>
        <div className="form-pair">
          <label className="field">
            <span>Contract Start</span>
            <input type="date" {...register('contract_start')} />
          </label>
          <label className="field">
            <span>Duration Months</span>
            <input type="number" {...register('contract_duration')} />
          </label>
        </div>
        <div className="form-pair">
          <label className="field">
            <span>Payment Terms</span>
            <input data-testid="input-edit-client-payment-terms" {...register('payment_terms')} />
          </label>
          <label className="field">
            <span>Renewal Date</span>
            <input data-testid="input-edit-client-renewal-date" type="date" {...register('renewal_date')} />
            {errors.renewal_date ? <small>{errors.renewal_date.message}</small> : null}
          </label>
        </div>
          <button className="primary-action compact" data-testid="button-save-client" disabled={updateMutation.isPending} type="submit">
          <Save size={14} />
          {updateMutation.isPending ? 'Saving...' : 'Save changes'}
        </button>
      </form>
      ) : (
        <div className="muted-card" data-testid="client-readonly-detail">
          You have read-only access to this assigned client.
        </div>
      )}

      <div className="workflow-summary">
        <div className="panel-header compact-header">
          <h2>Month 1 workflow</h2>
          <Pencil size={15} />
        </div>
        {client.workflows.map((workflow) => (
          <div key={workflow.id} className="workflow-row">
            <div>
              <strong>{workflow.title}</strong>
              <p>
                {workflow._count.tasks} tasks · {Number(workflow.completion_percentage)}%
                complete
              </p>
            </div>
            <span className={`status-badge ${workflow.status}`}>{workflow.status}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function toEditDefaults(client: ClientDetail): ClientEditInput {
  return {
    name: client.name,
    industry: client.industry,
    service_type: client.service_type,
    contact_name: client.contact_name ?? '',
    contact_email: client.contact_email ?? '',
    contact_phone: client.contact_phone ?? '',
    address: client.address ?? '',
    monthly_retainer:
      client.monthly_retainer === undefined || client.monthly_retainer === null
        ? undefined
        : Number(client.monthly_retainer),
    currency: client.currency ?? 'INR',
    contract_duration: client.contract_duration ?? 1,
    contract_start: client.contract_start?.slice(0, 10) ?? '',
    payment_terms: client.payment_terms ?? '',
    renewal_date: client.renewal_date?.slice(0, 10) ?? '',
    notes: client.notes ?? '',
    retainer_hours: client.retainer_hours ?? undefined,
  }
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timeout)
  }, [delayMs, value])

  return debounced
}
