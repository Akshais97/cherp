import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Key,
  Layers,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { apiClient } from '../../lib/api/client'
import { normalizeApiError } from '../../lib/api/errors'
import { getClients } from '../clients/api'

type AdPlatformKey = 'google_ads' | 'meta_ads' | 'linkedin_ads' | 'google_ad_manager'

interface PlatformConfig {
  id: AdPlatformKey
  name: string
  subtitle: string
  iconColor: string
  badgeColor: string
  docsUrl: string
  scopes: string[]
  guideSteps: string[]
}

const PLATFORM_CONFIGS: Record<AdPlatformKey, PlatformConfig> = {
  google_ads: {
    id: 'google_ads',
    name: 'Google Ads',
    subtitle: 'Search, Display, Performance Max & YouTube Video Ads',
    iconColor: '#ea4335',
    badgeColor: 'rgba(234, 67, 53, 0.15)',
    docsUrl: 'https://console.cloud.google.com/apis/credentials',
    scopes: ['https://www.googleapis.com/auth/adwords'],
    guideSteps: [
      'Log in to Google Cloud Console and create an OAuth 2.0 Web Application client ID.',
      'Set redirect URI to https://api.cherp-erp.com/api/ad-platform/callback/google.',
      'Enable Google Ads API under APIs & Services in Google Cloud Console.',
      'Copy your Developer Token from your Google Ads Manager Account (MCC) -> API Center.',
    ],
  },
  meta_ads: {
    id: 'meta_ads',
    name: 'Meta Ads Manager',
    subtitle: 'Facebook, Instagram, Messenger & Audience Network Ads',
    iconColor: '#1877f2',
    badgeColor: 'rgba(24, 119, 242, 0.15)',
    docsUrl: 'https://developers.facebook.com/apps/',
    scopes: ['ads_read', 'read_insights', 'ads_management'],
    guideSteps: [
      'Log in to Meta for Developers and create a Business App.',
      'Add Marketing API product to your application.',
      'Set Valid OAuth Redirect URI to https://api.cherp-erp.com/api/ad-platform/callback/meta.',
      'Request App Review approval for ads_read and read_insights permissions.',
    ],
  },
  linkedin_ads: {
    id: 'linkedin_ads',
    name: 'LinkedIn Ads',
    subtitle: 'Sponsored Content, Message Ads & Lead Gen Forms',
    iconColor: '#0a66c2',
    badgeColor: 'rgba(10, 102, 194, 0.15)',
    docsUrl: 'https://www.linkedin.com/developers/apps',
    scopes: ['r_ads', 'r_ads_reporting'],
    guideSteps: [
      'Log in to LinkedIn Developer Portal and create a new Developer App.',
      'Associate your app with your agency LinkedIn Company Page.',
      'Add the Marketing Developer Platform (MDP) product.',
      'Configure OAuth Redirect URL to https://api.cherp-erp.com/api/ad-platform/callback/linkedin.',
    ],
  },
  google_ad_manager: {
    id: 'google_ad_manager',
    name: 'Google Ad Manager (GAM)',
    subtitle: 'Publisher Direct Ad Inventory & Premium Placement Reports',
    iconColor: '#34a853',
    badgeColor: 'rgba(52, 168, 83, 0.15)',
    docsUrl: 'https://admanager.google.com/',
    scopes: ['https://www.googleapis.com/auth/dfp'],
    guideSteps: [
      'Create a Service Account in GCP Console (IAM & Admin -> Service Accounts).',
      'Generate a JSON Key file for the Service Account.',
      'Log in to Google Ad Manager Admin -> Access & Safety -> Users.',
      'Add Service Account email as a user with Read-Only Reporting permissions.',
    ],
  },
}

export function AdIntegrationsPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<AdPlatformKey>('google_ads')
  const [authMode, setAuthMode] = useState<'oauth' | 'keys'>('oauth')
  const [gamAuthMode, setGamAuthMode] = useState<'OAUTH_WEB' | 'SERVICE_ACCOUNT'>('SERVICE_ACCOUNT')

  const [integrations, setIntegrations] = useState<any[]>([])
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([])
  const [syncLogs, setSyncLogs] = useState<any[]>([])
  const [clients, setClients] = useState<any[]>([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [expandedGuide, setExpandedGuide] = useState<boolean>(true)

  // Modals
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)

  // Inline OAuth Client ID state
  const [inlineClientId, setInlineClientId] = useState('')

  // Platform-Specific Key Form State
  const [googleAdsForm, setGoogleAdsForm] = useState({
    oauth_client_id: '',
    oauth_client_secret: '',
    google_ads_developer_token: '',
    google_ads_customer_id: '',
    google_ads_login_customer_id: '',
  })

  const [metaAdsForm, setMetaAdsForm] = useState({
    app_id: '',
    app_secret: '',
    meta_ad_account_id: '',
    business_manager_id: '',
  })

  const [linkedInForm, setLinkedInForm] = useState({
    oauth_client_id: '',
    oauth_client_secret: '',
    linkedin_sponsored_account_urn: '',
  })

  const [gamForm, setGamForm] = useState({
    oauth_client_id: '',
    oauth_client_secret: '',
    gam_network_code: '',
    application_name: 'CHERP ERP Ingestion',
    service_account_email: '',
    service_account_json: '',
  })

  // Link Form State
  const [linkForm, setLinkForm] = useState({
    client_id: '',
    external_account_id: '',
    account_name: '',
  })

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    // Populate inline client ID whenever platform or integrations change
    const cred = integrations.find((i) => i.platform === selectedPlatform)
    setInlineClientId(cred?.client_id || '')
  }, [selectedPlatform, integrations])

  const loadData = async () => {
    setLoading(true)
    try {
      const [credsRes, linksRes, clientsData] = await Promise.all([
        apiClient.get<any[]>('/ad-platform/credentials').catch(() => ({ data: [] })),
        apiClient.get<any[]>('/ad-platform/client-accounts').catch(() => ({ data: [] })),
        getClients().catch(() => []),
      ])

      const creds = credsRes.data || []
      setIntegrations(creds)
      setLinkedAccounts(linksRes.data || [])
      setClients(clientsData || [])

      // Populate platform forms
      const googleCred = creds.find((c) => c.platform === 'google_ads')
      if (googleCred) {
        setGoogleAdsForm((prev) => ({
          ...prev,
          oauth_client_id: googleCred.client_id || '',
          google_ads_customer_id: googleCred.account_id || '',
        }))
      }

      const metaCred = creds.find((c) => c.platform === 'meta_ads')
      if (metaCred) {
        setMetaAdsForm((prev) => ({
          ...prev,
          app_id: metaCred.client_id || '',
          meta_ad_account_id: metaCred.account_id || '',
        }))
      }

      const linkedInCred = creds.find((c) => c.platform === 'linkedin_ads')
      if (linkedInCred) {
        setLinkedInForm((prev) => ({
          ...prev,
          oauth_client_id: linkedInCred.client_id || '',
          linkedin_sponsored_account_urn: linkedInCred.account_id || '',
        }))
      }

      const gamCred = creds.find((c) => c.platform === 'google_ad_manager')
      if (gamCred) {
        setGamForm((prev) => ({
          ...prev,
          oauth_client_id: gamCred.client_id || '',
          gam_network_code: gamCred.account_id || '',
        }))
      }
    } catch (err) {
      const normalized = normalizeApiError(err)
      setFeedback({ type: 'error', message: `Failed to load ad integrations: ${normalized.message}` })
    } finally {
      setLoading(false)
    }
  }

  // Handle OAuth Redirect
  const handleInitiateOAuth = async (platform: AdPlatformKey) => {
    setFeedback(null)
    const currentCred = integrations.find((i) => i.platform === platform)
    const effectiveClientId = inlineClientId.trim() || currentCred?.client_id

    if (!effectiveClientId) {
      setFeedback({
        type: 'error',
        message: `Please enter your Developer App ID / Client ID below or under the Platform API Keys tab before connecting via OAuth.`,
      })
      return
    }

    try {
      // Save client ID first if newly provided in inline input
      if (inlineClientId.trim() && inlineClientId.trim() !== currentCred?.client_id) {
        await apiClient.post('/ad-platform/credentials', {
          platform,
          client_id: inlineClientId.trim(),
          is_enabled: true,
        })
      }

      const res = await apiClient.get<{ auth_url: string }>(`/ad-platform/oauth/${platform}`)
      if (res.data?.auth_url) {
        window.open(res.data.auth_url, '_blank')
        setFeedback({
          type: 'success',
          message: `Redirecting to ${PLATFORM_CONFIGS[platform].name} OAuth consent window...`,
        })
        loadData()
      }
    } catch (err) {
      const normalized = normalizeApiError(err)
      setFeedback({ type: 'error', message: `OAuth initiation failed: ${normalized.message}` })
    }
  }

  // Handle Save Platform-Specific Credentials
  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      let payload: any = { platform: selectedPlatform, is_enabled: true }

      if (selectedPlatform === 'google_ads') {
        payload = {
          ...payload,
          oauth_client_id: googleAdsForm.oauth_client_id.trim() || undefined,
          oauth_client_secret: googleAdsForm.oauth_client_secret.trim() || undefined,
          google_ads_developer_token: googleAdsForm.google_ads_developer_token.trim() || undefined,
          google_ads_customer_id: googleAdsForm.google_ads_customer_id.trim() || undefined,
          google_ads_login_customer_id: googleAdsForm.google_ads_login_customer_id.trim() || undefined,
        }
      } else if (selectedPlatform === 'meta_ads') {
        payload = {
          ...payload,
          app_id: metaAdsForm.app_id.trim() || undefined,
          app_secret: metaAdsForm.app_secret.trim() || undefined,
          meta_ad_account_id: metaAdsForm.meta_ad_account_id.trim() || undefined,
          business_manager_id: metaAdsForm.business_manager_id.trim() || undefined,
        }
      } else if (selectedPlatform === 'linkedin_ads') {
        payload = {
          ...payload,
          oauth_client_id: linkedInForm.oauth_client_id.trim() || undefined,
          oauth_client_secret: linkedInForm.oauth_client_secret.trim() || undefined,
          linkedin_sponsored_account_urn: linkedInForm.linkedin_sponsored_account_urn.trim() || undefined,
        }
      } else if (selectedPlatform === 'google_ad_manager') {
        payload = {
          ...payload,
          auth_mode: gamAuthMode,
          gam_network_code: gamForm.gam_network_code.trim() || undefined,
          application_name: gamForm.application_name.trim() || undefined,
          oauth_client_id: gamAuthMode === 'OAUTH_WEB' ? gamForm.oauth_client_id.trim() : undefined,
          oauth_client_secret: gamAuthMode === 'OAUTH_WEB' ? gamForm.oauth_client_secret.trim() : undefined,
          service_account_email: gamAuthMode === 'SERVICE_ACCOUNT' ? gamForm.service_account_email.trim() : undefined,
          service_account_json:
            gamAuthMode === 'SERVICE_ACCOUNT' && gamForm.service_account_json
              ? JSON.parse(gamForm.service_account_json)
              : undefined,
        }
      }

      await apiClient.post('/ad-platform/credentials', payload)

      setFeedback({
        type: 'success',
        message: `Successfully saved platform credentials for ${PLATFORM_CONFIGS[selectedPlatform].name}.`,
      })
      loadData()
    } catch (err) {
      const normalized = normalizeApiError(err)
      setFeedback({ type: 'error', message: `Failed to save credentials: ${normalized.message}` })
    } finally {
      setSaving(false)
    }
  }

  // Handle Test Connection
  const handleTestConnection = async () => {
    setTestingConnection(true)
    setFeedback(null)

    try {
      const res = await apiClient.post<any>('/ad-platform/test-connection', { platform: selectedPlatform })
      if (res.data?.success) {
        setFeedback({ type: 'success', message: res.data.message })
      } else {
        setFeedback({ type: 'error', message: res.data.message })
      }
    } catch (err) {
      const normalized = normalizeApiError(err)
      setFeedback({ type: 'error', message: `Connection test failed: ${normalized.message}` })
    } finally {
      setTestingConnection(false)
    }
  }

  // Handle Link Account to Client
  const handleLinkAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      await apiClient.post('/ad-platform/link-account', {
        client_id: linkForm.client_id,
        platform: selectedPlatform,
        external_account_id: linkForm.external_account_id.trim(),
        account_name: linkForm.account_name.trim(),
      })

      setFeedback({ type: 'success', message: 'Successfully mapped external Ad Account to CHERP Client.' })
      setIsLinkModalOpen(false)
      loadData()
    } catch (err) {
      const normalized = normalizeApiError(err)
      setFeedback({ type: 'error', message: `Account linking failed: ${normalized.message}` })
    } finally {
      setSaving(false)
    }
  }

  // Handle Trigger Manual Sync
  const handleTriggerSync = async () => {
    setSyncing(true)
    setFeedback(null)

    try {
      const res = await apiClient.post<any>('/ad-platform/sync', { platform: selectedPlatform })
      setFeedback({ type: 'success', message: res.data?.message || 'Ad metrics synced successfully!' })
      loadData()
    } catch (err) {
      const normalized = normalizeApiError(err)
      setFeedback({ type: 'error', message: `Sync failed: ${normalized.message}` })
    } finally {
      setSyncing(false)
    }
  }

  // View Sync Logs
  const handleViewLogs = async () => {
    try {
      const res = await apiClient.get<any[]>('/ad-platform/sync-logs')
      setSyncLogs(res.data || [])
      setIsLogsModalOpen(true)
    } catch (err) {
      console.error('Failed to fetch sync logs', err)
    }
  }

  const currentPlatformConfig = PLATFORM_CONFIGS[selectedPlatform]
  const currentCred = integrations.find((i) => i.platform === selectedPlatform)
  const currentLinkedAccounts = linkedAccounts.filter((l) => l.platform === selectedPlatform)

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: 'var(--secondary)' }}>
        <p className="animate-pulse">Loading Ad Platform Integrations Hub...</p>
      </div>
    )
  }

  return (
    <motion.section
      className="ad-integrations-page"
      data-testid="ad-integrations-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ padding: '8px', color: 'var(--text)' }}
    >
      {/* Page Header */}
      <div
        className="page-heading"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <div>
          <p style={{ color: 'var(--muted)', fontSize: '13px', margin: 0 }}>
            Multi-Tenant BYOC Architecture & Ingestion Pipeline
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 0', color: 'var(--text)' }}>
            PPC Ad Integrations Hub
          </h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            className="ghost-button"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            onClick={handleViewLogs}
          >
            <Clock size={15} /> Ingestion Logs
          </button>

          <button
            type="button"
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
              fontWeight: 600,
            }}
            onClick={handleTriggerSync}
            disabled={syncing}
          >
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Ingesting...' : 'Sync Ad Metrics Now'}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: feedback.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${feedback.type === 'success' ? '#10b981' : '#ef4444'}`,
            color: feedback.type === 'success' ? '#10b981' : '#ef4444',
            fontSize: '13px',
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Platform Selection Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        {(Object.keys(PLATFORM_CONFIGS) as AdPlatformKey[]).map((key) => {
          const cfg = PLATFORM_CONFIGS[key]
          const isSelected = selectedPlatform === key
          const cred = integrations.find((i) => i.platform === key)
          const isConnected = cred?.is_enabled && cred?.client_id

          return (
            <motion.div
              key={key}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              onClick={() => setSelectedPlatform(key)}
              style={{
                background: isSelected ? 'var(--card)' : 'var(--bg-secondary)',
                border: isSelected ? `2px solid ${cfg.iconColor}` : '1px solid var(--border)',
                borderRadius: '10px',
                padding: '18px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                color: 'var(--text)',
                boxShadow: isSelected ? '0 4px 12px rgba(0, 0, 0, 0.08)' : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: cfg.badgeColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Layers size={20} style={{ color: cfg.iconColor }} />
                </div>
                {isConnected ? (
                  <span className="pill" style={{ fontSize: '11px', background: '#10b98122', color: '#10b981', fontWeight: 600 }}>
                    App ID Ready
                  </span>
                ) : (
                  <span className="pill" style={{ fontSize: '11px', background: 'rgba(148, 163, 184, 0.2)', color: 'var(--muted)' }}>
                    Needs App ID
                  </span>
                )}
              </div>

              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' }}>{cfg.name}</h3>
              <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0, lineHeight: 1.4 }}>{cfg.subtitle}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Main Connection Panel for Selected Platform */}
      <div
        className="panel"
        style={{
          padding: '24px',
          borderRadius: '12px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          marginBottom: '24px',
          color: 'var(--text)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
              Configure {currentPlatformConfig.name}
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0' }}>
              Enter platform-specific developer parameters and authorize account access.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="ghost-button"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
              onClick={handleTestConnection}
              disabled={testingConnection || !currentCred}
            >
              <CheckCircle2 size={14} /> {testingConnection ? 'Testing...' : 'Test Connection'}
            </button>

            {/* Auth Mode Switcher */}
            <div
              style={{
                display: 'flex',
                background: 'var(--bg-secondary)',
                padding: '4px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
              }}
            >
              <button
                type="button"
                onClick={() => setAuthMode('oauth')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: authMode === 'oauth' ? 'var(--accent, #3b6dd6)' : 'transparent',
                  color: authMode === 'oauth' ? '#FFF' : 'var(--muted)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Sparkles size={14} /> One-Click OAuth 2.0
              </button>
              <button
                type="button"
                onClick={() => setAuthMode('keys')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: authMode === 'keys' ? 'var(--accent, #3b6dd6)' : 'transparent',
                  color: authMode === 'keys' ? '#FFF' : 'var(--muted)',
                  fontWeight: 600,
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Key size={14} /> Platform API Keys
              </button>
            </div>
          </div>
        </div>

        {/* Mode A: One-Click OAuth 2.0 */}
        {authMode === 'oauth' ? (
          <div
            style={{
              background: 'var(--bg-secondary)',
              padding: '24px',
              borderRadius: '10px',
              border: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              color: 'var(--text)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <ShieldCheck size={28} style={{ color: currentPlatformConfig.iconColor }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>
                  OAuth 2.0 Authorization Consent
                </h4>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--muted)' }}>
                  Authorize CHERP ERP to read read-only ad performance insights automatically.
                </p>
              </div>
            </div>

            {/* Inline Developer App ID Input */}
            <div style={{ maxWidth: '420px' }}>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                Your {currentPlatformConfig.name} App ID / Client ID
              </label>
              <input
                type="text"
                value={inlineClientId}
                onChange={(e) => setInlineClientId(e.target.value)}
                placeholder={
                  selectedPlatform === 'google_ads'
                    ? 'e.g. 9876543210-apps.googleusercontent.com'
                    : selectedPlatform === 'meta_ads'
                    ? 'e.g. 101588899'
                    : 'e.g. 78xxxyyyzzz'
                }
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'var(--card)',
                  color: 'var(--text)',
                  border: '1px solid var(--border)',
                  fontSize: '13px',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {currentPlatformConfig.scopes.map((scope) => (
                <span
                  key={scope}
                  className="pill"
                  style={{ fontSize: '11px', background: 'var(--card)', color: 'var(--text)' }}
                >
                  Scope: {scope}
                </span>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => handleInitiateOAuth(selectedPlatform)}
                style={{
                  background: currentPlatformConfig.iconColor,
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                Connect with {currentPlatformConfig.name} <ExternalLink size={15} />
              </button>

              <a
                href={currentPlatformConfig.docsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: '13px', color: 'var(--accent, #3b6dd6)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Developer Console <ExternalLink size={13} />
              </a>
            </div>
          </div>
        ) : (
          /* Mode B: Platform-Specific Manual Credentials Form */
          <form onSubmit={handleSaveCredentials} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Google Ads Specific Form */}
            {selectedPlatform === 'google_ads' && (
              <>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Google OAuth Client ID
                  </label>
                  <input
                    type="text"
                    value={googleAdsForm.oauth_client_id}
                    onChange={(e) => setGoogleAdsForm({ ...googleAdsForm, oauth_client_id: e.target.value })}
                    placeholder="e.g. 9876543210-apps.googleusercontent.com"
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
                    Google OAuth Client Secret (Encrypted)
                  </label>
                  <input
                    type="password"
                    value={googleAdsForm.oauth_client_secret}
                    onChange={(e) => setGoogleAdsForm({ ...googleAdsForm, oauth_client_secret: e.target.value })}
                    placeholder="Enter Client Secret"
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
                    Google Ads Developer Token
                  </label>
                  <input
                    type="text"
                    value={googleAdsForm.google_ads_developer_token}
                    onChange={(e) => setGoogleAdsForm({ ...googleAdsForm, google_ads_developer_token: e.target.value })}
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

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Customer ID (10 digits)
                  </label>
                  <input
                    type="text"
                    value={googleAdsForm.google_ads_customer_id}
                    onChange={(e) => setGoogleAdsForm({ ...googleAdsForm, google_ads_customer_id: e.target.value })}
                    placeholder="e.g. 123-456-7890 (auto-normalized to 1234567890)"
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
                    Login Customer ID / MCC Manager ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={googleAdsForm.google_ads_login_customer_id}
                    onChange={(e) => setGoogleAdsForm({ ...googleAdsForm, google_ads_login_customer_id: e.target.value })}
                    placeholder="e.g. MCC ID without dashes"
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
              </>
            )}

            {/* Meta Ads Specific Form */}
            {selectedPlatform === 'meta_ads' && (
              <>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Meta App ID
                  </label>
                  <input
                    type="text"
                    value={metaAdsForm.app_id}
                    onChange={(e) => setMetaAdsForm({ ...metaAdsForm, app_id: e.target.value })}
                    placeholder="e.g. 101588899"
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
                    Meta App Secret (Encrypted)
                  </label>
                  <input
                    type="password"
                    value={metaAdsForm.app_secret}
                    onChange={(e) => setMetaAdsForm({ ...metaAdsForm, app_secret: e.target.value })}
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

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    Meta Ad Account ID
                  </label>
                  <input
                    type="text"
                    value={metaAdsForm.meta_ad_account_id}
                    onChange={(e) => setMetaAdsForm({ ...metaAdsForm, meta_ad_account_id: e.target.value })}
                    placeholder="e.g. act_1015888123 (auto-adds act_ prefix)"
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
                    Business Manager ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={metaAdsForm.business_manager_id}
                    onChange={(e) => setMetaAdsForm({ ...metaAdsForm, business_manager_id: e.target.value })}
                    placeholder="e.g. 5012398"
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
              </>
            )}

            {/* LinkedIn Ads Specific Form */}
            {selectedPlatform === 'linkedin_ads' && (
              <>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    LinkedIn Client ID
                  </label>
                  <input
                    type="text"
                    value={linkedInForm.oauth_client_id}
                    onChange={(e) => setLinkedInForm({ ...linkedInForm, oauth_client_id: e.target.value })}
                    placeholder="e.g. 78xxxyyyzzz"
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
                    LinkedIn Client Secret (Encrypted)
                  </label>
                  <input
                    type="password"
                    value={linkedInForm.oauth_client_secret}
                    onChange={(e) => setLinkedInForm({ ...linkedInForm, oauth_client_secret: e.target.value })}
                    placeholder="Enter Client Secret"
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
                    LinkedIn Sponsored Account URN
                  </label>
                  <input
                    type="text"
                    value={linkedInForm.linkedin_sponsored_account_urn}
                    onChange={(e) => setLinkedInForm({ ...linkedInForm, linkedin_sponsored_account_urn: e.target.value })}
                    placeholder="e.g. urn:li:sponsoredAccount:50123987"
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
              </>
            )}

            {/* Google Ad Manager Specific Form */}
            {selectedPlatform === 'google_ad_manager' && (
              <>
                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '12px', marginBottom: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setGamAuthMode('SERVICE_ACCOUNT')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: gamAuthMode === 'SERVICE_ACCOUNT' ? 'var(--accent, #3b6dd6)' : 'var(--bg-secondary)',
                      color: gamAuthMode === 'SERVICE_ACCOUNT' ? '#FFF' : 'var(--text)',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    Service Account JSON Mode
                  </button>
                  <button
                    type="button"
                    onClick={() => setGamAuthMode('OAUTH_WEB')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      background: gamAuthMode === 'OAUTH_WEB' ? 'var(--accent, #3b6dd6)' : 'var(--bg-secondary)',
                      color: gamAuthMode === 'OAUTH_WEB' ? '#FFF' : 'var(--text)',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    OAuth Web App Mode
                  </button>
                </div>

                <div>
                  <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                    GAM Network Code
                  </label>
                  <input
                    type="text"
                    value={gamForm.gam_network_code}
                    onChange={(e) => setGamForm({ ...gamForm, gam_network_code: e.target.value })}
                    placeholder="e.g. 12345678"
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
                    Application Name
                  </label>
                  <input
                    type="text"
                    value={gamForm.application_name}
                    onChange={(e) => setGamForm({ ...gamForm, application_name: e.target.value })}
                    placeholder="CHERP ERP Ingestion"
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

                {gamAuthMode === 'SERVICE_ACCOUNT' ? (
                  <>
                    <div style={{ gridColumn: 'span 2' }}>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                        Service Account Email
                      </label>
                      <input
                        type="text"
                        value={gamForm.service_account_email}
                        onChange={(e) => setGamForm({ ...gamForm, service_account_email: e.target.value })}
                        placeholder="cherp-service@project.iam.gserviceaccount.com"
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
                        Service Account JSON Key Content
                      </label>
                      <textarea
                        rows={4}
                        value={gamForm.service_account_json}
                        onChange={(e) => setGamForm({ ...gamForm, service_account_json: e.target.value })}
                        placeholder='Paste Service Account JSON string e.g. {"type": "service_account", ...}'
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '6px',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text)',
                          border: '1px solid var(--border)',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                        OAuth Client ID
                      </label>
                      <input
                        type="text"
                        value={gamForm.oauth_client_id}
                        onChange={(e) => setGamForm({ ...gamForm, oauth_client_id: e.target.value })}
                        placeholder="Enter OAuth Client ID"
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
                        OAuth Client Secret
                      </label>
                      <input
                        type="password"
                        value={gamForm.oauth_client_secret}
                        onChange={(e) => setGamForm({ ...gamForm, oauth_client_secret: e.target.value })}
                        placeholder="Enter Client Secret"
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
                  </>
                )}
              </>
            )}

            <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  background: 'var(--accent, #3b6dd6)',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '13px',
                }}
              >
                {saving ? 'Saving...' : 'Save Encrypted Credentials'}
              </button>
            </div>
          </form>
        )}

        {/* Step-by-step Developer Guide Accordion */}
        <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <button
            type="button"
            onClick={() => setExpandedGuide(!expandedGuide)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: 0,
            }}
          >
            {expandedGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            How to set up developer credentials for {currentPlatformConfig.name}
          </button>

          {expandedGuide && (
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {currentPlatformConfig.guideSteps.map((step, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px', color: 'var(--text)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--accent, #3b6dd6)' }}>Step {idx + 1}:</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Linked Accounts Section */}
      <div
        className="panel"
        style={{
          padding: '24px',
          borderRadius: '12px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
              Linked Client Ad Accounts ({currentPlatformConfig.name})
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: '4px 0 0' }}>
              Map external account IDs to CHERP clients to enable automatic reporting.
            </p>
          </div>

          <button
            type="button"
            className="ghost-button"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            onClick={() => {
              setLinkForm({
                client_id: clients[0]?.id || '',
                external_account_id: '',
                account_name: '',
              })
              setIsLinkModalOpen(true)
            }}
          >
            <Plus size={14} /> Link Ad Account to Client
          </button>
        </div>

        {currentLinkedAccounts.length === 0 ? (
          <p style={{ padding: '16px 0', color: 'var(--muted)', fontSize: '13px' }}>
            No external ad accounts linked for {currentPlatformConfig.name}. Click "Link Ad Account to Client" to associate one.
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
                  <th style={{ padding: '10px' }}>Ingestion Pipeline</th>
                </tr>
              </thead>
              <tbody>
                {currentLinkedAccounts.map((acc) => (
                  <tr key={acc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{acc.client?.name || 'Client'}</td>
                    <td style={{ padding: '10px' }}>{acc.account_name}</td>
                    <td style={{ padding: '10px' }}>
                      <code>{acc.external_account_id}</code>
                    </td>
                    <td style={{ padding: '10px' }}>{acc.currency}</td>
                    <td style={{ padding: '10px' }}>
                      <span className="pill" style={{ fontSize: '11px', background: '#10b98122', color: '#10b981' }}>
                        Active (Daily 02:00 AM)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Link Account Modal */}
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
                Link {currentPlatformConfig.name} Account to Client
              </h2>
              <button type="button" className="ghost-button" onClick={() => setIsLinkModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLinkAccount} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                  {clients.map((c) => (
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
                  placeholder="e.g. 123-456-7890 or act_10158 (auto-normalized)"
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
                No ingestion logs recorded yet. Click "Sync Ad Metrics Now" or wait for daily 02:00 AM daemon job.
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
    </motion.section>
  )
}
