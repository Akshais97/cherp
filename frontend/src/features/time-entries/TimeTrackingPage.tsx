import { useQuery } from '@tanstack/react-query'
import { Clock, Download, Filter, DollarSign, FileText } from 'lucide-react'
import { useState } from 'react'
import { exportTimeEntriesCSV, getTimeEntriesReport } from './api'
import { normalizeApiError } from '../../lib/api/errors'

export function TimeTrackingPage() {
  const now = new Date()
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const todayStr = now.toISOString().slice(0, 10)

  const [startDate, setStartDate] = useState<string>(firstDayOfMonth)
  const [endDate, setEndDate] = useState<string>(todayStr)

  const { data: report, isLoading, error } = useQuery({
    queryKey: ['time-entries-report', startDate, endDate],
    queryFn: () => getTimeEntriesReport({ startDate, endDate }),
  })

  const handleExportCSV = () => {
    exportTimeEntriesCSV({ startDate, endDate })
  }

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary)' }}>
        <p className="animate-pulse">Loading time reports & timesheets...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="panel notice error" style={{ margin: '24px' }}>
        <h3>Error loading time tracking report</h3>
        <p>{normalizeApiError(error).message}</p>
      </div>
    )
  }

  const summary = report || {
    total_hours: 0,
    billable_hours: 0,
    non_billable_hours: 0,
    entries_count: 0,
    entries: [],
  }

  return (
    <section className="time-tracking-page" data-testid="time-tracking-page" style={{ padding: '8px' }}>
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <p style={{ color: 'var(--blue)', fontSize: '13px', fontWeight: 600 }}>Capacity & Utilization Analytics</p>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '4px 0' }}>Time Tracking & Reports</h1>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="primary-action"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
        >
          <Download size={16} /> Export CSV Report
        </button>
      </div>

      {/* Date Filter Bar */}
      <div className="panel" style={{ padding: '16px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--panel-bg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--secondary)', fontSize: '13px', fontWeight: 600 }}>
          <Filter size={16} /> Date Range:
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="input-field"
          />
          <span style={{ color: 'var(--muted)' }}>to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {/* Summary Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="panel" style={{ padding: '20px', background: 'var(--panel-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--blue)', marginBottom: '8px' }}>
            <Clock size={20} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>Total Hours Logged</span>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{Number(summary.total_hours).toFixed(1)} hrs</h2>
        </div>

        <div className="panel" style={{ padding: '20px', background: 'var(--panel-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--green)', marginBottom: '8px' }}>
            <DollarSign size={20} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>Billable Hours</span>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, color: 'var(--green)' }}>{Number(summary.billable_hours).toFixed(1)} hrs</h2>
        </div>

        <div className="panel" style={{ padding: '20px', background: 'var(--panel-bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--purple)', marginBottom: '8px' }}>
            <FileText size={20} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--muted)' }}>Logged Time Entries</span>
          </div>
          <h2 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{summary.entries_count}</h2>
        </div>
      </div>

      {/* Entries Table */}
      <div className="panel" style={{ padding: '24px', background: 'var(--panel-bg)' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>Detailed Time Logs</h3>

        {summary.entries.length === 0 ? (
          <p style={{ fontStyle: 'italic', color: 'var(--secondary)' }}>No time entries recorded within this date range.</p>
        ) : null}

        {summary.entries.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--muted)', fontWeight: 600 }}>
                  <th style={{ padding: '12px 8px' }}>Date</th>
                  <th style={{ padding: '12px 8px' }}>Team Member</th>
                  <th style={{ padding: '12px 8px' }}>Task</th>
                  <th style={{ padding: '12px 8px' }}>Hours</th>
                  <th style={{ padding: '12px 8px' }}>Type</th>
                  <th style={{ padding: '12px 8px' }}>Description</th>
                </tr>
              </thead>
              <tbody>
                {summary.entries.map((entry) => (
                  <tr key={entry.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td style={{ padding: '12px 8px', whiteSpace: 'nowrap' }}>{entry.date.slice(0, 10)}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 500 }}>{entry.user?.full_name || 'Team Member'}</td>
                    <td style={{ padding: '12px 8px', color: 'var(--blue)', fontWeight: 500 }}>{entry.task?.title || 'Unspecified Task'}</td>
                    <td style={{ padding: '12px 8px', fontWeight: 600 }}>{Number(entry.hours).toFixed(1)} hrs</td>
                    <td style={{ padding: '12px 8px' }}>
                      {entry.is_billable ? (
                        <span className="badge green" style={{ fontSize: '11px' }}>Billable</span>
                      ) : (
                        <span className="badge grey" style={{ fontSize: '11px' }}>Non-billable</span>
                      )}
                    </td>
                    <td style={{ padding: '12px 8px', color: 'var(--secondary)' }}>{entry.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  )
}
