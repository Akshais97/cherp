import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar, CheckCircle2, Clock, Download, Landmark, LayoutDashboard } from 'lucide-react'
import { getClientDashboard } from './api'
import { normalizeApiError } from '../../lib/api/errors'
import { ClientPortalToday } from '../client-portal/ClientPortalToday'
import { ClientPortalDownloads } from '../client-portal/ClientPortalDownloads'

export function ClientDashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'today' | 'downloads'>('overview')
  const { data, isLoading, error } = useQuery({
    queryKey: ['client-dashboard'],
    queryFn: getClientDashboard,
  })

  if (isLoading) {
    return (
      <div className="client-dashboard-loading" style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary)' }}>
        <p className="animate-pulse">Loading brand dashboard details...</p>
      </div>
    )
  }

  if (error) {
    const apiError = normalizeApiError(error)
    return (
      <div className="panel notice error" style={{ margin: '24px' }}>
        <h3>Error loading brand dashboard</h3>
        <p>{apiError.message}</p>
      </div>
    )
  }

  const client = data?.client
  const activeWorkflow = data?.activeWorkflow
  const tasks = data?.tasks ?? []

  // Progress Calculations
  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t) =>
    ['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(t.status)
  )
  const completedCount = completedTasks.length
  const completionPercentage = activeWorkflow
    ? Math.round(Number(activeWorkflow.completion_percentage))
    : totalTasks > 0
    ? Math.round((completedCount / totalTasks) * 100)
    : 0

  const radius = 60
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (completionPercentage / 100) * circumference

  // Filters for lists
  const todaysWork = tasks.filter((t) => t.status === 'ongoing' || t.status === 'yet_to_start')
  const milestones = tasks.filter((t) => t.priority === 'high')

  const formatCurrency = (val: any) => {
    if (val === null || val === undefined) return '-'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: client?.currency || 'INR',
    }).format(Number(val))
  }

  const taskStatusLabels: Record<string, string> = {
    yet_to_start: 'Yet to start',
    ongoing: 'Ongoing',
    blocked: 'Blocked',
    completed: 'Completed',
    task_approved_by_manager: 'Approved By PM',
    rework: 'Rework',
    task_approved_by_client: 'Approved by Client',
  }

  return (
    <section className="client-dashboard" data-testid="client-dashboard-page" style={{ padding: '8px' }}>
      <div className="page-heading">
        <div>
          <p>Brand Partner Space</p>
          <h1>{client?.name || 'Brand'} Dashboard</h1>
        </div>
        <span className="pill" style={{ background: 'var(--blue-light)', color: 'var(--blue)' }}>
          {client?.industry} / {client?.service_type}
        </span>
      </div>

      {/* Portal View Tabs */}
      <nav style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '6px',
            background: activeTab === 'overview' ? 'var(--blue)' : 'var(--bg-secondary)',
            color: activeTab === 'overview' ? '#FFF' : 'var(--text)',
            border: 'none',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <LayoutDashboard size={15} /> Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '6px',
            background: activeTab === 'today' ? 'var(--blue)' : 'var(--bg-secondary)',
            color: activeTab === 'today' ? '#FFF' : 'var(--text)',
            border: 'none',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <Clock size={15} /> Today's Work
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('downloads')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            borderRadius: '6px',
            background: activeTab === 'downloads' ? 'var(--blue)' : 'var(--bg-secondary)',
            color: activeTab === 'downloads' ? '#FFF' : 'var(--text)',
            border: 'none',
            fontWeight: '600',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          <Download size={15} /> Reports & Assets
        </button>
      </nav>

      {activeTab === 'today' ? <ClientPortalToday /> : null}
      {activeTab === 'downloads' ? <ClientPortalDownloads /> : null}

      {activeTab === 'overview' ? (
        <div className="client-dashboard-grid">
        {/* Left Column: Progress & Financials */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Progress Card */}
          <section className="panel circular-progress-container" style={{ textAlign: 'center' }}>
            <h2 style={{ marginBottom: '16px' }}>Project Progress</h2>
            <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
              <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  stroke="var(--border)"
                  fill="none"
                  strokeWidth="10"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="60"
                  stroke="var(--blue)"
                  fill="none"
                  strokeWidth="10"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text)' }}>
                  {completionPercentage}%
                </span>
                <span style={{ fontSize: '11px', color: 'var(--secondary)' }}>Month {activeWorkflow?.month_number || 1}</span>
              </div>
            </div>
            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-around', width: '100%' }}>
              <div>
                <strong style={{ fontSize: '16px', display: 'block' }}>{completedCount}</strong>
                <span style={{ fontSize: '12px', color: 'var(--secondary)' }}>Completed</span>
              </div>
              <div style={{ borderLeft: '1px solid var(--border)', height: '24px' }} />
              <div>
                <strong style={{ fontSize: '16px', display: 'block' }}>{totalTasks - completedCount}</strong>
                <span style={{ fontSize: '12px', color: 'var(--secondary)' }}>Pending</span>
              </div>
            </div>
          </section>

          {/* Financials Card */}
          <section className="panel">
            <div className="panel-header">
              <h2>Financials Summary</h2>
              <Landmark size={18} style={{ color: 'var(--blue)' }} />
            </div>
            <div className="financial-grid">
              <div className="financial-card">
                <span>Monthly Retainer</span>
                <strong>{formatCurrency(client?.monthly_retainer)}</strong>
              </div>
              <div className="financial-card">
                <span>Ad Spend Managed</span>
                <strong>{formatCurrency(client?.ad_spend)}</strong>
              </div>
              <div className="financial-card">
                <span>Total Investment</span>
                <strong>{formatCurrency(client?.total_investment)}</strong>
              </div>
              <div className="financial-card">
                <span>Invoice Status</span>
                <div style={{ marginTop: '4px' }}>
                  <span className={`invoice-status-badge ${client?.invoice_status || 'pending'}`}>
                    {client?.invoice_status || 'Pending'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Calendar size={14} /> Next Invoice Date
              </span>
              <strong>{client?.next_invoice_date ? client.next_invoice_date.slice(0, 10) : 'TBD'}</strong>
            </div>
          </section>
        </div>

        {/* Right Column: Work & Milestones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Today's Work Card */}
          <section className="panel" style={{ flex: 1 }}>
            <div className="panel-header">
              <h2>Active Work Progress</h2>
              <span className="muted">{todaysWork.length} active tasks</span>
            </div>
            <div className="todays-work-list">
              {todaysWork.length > 0 ? (
                todaysWork.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>{task.title}</h4>
                      <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--secondary)' }}>
                        {task.description || 'In progress...'}
                      </p>
                    </div>
                    <span className={`status-badge ${task.status}`}>
                      {taskStatusLabels[task.status] || task.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="muted-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
                  All tasks are up-to-date!
                </div>
              )}
            </div>
          </section>

          {/* Milestones Card */}
          <section className="panel" style={{ flex: 1 }}>
            <div className="panel-header">
              <h2>High Priority Milestones</h2>
              <CheckCircle2 size={18} style={{ color: 'var(--green)' }} />
            </div>
            <div className="milestones-list">
              {milestones.length > 0 ? (
                milestones.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                    }}
                  >
                    <Clock size={16} style={{ color: task.status === 'completed' ? 'var(--green)' : 'var(--amber)' }} />
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: '14px', textDecoration: task.status === 'completed' ? 'line-through' : 'none' }}>
                        {task.title}
                      </h4>
                      <span style={{ fontSize: '11px', color: 'var(--secondary)' }}>
                        Due: {task.due_date ? task.due_date.slice(0, 10) : 'No due date'}
                      </span>
                    </div>
                    <span className={`status-badge ${task.status}`}>
                      {taskStatusLabels[task.status] || task.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="muted-card" style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)' }}>
                  No major milestones logged for this period.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      ) : null}
    </section>
  )
}
