import React, { useState, useEffect } from 'react'
import { apiClient } from '../../lib/api/client'
import { normalizeApiError } from '../../lib/api/errors'
import { ShinyText } from '../../components/ui/ShinyText'
import { Network, Key, Power, AlertCircle, CheckCircle2, ShieldAlert, Users, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react'

export function IntegrationsPage() {
  const [enabled, setEnabled] = useState(false)
  const [tenantId, setTenantId] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [syncing, setSyncing] = useState(false)
  const [syncSummary, setSyncSummary] = useState<any>(null)
  const [showUnmatchedErp, setShowUnmatchedErp] = useState(false)
  const [showUnmatchedMs, setShowUnmatchedMs] = useState(false)

  // Fetch current settings on mount
  useEffect(() => {
    apiClient.get('/integrations/teams')
      .then((res) => {
        const data = res.data
        if (data) {
          setEnabled(data.teams_enabled || false)
          setTenantId(data.teams_tenant_id || '')
          setClientId(data.teams_client_id || '')
          setClientSecret(data.teams_client_secret || '')
        }
      })
      .catch((err) => {
        const normalized = normalizeApiError(err)
        setFeedback({ type: 'error', message: `Failed to load settings: ${normalized.message}` })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      await apiClient.post('/integrations/teams', {
        enabled,
        tenantId: tenantId.trim() || null,
        clientId: clientId.trim() || null,
        clientSecret: clientSecret.trim() || null,
      })
      setFeedback({ type: 'success', message: 'Integration settings saved successfully.' })
    } catch (err) {
      const normalized = normalizeApiError(err)
      setFeedback({ type: 'error', message: `Failed to save settings: ${normalized.message}` })
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    if (!tenantId || !clientId || !clientSecret) {
      setFeedback({ type: 'error', message: 'Please configure Tenant ID, Client ID, and Client Secret before testing.' })
      return
    }

    setTesting(true)
    setFeedback(null)

    try {
      const res = await apiClient.post('/integrations/teams/test', {
        tenantId: tenantId.trim(),
        clientId: clientId.trim(),
        clientSecret: clientSecret.trim(),
      })
      
      if (res.data.success) {
        setFeedback({ type: 'success', message: res.data.message || 'Connection test succeeded!' })
      } else {
        setFeedback({ type: 'error', message: res.data.message || 'Connection test failed.' })
      }
    } catch (err) {
      const normalized = normalizeApiError(err)
      setFeedback({ type: 'error', message: `Connection test failed: ${normalized.message}` })
    } finally {
      setTesting(false)
    }
  }

  const handleSyncDirectory = async () => {
    setSyncing(true)
    setFeedback(null)
    setSyncSummary(null)

    try {
      const res = await apiClient.post('/integrations/teams/sync')
      if (res.data.success) {
        setSyncSummary(res.data.summary)
        setFeedback({ type: 'success', message: res.data.message || 'Directory sync completed.' })
      } else {
        setFeedback({ type: 'error', message: res.data.message || 'Sync failed.' })
      }
    } catch (err) {
      const normalized = normalizeApiError(err)
      setFeedback({ type: 'error', message: `Sync failed: ${normalized.message}` })
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--secondary)' }}>
        <p className="animate-pulse">Loading integration settings...</p>
      </div>
    )
  }

  return (
    <section className="integrations-page" data-testid="integrations-page" style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Title Header */}
      <div className="page-heading" style={{ marginBottom: '24px' }}>
        <div>
          <p style={{ margin: 0, fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            System Settings
          </p>
          <h1 style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: '700', color: 'var(--text)' }}>
            <ShinyText text="External Integrations" speed={4} />
          </h1>
        </div>
      </div>

      {/* Main Integration Panel */}
      <div className="panel" style={{ padding: '28px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--card)' }}>
        
        {/* Teams Header Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
          <div style={{ background: 'var(--accent-light, #EEF4FF)', padding: '12px', borderRadius: '10px' }}>
            <Network size={28} style={{ color: 'var(--accent, #3B6DD6)' }} />
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>
              Microsoft Teams Notification Dispatcher
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--secondary-text)' }}>
              Automatically dispatch in-app notifications to Microsoft Teams as direct chat activity alerts mapped by user email.
            </p>
          </div>
        </div>

        {/* Feedback Alert Notice */}
        {feedback && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            lineHeight: '1.4',
            border: feedback.type === 'success' ? '1px solid rgba(45,168,107,0.2)' : '1px solid rgba(221,68,68,0.2)',
            background: feedback.type === 'success' ? 'var(--green-light)' : 'var(--red-light)',
            color: feedback.type === 'success' ? 'var(--green)' : 'var(--red)'
          }}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} style={{ flexShrink: 0, marginTop: '2px' }} /> : <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px' }} />}
            <span>{feedback.message}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Toggle Switch Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--hover-bg)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Power size={18} style={{ color: enabled ? 'var(--green)' : 'var(--muted)' }} />
              <div>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text)' }}>Enable Teams Notifications</strong>
                <span style={{ fontSize: '11px', color: 'var(--secondary-text)' }}>Enable background alert relaying to Graph API</span>
              </div>
            </div>
            <label className="custom-toggle-switch">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
              />
              <span className="custom-toggle-slider"></span>
            </label>
          </div>

          {/* Credentials Settings Card */}
          {enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
              
              {/* Info alert banner */}
              <div style={{ display: 'flex', gap: '10px', fontSize: '11px', color: 'var(--secondary-text)', background: 'var(--card)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <AlertCircle size={14} style={{ flexShrink: 0, color: 'var(--accent)' }} />
                <span>Configure Graph API teamwork permissions (<code>TeamsActivity.Send</code>) for client credential workflow.</span>
              </div>

              {/* Tenant ID */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>
                  Directory (Tenant) ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8a3b5c6d-..."
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  style={{
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              {/* Client ID */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>
                  Application (Client) ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 4f2d3a1b-..."
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  style={{
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              {/* Client Secret */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)' }}>
                    Client Secret
                  </label>
                  <span style={{ fontSize: '10px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Key size={10} /> Secret is encrypted on write
                  </span>
                </div>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  style={{
                    height: '38px',
                    padding: '0 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--card)',
                    color: 'var(--text)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                  required={!clientSecret}
                />
              </div>
            </div>
          )}

          {/* Action Row */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '20px', marginTop: '8px' }}>
            {enabled && (
              <button
                type="button"
                className="ghost-button"
                onClick={handleTestConnection}
                disabled={testing || saving}
                style={{
                  height: '38px',
                  padding: '0 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                  border: '1px solid var(--border)',
                  background: 'var(--card)',
                  cursor: 'pointer',
                  borderRadius: '6px'
                }}
              >
                {testing ? 'Testing connection...' : 'Test Connection'}
              </button>
            )}
            
            <button
              type="submit"
              className="primary-action"
              disabled={saving || testing}
              style={{
                height: '38px',
                padding: '0 20px',
                fontSize: '13px',
                fontWeight: '600',
                background: 'var(--blue)',
                color: '#FFF',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: 0
              }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

        </form>
      </div>

      {/* Bulk Directory Sync Panel */}
      {enabled && tenantId && clientId && (
        <div className="panel" style={{ padding: '28px', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--card)', marginTop: '24px' }}>
          
          {/* Sync Header Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', borderBottom: '1px solid var(--border)', paddingBottom: '16px' }}>
            <div style={{ background: 'var(--accent-light, #EEF4FF)', padding: '12px', borderRadius: '10px' }}>
              <Users size={28} style={{ color: 'var(--accent, #3B6DD6)' }} />
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text)' }}>
                Microsoft Entra ID User Sync
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--secondary-text)' }}>
                Automatically query the workspace directory to map external Microsoft IDs against ERP Team Members and Project Managers.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Sync Action Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div style={{ flex: 1, paddingRight: '16px' }}>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text)', marginBottom: '4px' }}>Sync User Accounts</strong>
                <span style={{ fontSize: '12px', color: 'var(--secondary-text)' }}>
                  This will resolve Entra IDs, matches profiles by work email or user principal name (UPN), and stores reference IDs in the database.
                </span>
              </div>
              <button
                type="button"
                className="primary-action"
                onClick={handleSyncDirectory}
                disabled={syncing}
                style={{
                  height: '38px',
                  padding: '0 20px',
                  fontSize: '13px',
                  fontWeight: '600',
                  background: 'var(--blue)',
                  color: '#FFF',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  margin: 0
                }}
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing...' : 'Sync Directory Now'}
              </button>
            </div>

            {/* Sync Summary Details */}
            {syncSummary && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>
                
                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  
                  <div style={{ padding: '14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Total ERP Users</span>
                    <strong style={{ display: 'block', fontSize: '24px', color: 'var(--text)', marginTop: '4px' }}>{syncSummary.totalErpUsers}</strong>
                  </div>
                  
                  <div style={{ padding: '14px', background: 'rgba(95,221,84,0.08)', border: '1px solid rgba(95,221,84,0.2)', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--green)', textTransform: 'uppercase', fontWeight: 'bold' }}>Matched Entra Profiles</span>
                    <strong style={{ display: 'block', fontSize: '24px', color: 'var(--green)', marginTop: '4px' }}>{syncSummary.matchedCount}</strong>
                  </div>

                  <div style={{ padding: '14px', background: syncSummary.unmatchedCount > 0 ? 'rgba(221,68,68,0.08)' : 'var(--bg-secondary)', border: syncSummary.unmatchedCount > 0 ? '1px solid rgba(221,68,68,0.2)' : '1px solid var(--border)', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: syncSummary.unmatchedCount > 0 ? 'var(--red)' : 'var(--muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>Unmatched ERP Users</span>
                    <strong style={{ display: 'block', fontSize: '24px', color: syncSummary.unmatchedCount > 0 ? 'var(--red)' : 'var(--text)', marginTop: '4px' }}>{syncSummary.unmatchedCount}</strong>
                  </div>
                </div>

                {/* Collapsible Unmatched ERP Users */}
                {syncSummary.unmatchedErpUsers && syncSummary.unmatchedErpUsers.length > 0 && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setShowUnmatchedErp(!showUnmatchedErp)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--bg-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', background: 'var(--red)', borderRadius: '50%' }} />
                        Unmatched ERP Members ({syncSummary.unmatchedErpUsers.length})
                      </span>
                      {showUnmatchedErp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showUnmatchedErp && (
                      <div style={{ padding: '12px 16px', background: 'var(--card)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                        <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--secondary-text)', fontStyle: 'italic', marginBottom: '4px' }}>
                          These users could not be resolved against Microsoft directory. Ensure their work emails match their Entra user UPNs.
                        </p>
                        {syncSummary.unmatchedErpUsers.map((u: any) => (
                          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', fontSize: '12.5px' }}>
                            <span style={{ fontWeight: '500', color: 'var(--text)' }}>{u.name}</span>
                            <span style={{ color: 'var(--secondary-text)' }}>{u.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Collapsible Unmatched Microsoft Users */}
                {syncSummary.unmatchedMicrosoftUsers && syncSummary.unmatchedMicrosoftUsers.length > 0 && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setShowUnmatchedMs(!showUnmatchedMs)}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'var(--bg-secondary)',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', background: 'var(--muted)', borderRadius: '50%' }} />
                        Unmatched Entra Profiles ({syncSummary.unmatchedMicrosoftUsers.length})
                      </span>
                      {showUnmatchedMs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    {showUnmatchedMs && (
                      <div style={{ padding: '12px 16px', background: 'var(--card)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                        <p style={{ margin: 0, fontSize: '11.5px', color: 'var(--secondary-text)', fontStyle: 'italic', marginBottom: '4px' }}>
                          These accounts exist in the Microsoft Directory but are not currently registered as users in Saarthii Cherp ERP.
                        </p>
                        {syncSummary.unmatchedMicrosoftUsers.map((u: any) => (
                          <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', borderRadius: '4px', background: 'var(--bg-secondary)', fontSize: '12.5px' }}>
                            <span style={{ fontWeight: '500', color: 'var(--text)' }}>{u.name}</span>
                            <span style={{ color: 'var(--secondary-text)' }}>{u.email}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            )}

          </div>

        </div>
      )}

    </section>
  )
}
