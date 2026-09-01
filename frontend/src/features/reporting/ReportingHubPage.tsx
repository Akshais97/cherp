import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  MousePointer,
  Target,
  Download,
  Plus,
  Search,
  Layers,
  Trash2,
  Pencil,
  X,
} from 'lucide-react'
import { getClients } from '../clients/api'
import {
  getCampaignResults,
  getChannelBreakdown,
  getContentPerformance,
  createCampaignResult,
  updateCampaignResult,
  deleteCampaignResult,
  createContentPerformanceItem,
  deleteContentPerformanceItem,
  exportPdfReport,
} from './api'
import { type CampaignResult, type CreateCampaignResultPayload } from './types'

export function ReportingHubPage() {
  const queryClient = useQueryClient()

  // Filter States
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [selectedChannel, setSelectedChannel] = useState<string>('')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState<string>('')

  // Modal States
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false)
  const [isContentModalOpen, setIsContentModalOpen] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<CampaignResult | null>(null)
  const [isExportingPdf, setIsExportingPdf] = useState(false)

  // Fetch Clients
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => getClients(),
  })

  // Fetch Campaign Results
  const { data: campaignResults = [], isLoading: isResultsLoading } = useQuery({
    queryKey: ['campaignResults', selectedClientId, selectedChannel, startDate, endDate],
    queryFn: () =>
      getCampaignResults({
        clientId: selectedClientId || undefined,
        channel: selectedChannel || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  })

  // Fetch Channel Breakdown
  const { data: channelBreakdown } = useQuery({
    queryKey: ['channelBreakdown', selectedClientId, startDate, endDate],
    queryFn: () =>
      getChannelBreakdown({
        clientId: selectedClientId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  })

  // Fetch Content Performance Items
  const { data: contentItems = [] } = useQuery({
    queryKey: ['contentPerformance', selectedClientId],
    queryFn: () =>
      getContentPerformance({
        clientId: selectedClientId || undefined,
      }),
  })

  // Mutations
  const campaignMutation = useMutation({
    mutationFn: ({ id, data }: { id?: string; data: CreateCampaignResultPayload }) =>
      id ? updateCampaignResult(id, data) : createCampaignResult(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignResults'] })
      queryClient.invalidateQueries({ queryKey: ['channelBreakdown'] })
      setIsCampaignModalOpen(false)
      setEditingCampaign(null)
    },
  })

  const deleteCampaignMutation = useMutation({
    mutationFn: deleteCampaignResult,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaignResults'] })
      queryClient.invalidateQueries({ queryKey: ['channelBreakdown'] })
    },
  })

  const contentMutation = useMutation({
    mutationFn: createContentPerformanceItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contentPerformance'] })
      setIsContentModalOpen(false)
    },
  })

  const deleteContentMutation = useMutation({
    mutationFn: deleteContentPerformanceItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contentPerformance'] })
    },
  })

  // Export PDF Report
  const handlePdfExport = async () => {
    if (!selectedClientId) return
    setIsExportingPdf(true)
    try {
      const blob = await exportPdfReport({
        clientId: selectedClientId,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `ppc_report_${selectedClientId}_${new Date().toISOString().slice(0, 10)}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download PDF report', err)
    } finally {
      setIsExportingPdf(false)
    }
  }

  const safeCampaignResults = Array.isArray(campaignResults) ? campaignResults : []
  const safeContentItems = Array.isArray(contentItems) ? contentItems : []

  // Filtered campaign table items
  const filteredCampaigns = safeCampaignResults.filter((item) =>
    item.campaign_name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Aggregated Totals
  const totals = channelBreakdown?.totals ?? {
    ad_spend: safeCampaignResults.reduce((acc, c) => acc + Number(c.ad_spend ?? 0), 0),
    impressions: safeCampaignResults.reduce((acc, c) => acc + (c.impressions ?? 0), 0),
    clicks: safeCampaignResults.reduce((acc, c) => acc + (c.clicks ?? 0), 0),
    leads: safeCampaignResults.reduce((acc, c) => acc + (c.leads ?? 0), 0),
    conversions: safeCampaignResults.reduce((acc, c) => acc + (c.conversions ?? 0), 0),
    revenue: safeCampaignResults.reduce((acc, c) => acc + Number(c.revenue ?? 0), 0),
    cpl: null,
    roas: null,
  }

  const avgCpl =
    totals.cpl ?? (totals.leads > 0 && totals.ad_spend > 0 ? totals.ad_spend / totals.leads : null)
  const avgRoas =
    totals.roas ?? (totals.ad_spend > 0 && totals.revenue > 0 ? totals.revenue / totals.ad_spend : null)

  return (
    <motion.section
      className="reporting-hub-page"
      data-testid="reporting-hub-page"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      style={{ padding: '8px', color: 'var(--text)' }}
    >
      {/* Header */}
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
            PPC Intelligence & Campaign Delivery
          </p>
          <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', margin: '4px 0 0', color: 'var(--text)' }}>
            Reporting Hub
          </h1>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="ghost-button"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
            onClick={handlePdfExport}
            disabled={!selectedClientId || isExportingPdf}
            title={!selectedClientId ? 'Select a client to export PDF report' : 'Export PDF Report'}
            type="button"
          >
            <Download size={16} />
            {isExportingPdf ? 'Generating PDF...' : 'Export PDF Report'}
          </button>

          <button
            className="primary-button"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              background: 'var(--accent, #3b6dd6)',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
            onClick={() => {
              setEditingCampaign(null)
              setIsCampaignModalOpen(true)
            }}
            type="button"
          >
            <Plus size={16} />
            Log Campaign Result
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="panel"
        style={{
          padding: '16px',
          marginBottom: '24px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          alignItems: 'center',
          background: 'var(--card)',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
      >
        <div>
          <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
            Filter Client
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
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
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.service_type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
            Channel
          </label>
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
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
            <option value="">All Channels</option>
            <option value="Google Ads">Google Ads</option>
            <option value="Meta">Meta Ads</option>
            <option value="LinkedIn">LinkedIn Ads</option>
            <option value="Organic">Organic</option>
            <option value="Email">Email</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
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
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
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

      {/* KPI Cards Grid with Motion Hover */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <motion.div
          className="panel"
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          style={{ padding: '16px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', marginBottom: '8px' }}>
            <DollarSign size={18} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Total Spend</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>
            ₹{totals.ad_spend.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        </motion.div>

        <motion.div
          className="panel"
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          style={{ padding: '16px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3b82f6', marginBottom: '8px' }}>
            <BarChart3 size={18} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Impressions</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{totals.impressions.toLocaleString()}</div>
        </motion.div>

        <motion.div
          className="panel"
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          style={{ padding: '16px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#06b6d4', marginBottom: '8px' }}>
            <MousePointer size={18} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Clicks</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{totals.clicks.toLocaleString()}</div>
        </motion.div>

        <motion.div
          className="panel"
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          style={{ padding: '16px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', marginBottom: '8px' }}>
            <Users size={18} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Leads</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{totals.leads.toLocaleString()}</div>
        </motion.div>

        <motion.div
          className="panel"
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          style={{ padding: '16px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', marginBottom: '8px' }}>
            <Target size={18} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Conversions</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>{totals.conversions.toLocaleString()}</div>
        </motion.div>

        <motion.div
          className="panel"
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          style={{ padding: '16px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ec4899', marginBottom: '8px' }}>
            <TrendingUp size={18} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>Cost Per Lead (CPL)</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>
            {avgCpl != null ? `₹${avgCpl.toFixed(2)}` : 'N/A'}
          </div>
        </motion.div>

        <motion.div
          className="panel"
          whileHover={{ y: -3, transition: { duration: 0.15 } }}
          style={{ padding: '16px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#8b5cf6', marginBottom: '8px' }}>
            <Layers size={18} />
            <span style={{ fontSize: '12px', fontWeight: 600 }}>ROAS</span>
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text)' }}>
            {avgRoas != null ? `${avgRoas.toFixed(2)}x` : 'N/A'}
          </div>
        </motion.div>
      </div>

      {/* Channel Breakdown Table */}
      {channelBreakdown && channelBreakdown.channels.length > 0 ? (
        <div className="panel" style={{ padding: '20px', marginBottom: '24px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: 'var(--text)' }}>Channel Breakdown</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Channel</th>
                  <th style={{ padding: '10px' }}>Spend</th>
                  <th style={{ padding: '10px' }}>Impressions</th>
                  <th style={{ padding: '10px' }}>Clicks</th>
                  <th style={{ padding: '10px' }}>Leads</th>
                  <th style={{ padding: '10px' }}>Conversions</th>
                  <th style={{ padding: '10px' }}>CPL</th>
                  <th style={{ padding: '10px' }}>ROAS</th>
                </tr>
              </thead>
              <tbody>
                {channelBreakdown.channels.map((ch) => (
                  <tr key={ch.channel} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{ch.channel}</td>
                    <td style={{ padding: '10px' }}>₹{ch.ad_spend.toLocaleString()}</td>
                    <td style={{ padding: '10px' }}>{ch.impressions.toLocaleString()}</td>
                    <td style={{ padding: '10px' }}>{ch.clicks.toLocaleString()}</td>
                    <td style={{ padding: '10px' }}>{ch.leads.toLocaleString()}</td>
                    <td style={{ padding: '10px' }}>{ch.conversions.toLocaleString()}</td>
                    <td style={{ padding: '10px' }}>{ch.cpl != null ? `₹${ch.cpl.toFixed(2)}` : 'N/A'}</td>
                    <td style={{ padding: '10px' }}>{ch.roas != null ? `${ch.roas.toFixed(2)}x` : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Campaign Results Data Table */}
      <div className="panel" style={{ padding: '20px', marginBottom: '24px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--text)' }}>Logged Campaign Results</h2>
          <div style={{ position: 'relative', width: '240px' }}>
            <Search
              size={14}
              style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--muted)' }}
            />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 12px 6px 32px',
                borderRadius: '6px',
                background: 'var(--bg-secondary)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
                fontSize: '13px',
              }}
            />
          </div>
        </div>

        {isResultsLoading ? (
          <p className="animate-pulse" style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
            Loading campaign results...
          </p>
        ) : filteredCampaigns.length === 0 ? (
          <p style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
            No campaign results logged yet. Click "Log Campaign Result" above to add one.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Client</th>
                  <th style={{ padding: '10px' }}>Campaign Name</th>
                  <th style={{ padding: '10px' }}>Channel</th>
                  <th style={{ padding: '10px' }}>Period</th>
                  <th style={{ padding: '10px' }}>Spend</th>
                  <th style={{ padding: '10px' }}>Leads</th>
                  <th style={{ padding: '10px' }}>CPL</th>
                  <th style={{ padding: '10px' }}>ROAS</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCampaigns.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{c.client?.name || 'Client'}</td>
                    <td style={{ padding: '10px' }}>{c.campaign_name}</td>
                    <td style={{ padding: '10px' }}>
                      <span className="pill" style={{ fontSize: '11px' }}>
                        {c.channel}
                      </span>
                    </td>
                    <td style={{ padding: '10px', fontSize: '12px', color: 'var(--muted)' }}>
                      {c.start_date.slice(0, 10)} to {c.end_date.slice(0, 10)}
                    </td>
                    <td style={{ padding: '10px' }}>₹{Number(c.ad_spend ?? 0).toLocaleString()}</td>
                    <td style={{ padding: '10px' }}>{c.leads ?? 0}</td>
                    <td style={{ padding: '10px' }}>
                      {c.cpl != null ? `₹${Number(c.cpl).toFixed(2)}` : 'N/A'}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {c.roas != null ? `${Number(c.roas).toFixed(2)}x` : 'N/A'}
                    </td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="ghost-button"
                        style={{ padding: '4px 8px', marginRight: '6px' }}
                        onClick={() => {
                          setEditingCampaign(c)
                          setIsCampaignModalOpen(true)
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="ghost-button"
                        style={{ padding: '4px 8px', color: '#ef4444' }}
                        onClick={() => deleteCampaignMutation.mutate(c.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Content Performance Section */}
      <div className="panel" style={{ padding: '20px', borderRadius: '8px', background: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: 'var(--text)' }}>Content Performance</h2>
          <button
            className="ghost-button"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
            onClick={() => setIsContentModalOpen(true)}
            type="button"
          >
            <Plus size={14} />
            Log Content Item
          </button>
        </div>

        {safeContentItems.length === 0 ? (
          <p style={{ padding: '12px 0', color: 'var(--muted)', fontSize: '13px' }}>
            No content performance items logged for this selection.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Title</th>
                  <th style={{ padding: '10px' }}>Type</th>
                  <th style={{ padding: '10px' }}>Channel</th>
                  <th style={{ padding: '10px' }}>Views</th>
                  <th style={{ padding: '10px' }}>Engagement Rate</th>
                  <th style={{ padding: '10px' }}>Leads Attributed</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {safeContentItems.map((item) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px', fontWeight: 600 }}>{item.title}</td>
                    <td style={{ padding: '10px' }}>{item.content_type}</td>
                    <td style={{ padding: '10px' }}>{item.channel || '—'}</td>
                    <td style={{ padding: '10px' }}>{item.views?.toLocaleString() ?? 0}</td>
                    <td style={{ padding: '10px' }}>
                      {item.engagement_rate != null ? `${Number(item.engagement_rate)}%` : '—'}
                    </td>
                    <td style={{ padding: '10px' }}>{item.leads_attributed ?? 0}</td>
                    <td style={{ padding: '10px', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="ghost-button"
                        style={{ padding: '4px 8px', color: '#ef4444' }}
                        onClick={() => deleteContentMutation.mutate(item.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Campaign Result Modal with AnimatePresence */}
      <AnimatePresence>
        {isCampaignModalOpen && (
          <CampaignResultModal
            clients={clients}
            editingCampaign={editingCampaign}
            onClose={() => {
              setIsCampaignModalOpen(false)
              setEditingCampaign(null)
            }}
            onSubmit={(data) => campaignMutation.mutate({ id: editingCampaign?.id, data })}
            isSubmitting={campaignMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Content Performance Modal with AnimatePresence */}
      <AnimatePresence>
        {isContentModalOpen && (
          <ContentPerformanceModal
            clients={clients}
            onClose={() => setIsContentModalOpen(false)}
            onSubmit={(data) => contentMutation.mutate(data)}
            isSubmitting={contentMutation.isPending}
          />
        )}
      </AnimatePresence>
    </motion.section>
  )
}

function CampaignResultModal({
  clients,
  editingCampaign,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  clients: Array<{ id: string; name: string }>
  editingCampaign: CampaignResult | null
  onClose: () => void
  onSubmit: (data: CreateCampaignResultPayload) => void
  isSubmitting: boolean
}) {
  const [formData, setFormData] = useState<CreateCampaignResultPayload>({
    client_id: editingCampaign?.client_id || clients[0]?.id || '',
    campaign_name: editingCampaign?.campaign_name || '',
    channel: editingCampaign?.channel || 'Google Ads',
    start_date: editingCampaign?.start_date ? editingCampaign.start_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    end_date: editingCampaign?.end_date ? editingCampaign.end_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
    ad_spend: editingCampaign?.ad_spend != null ? Number(editingCampaign.ad_spend) : 0,
    impressions: editingCampaign?.impressions ?? 0,
    clicks: editingCampaign?.clicks ?? 0,
    leads: editingCampaign?.leads ?? 0,
    conversions: editingCampaign?.conversions ?? 0,
    revenue: editingCampaign?.revenue != null ? Number(editingCampaign.revenue) : 0,
    roas: editingCampaign?.roas != null ? Number(editingCampaign.roas) : undefined,
    notes: editingCampaign?.notes || '',
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
        style={{
          background: 'var(--card)',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '540px',
          padding: '24px',
          border: '1px solid var(--border)',
          color: 'var(--text)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--text)' }}>
            {editingCampaign ? 'Edit Campaign Result' : 'Log Campaign Result'}
          </h2>
          <button type="button" className="ghost-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(formData)
          }}
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}
        >
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Client
            </label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
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

          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Campaign Name
            </label>
            <input
              type="text"
              value={formData.campaign_name}
              onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
              required
              placeholder="e.g. Q3 Search Lead Gen"
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
              Channel
            </label>
            <select
              value={formData.channel}
              onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
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
              <option value="Google Ads">Google Ads</option>
              <option value="Meta">Meta Ads</option>
              <option value="LinkedIn">LinkedIn Ads</option>
              <option value="Organic">Organic</option>
              <option value="Email">Email</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Ad Spend (₹)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={formData.ad_spend ?? 0}
              onChange={(e) => setFormData({ ...formData, ad_spend: parseFloat(e.target.value) || 0 })}
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
              Start Date
            </label>
            <input
              type="date"
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
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
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              End Date
            </label>
            <input
              type="date"
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
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
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Impressions
            </label>
            <input
              type="number"
              min="0"
              value={formData.impressions ?? 0}
              onChange={(e) => setFormData({ ...formData, impressions: parseInt(e.target.value, 10) || 0 })}
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
              Clicks
            </label>
            <input
              type="number"
              min="0"
              value={formData.clicks ?? 0}
              onChange={(e) => setFormData({ ...formData, clicks: parseInt(e.target.value, 10) || 0 })}
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
              Leads
            </label>
            <input
              type="number"
              min="0"
              value={formData.leads ?? 0}
              onChange={(e) => setFormData({ ...formData, leads: parseInt(e.target.value, 10) || 0 })}
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
              Conversions
            </label>
            <input
              type="number"
              min="0"
              value={formData.conversions ?? 0}
              onChange={(e) => setFormData({ ...formData, conversions: parseInt(e.target.value, 10) || 0 })}
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

          <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="ghost-button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
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
              {isSubmitting ? 'Saving...' : 'Save Result'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function ContentPerformanceModal({
  clients,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  clients: Array<{ id: string; name: string }>
  onClose: () => void
  onSubmit: (data: any) => void
  isSubmitting: boolean
}) {
  const [formData, setFormData] = useState({
    client_id: clients[0]?.id || '',
    title: '',
    content_type: 'blog',
    channel: 'Organic',
    views: 0,
    engagement_rate: 0,
    leads_attributed: 0,
  })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18 }}
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
          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'var(--text)' }}>Log Content Performance</h2>
          <button type="button" className="ghost-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            onSubmit(formData)
          }}
          style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
        >
          <div>
            <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
              Client
            </label>
            <select
              value={formData.client_id}
              onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
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
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="e.g. PPC Retainer Optimization Guide"
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                Content Type
              </label>
              <select
                value={formData.content_type}
                onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
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
                <option value="blog">Blog</option>
                <option value="video">Video</option>
                <option value="carousel">Carousel</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>
                Views
              </label>
              <input
                type="number"
                min="0"
                value={formData.views}
                onChange={(e) => setFormData({ ...formData, views: parseInt(e.target.value, 10) || 0 })}
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '12px' }}>
            <button type="button" className="ghost-button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
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
              {isSubmitting ? 'Saving...' : 'Save Content'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}
