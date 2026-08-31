import { Download, FileText } from 'lucide-react'
import { useState } from 'react'
import { downloadPdfReport } from '../reporting/api'
import { useAuth } from '../../app/providers/useAuth'

export function ClientPortalDownloads() {
  const { currentUser } = useAuth()
  const clientId = (currentUser as any)?.clientId || ''
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      const blob = await downloadPdfReport(clientId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `CHERP_Executive_PPC_Report.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download report', err)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text)' }}>
          Reports & Asset Downloads
        </h2>
        <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--secondary-text)' }}>
          Access published monthly performance reports and brand asset documentation.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'var(--card, #1e293b)',
            borderRadius: '8px',
            border: '1px solid var(--border, #334155)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FileText size={20} style={{ color: 'var(--accent, #6366f1)' }} />
            <div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: 'var(--text, #f8fafc)' }}>
                Performance Marketing (PPC) Executive Monthly Report
              </p>
              <span style={{ fontSize: '11px', color: 'var(--secondary-text, #94a3b8)' }}>
                Official Published PDF Summary Report
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '6px',
              background: 'var(--accent, #6366f1)',
              border: 'none',
              color: '#fff',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
            }}
          >
            <Download size={14} />
            {isDownloading ? 'Downloading...' : 'Download PDF Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
