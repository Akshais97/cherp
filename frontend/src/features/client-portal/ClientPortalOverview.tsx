import { useState, useEffect } from 'react'
import { apiClient } from '../../lib/api/client'
import { normalizeApiError } from '../../lib/api/errors'
import { Download } from 'lucide-react'

export function ClientPortalOverview() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient.get('/reports/summary')
      .then((res) => setData(res.data))
      .catch((err) => setError(normalizeApiError(err).message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div style={{ padding: '32px', color: 'var(--muted)' }}>Loading client portal overview...</div>
  }

  if (error) {
    return <div style={{ padding: '32px', color: 'var(--red)' }}>Error: {error}</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '700', color: 'var(--text)' }}>
          Brand Performance Overview
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--secondary-text)' }}>
          Real-time completion metrics and milestone deliverables for your active scope.
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ padding: '20px', background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 'bold' }}>Overall Task Progress</span>
          <h3 style={{ margin: '8px 0 0', fontSize: '28px', color: 'var(--accent)' }}>
            {data?.completion_percentage ?? 0}%
          </h3>
        </div>

        <div style={{ padding: '20px', background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 'bold' }}>Completed Deliverables</span>
          <h3 style={{ margin: '8px 0 0', fontSize: '28px', color: 'var(--green)' }}>
            {data?.completed_tasks ?? 0} / {data?.total_tasks ?? 0}
          </h3>
        </div>

        <div style={{ padding: '20px', background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 'bold' }}>Active Workflows</span>
          <h3 style={{ margin: '8px 0 0', fontSize: '28px', color: 'var(--text)' }}>
            {data?.active_workflows ?? 1}
          </h3>
        </div>
      </div>

      {/* PDF Executive Report Download Action */}
      <div style={{ padding: '24px', background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--text)' }}>
            Executive Monthly PDF Report
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--secondary-text)' }}>
            Download the official monthly performance report document.
          </p>
        </div>

        <a
          href="/api/reports/executive-pdf"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '6px',
            background: 'var(--blue)',
            color: '#FFF',
            fontWeight: '600',
            fontSize: '13px',
            textDecoration: 'none',
          }}
        >
          <Download size={16} />
          Download PDF
        </a>
      </div>
    </div>
  )
}
