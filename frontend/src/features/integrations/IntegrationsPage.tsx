import React, { useState, useEffect } from 'react'
import { apiClient } from '../../lib/api/client'
import { normalizeApiError } from '../../lib/api/errors'
import { getClients } from '../clients/api'
import {
  Network,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Layers,
  Plus,
  Clock,
  X,
} from 'lucide-react'

type IntegrationTab = 'teams' | 'google_ads' | 'meta_ads' | 'linkedin_ads' | 'google_ad_manager'

export function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<IntegrationTab>('teams')

  // Teams state
  const [enabled, setEnabled] = useState(false)
  const [tenantId, setTenantId] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Ad Platform Integrations State
  const [adCredentials, setAdCredentials] = useState<any[]>([])
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([])
  const [syncLogs, setSyncLogs] = useState<any[]>([])
  const [clientsList, setClientsList] = useState<any[]>([])

  // Feedback State
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Modals
  const [isCredsModalOpen, setIsCredsModalOpen] = useState(false)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
  const [isAdSyncing, setIsAdSyncing] = useState(false)

  // Form states for active platform
  const [credForm, setCredForm] = useState({
    client_id: '',
    client_secret: '',
    developer_token: '',
    account_id: '',
    is_enabled: true,
  })

  const [linkForm, setLinkForm] = useState({
    client_id: '',
    platform: 'google_ads',
    external_account_id: '',
    account_name: '',
  })

  // Load initial data
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [teamsRes, credsRes, linksRes, clientsData] = await Promise.all([
        apiClient.get<any>('/integrations/teams').catch(() => ({ data: null })),
        apiClient.get<any[]>('/ad-platform/credentials').catch(() => ({ data: [] })),
        apiClient.get<any[]>('/ad-platform/client-accounts').catch(() => ({ data: [] })),
        getClients().catch(() => []),
      ])

      if (teamsRes.data) {
        setEnabled(teamsRes.data.teams_enabled || false)
        setTenantId(teamsRes.data.teams_tenant_id || '')
        setClientId(teamsRes.data.teams_client_id || '')
        setClientSecret(teamsRes.data.teams_client_secret || '')
      }

      setAdCredentials(credsRes.data || [])
      setLinkedAccounts(linksRes.data || [])
      setClientsList(clientsData || [])
    } catch (err) {
      const normalized = normalizeApiError(err)
      setFeedback({ type: 'error', message: `Failed to load settings: ${normalized.message}` })
    } finally {
      setLoading(false)
    }
  }

  // Handle Teams Save
  const handleSaveTeams = async (e: React.FormEvent) => {
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

  // Handle Save Ad Credentials
  const handleSaveAdCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      await apiClient.post('/ad-platform/credentials', {
        platform: activeTab,
        client_id: credForm.client_id.trim() || undefined,
        client_secret: credForm.client_secret.trim() || undefined,
        developer_token: credForm.developer_token.trim() || undefined,
        account_id: credForm.account_id.trim() || undefined,
        is_enabled: credForm.is_enabled,
      })

      setFeedback({ type: 'success', message: `Credentials saved for ${activeTab.replace('_', ' ').toUpperCase()}.` })
      setIsCredsModalOpen(false)
      loadData()
    } catch (err) {
      const normalized = normalizeApiError(err)
      setFeedback({ type: 'error', message: `Failed to save credentials: ${normalized.message}` })
    } finally {
      setSaving(false)
    }
  }

  // Handle Link Ad Account to Client
  const handleLinkAdAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      await apiClient.post('/ad-platform/link-account', {
        client_id: linkForm.client_id,
        platform: activeTab,
        external_account_id: linkForm.external_account_id.trim(),
        account_name: linkForm.account_name.trim(),
      })

      setFeedback({ type: 'success', message: 'Successfully linked Ad Account to client.' })
      setIsLinkModalOpen(false)
      loadData()
    } catch (err) {
      const normalized = normalizeApiError(err)
      setFeedback({ type: 'error', message: `Failed to link account: ${normalized.message}` })
    } finally {
      setSaving(false)
    }
  }

  // Trigger Manual Ad Metric Sync
  const handleTriggerAdSync = async () => {
    setIsAdSyncing(true)
    setFeedback(null)

    try {
      const res = await apiClient.post<any>('/ad-platform/sync', {
        platform: activeTab,
      })
      setFeedback({ type: 'success', message: res.data?.message || 'Ad metrics synced successfully!' })
      loadData()
    } catch (err) {
      const normalized = normalizeApiError(err)
      setFeedback({ type: 'error', message: `Sync failed: ${normalized.message}` })
    } finally {
      setIsAdSyncing(false)
    }
  }

  // Fetch Sync Logs
  const handleViewLogs = async () => {
    try {
      const res = await apiClient.get<any[]>('/ad-platform/sync-logs')
      setSyncLogs(res.data || [])
      setIsLogsModalOpen(true)
    } catch (err) {
      console.error('Failed to fetch sync logs', err)
    }
  }

  // Get Credential record for active platform
  const currentCred = adCredentials.find((c) => c.platform === activeTab)
  const platformLinkedAccounts = linkedAccounts.filter((l) => l.platform === activeTab)

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--secondary)' }}>
        <p className="animate-pulse">Loading integration settings...</p>
      </div>
    )
  }

  return (
    <section className="integrations-page" data-testid="integrations-page" style={{ padding: '8px', color: 'var(--text)' }}>
      <div className="page-heading">
        <div>
          <p style={{ color: 'var(--muted)' }}>Third-Party Connections & Data Pipelines</p>
          <h1 style={{ color: 'var(--text)' }}>Integrations</h1>
        </div>
        <span className="pill">Slice 1, 2 and 3</span>
      </div>

      {feedback && (
        <div
          className={`notice ${feedback.type}`}
          style={{
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 16px',
            borderRadius: '6px',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: feedback.type === 'success' ? '#10b981' : '#ef4444',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          borderBottom: '1px solid var(--border)',
          paddingBottom: '12px',
          marginBottom: '24px',
          overflowX: 'auto',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('teams')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'teams' ? 'var(--accent, #3b6dd6)' : 'var(--bg-secondary)',
            color: activeTab === 'teams' ? '#FFF' : 'var(--text)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Network size={16} /> Microsoft Teams
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('google_ads')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'google_ads' ? 'var(--accent, #3b6dd6)' : 'var(--bg-secondary)',
            color: activeTab === 'google_ads' ? '#FFF' : 'var(--text)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Layers size={16} /> Google Ads
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('meta_ads')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'meta_ads' ? 'var(--accent, #3b6dd6)' : 'var(--bg-secondary)',
            color: activeTab === 'meta_ads' ? '#FFF' : 'var(--text)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Layers size={16} /> Meta Ads Manager
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('linkedin_ads')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'linkedin_ads' ? 'var(--accent, #3b6dd6)' : 'var(--bg-secondary)',
            color: activeTab === 'linkedin_ads' ? '#FFF' : 'var(--text)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Layers size={16} /> LinkedIn Ads
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('google_ad_manager')}
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            border: 'none',
            background: activeTab === 'google_ad_manager' ? 'var(--accent, #3b6dd6)' : 'var(--bg-secondary)',
            color: activeTab === 'google_ad_manager' ? '#FFF' : 'var(--text)',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Layers size={16} /> Google Ad Manager
        </button>
      </div>

      {/* Tab 1: Microsoft Teams */}
      {activeTab === 'teams' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section className="panel" style={{ padding: '24px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Network size={24} style={{ color: 'var(--accent, #3b6dd6)' }} />
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>Microsoft Teams Bot & Directory Sync</h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                  Configure Azure AD App credentials for automated user directory sync and chat bot notifications.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveTeams} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input
                  type="checkbox"
                  id="teams_enabled"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <label htmlFor="teams_enabled" style={{ fontSize: '14px', fontWeight: 600, cursor: 'pointer', color: 'var(--text)' }}>
                  Enable Teams Integration
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Directory (Tenant) ID
                  </label>
                  <input
                    type="text"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    placeholder="e.g. 00000000-0000-0000-0000-000000000000"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Application (Client) ID
                  </label>
                  <input
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="e.g. 11111111-1111-1111-1111-111111111111"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Client Secret
                  </label>
                  <input
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Enter App Secret value"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: 'var(--accent, #3b6dd6)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {/* Tabs 2-5: Ad Platform Integrations */}
      {activeTab !== 'teams' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Developer Credentials Card */}
          <section className="panel" style={{ padding: '24px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
                  {activeTab.replace('_', ' ').toUpperCase()} Developer Credentials
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                  Configure developer app credentials & OAuth API tokens for automated metric sync.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleViewLogs}
                  className="ghost-button"
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
                >
                  <Clock size={14} /> Sync History
                </button>

                <button
                  type="button"
                  onClick={handleTriggerAdSync}
                  disabled={isAdSyncing}
                  className="primary-button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '13px',
                    background: 'var(--accent, #3b6dd6)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw size={14} className={isAdSyncing ? 'animate-spin' : ''} />
                  {isAdSyncing ? 'Syncing Metrics...' : 'Sync Ad Metrics Now'}
                </button>
              </div>
            </div>

            {/* Developer Documentation Reference Banner */}
            <div
              style={{
                background: 'var(--bg-secondary)',
                padding: '14px 18px',
                borderRadius: '6px',
                marginBottom: '20px',
                border: '1px solid var(--border)',
                fontSize: '13px',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--accent, #3b6dd6)', display: 'block', marginBottom: '4px' }}>
                📌 Developer Setup Guide ({activeTab.replace('_', ' ').toUpperCase()})
              </span>
              {activeTab === 'google_ads' && (
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  Create an OAuth Client ID in <strong>Google Cloud Console</strong> with scope <code>https://www.googleapis.com/auth/adwords</code>. Enter your Manager Account (MCC) <strong>Developer Token</strong> below.
                </p>
              )}
              {activeTab === 'meta_ads' && (
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  Create a Business App in <strong>Meta for Developers</strong> with <code>Marketing API</code> product enabled. Request permissions for <code>ads_read</code> and <code>read_insights</code>.
                </p>
              )}
              {activeTab === 'linkedin_ads' && (
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  Create an App in <strong>LinkedIn Developer Portal</strong> with <code>Marketing Developer Platform (MDP)</code> enabled. Request scope <code>r_ads_reporting</code>.
                </p>
              )}
              {activeTab === 'google_ad_manager' && (
                <p style={{ margin: 0, color: 'var(--muted)' }}>
                  Create a Service Account in <strong>GCP Console</strong> and add its email to your <strong>Google Ad Manager (GAM)</strong> admin panel with Read-Only reporting permissions.
                </p>
              )}
            </div>

            {/* Credential Status Summary */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block' }}>Platform Connection Status</span>
                <strong style={{ fontSize: '15px', color: currentCred?.is_enabled ? '#10b981' : 'var(--muted)' }}>
                  {currentCred?.is_enabled ? 'Connected & Ingestion Active' : 'Not Configured / Inactive'}
                </strong>
                {currentCred && (
                  <span style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginTop: '2px' }}>
                    Client ID: {currentCred.client_id || '—'} | Account ID: {currentCred.account_id || '—'}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setCredForm({
                    client_id: currentCred?.client_id || '',
                    client_secret: '',
                    developer_token: '',
                    account_id: currentCred?.account_id || '',
                    is_enabled: currentCred?.is_enabled ?? true,
                  })
                  setIsCredsModalOpen(true)
                }}
                style={{
                  background: 'var(--accent, #3b6dd6)',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {currentCred ? 'Configure Credentials' : 'Connect Platform'}
              </button>
            </div>
          </section>

          {/* Linked Client Ad Accounts Panel */}
          <section className="panel" style={{ padding: '24px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
                  Linked Client Ad Accounts ({activeTab.replace('_', ' ').toUpperCase()})
                </h2>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
                  Map external ad account IDs (e.g. <code>123-456-7890</code> or <code>act_10158...</code>) to CHERP clients.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setLinkForm({
                    client_id: clientsList[0]?.id || '',
                    platform: activeTab,
                    external_account_id: '',
                    account_name: '',
                  })
                  setIsLinkModalOpen(true)
                }}
                className="ghost-button"
                style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <Plus size={14} /> Link Ad Account to Client
              </button>
            </div>

            {platformLinkedAccounts.length === 0 ? (
              <p style={{ padding: '16px 0', color: 'var(--muted)', fontSize: '13px' }}>
                No external ad accounts linked for {activeTab.replace('_', ' ')}. Click "Link Ad Account to Client" to map one.
              </p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '10px' }}>CHERP Client</th>
                      <th style={{ padding: '10px' }}>Ad Account Name</th>
                      <th style={{ padding: '10px' }}>External Account ID</th>
                      <th style={{ padding: '10px' }}>Currency</th>
                      <th style={{ padding: '10px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {platformLinkedAccounts.map((link) => (
                      <tr key={link.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px', fontWeight: 600 }}>{link.client?.name || 'Client'}</td>
                        <td style={{ padding: '10px' }}>{link.account_name}</td>
                        <td style={{ padding: '10px' }}>
                          <code>{link.external_account_id}</code>
                        </td>
                        <td style={{ padding: '10px' }}>{link.currency}</td>
                        <td style={{ padding: '10px' }}>
                          <span className="pill" style={{ fontSize: '11px', background: '#10b98122', color: '#10b981' }}>
                            Active Ingestion
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Configure Credentials Modal */}
      {isCredsModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                Configure {activeTab.replace('_', ' ').toUpperCase()} API Credentials
              </h2>
              <button type="button" className="ghost-button" onClick={() => setIsCredsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdCredentials} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                  Client ID / App ID
                </label>
                <input
                  type="text"
                  value={credForm.client_id}
                  onChange={(e) => setCredForm({ ...credForm, client_id: e.target.value })}
                  placeholder="Enter App Client ID"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                  Client Secret / App Secret (Encrypted at Rest)
                </label>
                <input
                  type="password"
                  value={credForm.client_secret}
                  onChange={(e) => setCredForm({ ...credForm, client_secret: e.target.value })}
                  placeholder="Enter App Secret"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                  }}
                />
              </div>

              {activeTab === 'google_ads' && (
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Google Ads Developer Token
                  </label>
                  <input
                    type="text"
                    value={credForm.developer_token}
                    onChange={(e) => setCredForm({ ...credForm, developer_token: e.target.value })}
                    placeholder="Enter Developer Token"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text)',
                      border: '1px solid var(--border)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              )}

              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                  Manager Account ID / Business Manager ID
                </label>
                <input
                  type="text"
                  value={credForm.account_id}
                  onChange={(e) => setCredForm({ ...credForm, account_id: e.target.value })}
                  placeholder="e.g. MCC ID or Business Manager ID"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="ghost-button" onClick={() => setIsCredsModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: 'var(--accent, #3b6dd6)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  {saving ? 'Saving...' : 'Save Credentials'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Link Ad Account Modal */}
      {isLinkModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
                Link {activeTab.replace('_', ' ').toUpperCase()} Account to Client
              </h2>
              <button type="button" className="ghost-button" onClick={() => setIsLinkModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLinkAdAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                  CHERP Client
                </label>
                <select
                  value={linkForm.client_id}
                  onChange={(e) => setLinkForm({ ...linkForm, client_id: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                  }}
                >
                  <option value="">Select Client</option>
                  {clientsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                  External Ad Account ID
                </label>
                <input
                  type="text"
                  value={linkForm.external_account_id}
                  onChange={(e) => setLinkForm({ ...linkForm, external_account_id: e.target.value })}
                  required
                  placeholder="e.g. 123-456-7890 or act_1015888"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                  Ad Account Name
                </label>
                <input
                  type="text"
                  value={linkForm.account_name}
                  onChange={(e) => setLinkForm({ ...linkForm, account_name: e.target.value })}
                  required
                  placeholder="e.g. Acme Search & Lead Gen Account"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text)',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
                <button type="button" className="ghost-button" onClick={() => setIsLinkModalOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    background: 'var(--accent, #3b6dd6)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                  }}
                >
                  {saving ? 'Linking...' : 'Link Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sync Logs Modal */}
      {isLogsModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000,
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--card)',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '640px',
              padding: '24px',
              border: '1px solid var(--border)',
              color: 'var(--text)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--text)' }}>Automated Ad Ingestion Sync Logs</h2>
              <button type="button" className="ghost-button" onClick={() => setIsLogsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            {syncLogs.length === 0 ? (
              <p style={{ color: 'var(--muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>
                No ingestion logs recorded yet. Run a manual sync or wait for the daily 02:00 AM daemon job.
              </p>
            ) : (
              <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                      <th style={{ padding: '8px' }}>Timestamp</th>
                      <th style={{ padding: '8px' }}>Platform</th>
                      <th style={{ padding: '8px' }}>Type</th>
                      <th style={{ padding: '8px' }}>Synced Count</th>
                      <th style={{ padding: '8px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {syncLogs.map((log) => (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px', color: 'var(--muted)' }}>
                          {new Date(log.started_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '8px', fontWeight: 600 }}>{log.platform}</td>
                        <td style={{ padding: '8px' }}>{log.sync_type}</td>
                        <td style={{ padding: '8px' }}>{log.records_synced} records</td>
                        <td style={{ padding: '8px' }}>
                          <span
                            className="pill"
                            style={{
                              fontSize: '11px',
                              background: log.status === 'success' ? '#10b98122' : '#ef444422',
                              color: log.status === 'success' ? '#10b981' : '#ef4444',
                            }}
                          >
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
