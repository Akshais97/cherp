import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Palette, Type, Users, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { getClients, updateClient, getClientLogs, type ClientRow, type ClientLog } from '../clients/api'
import { normalizeApiError } from '../../lib/api/errors'
import { useAuth } from '../../app/providers/useAuth'

export function BrandsPage() {
  const { currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [editingClient, setEditingClient] = useState<ClientRow | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  // Form State
  const [brandUrl, setBrandUrl] = useState('')
  const [instagramProfile, setInstagramProfile] = useState('')
  const [brandGuidelines, setBrandGuidelines] = useState('')
  const [logoAssets, setLogoAssets] = useState('')
  const [colorPalette, setColorPalette] = useState('')
  const [fonts, setFonts] = useState('')
  const [targetAudience, setTargetAudience] = useState('')
  const [competitorList, setCompetitorList] = useState('')
  const [positioningStatement, setPositioningStatement] = useState('')
  const [campaignHistory, setCampaignHistory] = useState('')
  const [communicationHistory, setCommunicationHistory] = useState('')

  const { data: clients = [], error: clientsQueryError, isLoading: isClientsLoading } = useQuery({
    queryKey: ['brands-clients'],
    queryFn: () => getClients(),
  })
  
  const { data: logs = [], isLoading: isLogsLoading } = useQuery({
    queryKey: ['client-logs', editingClient?.id],
    queryFn: () => getClientLogs(editingClient!.id),
    enabled: !!editingClient?.id,
  })

  const { mutate: updateBrandProfile, isPending: isSaving } = useMutation({
    mutationFn: (payload: any) => updateClient(editingClient!.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands-clients'] })
      queryClient.invalidateQueries({ queryKey: ['client-logs', editingClient?.id] })
      setEditingClient(null)
    },
    onError: (err: any) => {
      alert(normalizeApiError(err).message)
    },
  })

  const initListField = (val: any): string => {
    if (!val) return ''
    if (Array.isArray(val)) return val.join(', ')
    try {
      const parsed = typeof val === 'string' ? JSON.parse(val) : val
      if (Array.isArray(parsed)) return parsed.join(', ')
    } catch (e) {}
    return String(val)
  }

  const parseListField = (val: string): string[] => {
    if (!val) return []
    return val
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }

  useEffect(() => {
    if (editingClient) {
      setBrandUrl(editingClient.brand_url || '')
      setInstagramProfile(editingClient.instagram_profile || '')
      setBrandGuidelines(editingClient.brand_guidelines || '')
      setLogoAssets(initListField(editingClient.logo_assets))
      setColorPalette(initListField(editingClient.color_palette))
      setFonts(initListField(editingClient.fonts))
      setTargetAudience(editingClient.target_audience || '')
      setCompetitorList(initListField(editingClient.competitor_list))
      setPositioningStatement(editingClient.positioning_statement || '')
      setCampaignHistory(initListField(editingClient.campaign_history))
      setCommunicationHistory(initListField(editingClient.communication_history))
    }
  }, [editingClient])

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      brand_url: brandUrl,
      instagram_profile: instagramProfile,
      brand_guidelines: brandGuidelines,
      logo_assets: parseListField(logoAssets),
      color_palette: parseListField(colorPalette),
      fonts: parseListField(fonts),
      target_audience: targetAudience,
      competitor_list: parseListField(competitorList),
      positioning_statement: positioningStatement,
      campaign_history: parseListField(campaignHistory),
      communication_history: parseListField(communicationHistory),
    }
    updateBrandProfile(payload)
  }

  const formatLogEntry = (log: ClientLog) => {
    const dateStr = new Date(log.created_at).toLocaleString()
    const userName = log.user?.full_name || 'System'
    
    if (log.action_type === 'created') {
      return {
        date: dateStr,
        description: `${userName} created the brand profile.`,
      }
    }

    const before = (log.before_values as any) || {}
    const after = (log.after_values as any) || {}
    const changes: string[] = []

    const trackedFields: Record<string, string> = {
      brand_url: 'Brand URL',
      instagram_profile: 'Brand Profile',
      brand_guidelines: 'Brand Guidelines',
      logo_assets: 'Logo Assets',
      color_palette: 'Color Palette',
      fonts: 'Fonts',
      target_audience: 'Target Audience',
      competitor_list: 'Competitor List',
      positioning_statement: 'Positioning Statement',
      campaign_history: 'Campaign History',
      communication_history: 'Communication History',
    }

    Object.entries(trackedFields).forEach(([key, label]) => {
      const prev = before[key]
      const curr = after[key]
      
      const prevStr = Array.isArray(prev) ? prev.join(', ') : (prev ? String(prev) : '')
      const currStr = Array.isArray(curr) ? curr.join(', ') : (curr ? String(curr) : '')
      
      if (prevStr !== currStr) {
        if (!prevStr) {
          changes.push(`set ${label} to "${currStr}"`)
        } else if (!currStr) {
          changes.push(`removed ${label}`)
        } else {
          changes.push(`changed ${label} from "${prevStr}" to "${currStr}"`)
        }
      }
    })

    if (changes.length === 0) {
      return {
        date: dateStr,
        description: `${userName} updated profile metadata.`,
      }
    }

    return {
      date: dateStr,
      description: `${userName} ${changes.join(', ')}.`,
    }
  }

  const renderFieldValue = (fieldName: string, value: any) => {
    if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      return <span className="muted" style={{ fontStyle: 'italic' }}>Not configured</span>
    }
    
    if (Array.isArray(value)) {
      if (fieldName === 'Color Palette') {
        return (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
            {value.map((color: string, idx) => (
              <span 
                key={idx} 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '4px',
                  fontSize: '11px',
                  background: 'var(--hover-bg, #F5F5F2)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)'
                }}
              >
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, display: 'inline-block', border: '1px solid #ccc' }}></span>
                {color}
              </span>
            ))}
          </div>
        )
      }
      return <span>{value.join(', ')}</span>
    }

    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue, #3B6DD6)', textDecoration: 'underline' }}>
          {value}
        </a>
      )
    }

    return <span>{value.toString()}</span>
  }

  const error = clientsQueryError ? normalizeApiError(clientsQueryError).message : null
  const canEdit = currentUser?.role === 'super_admin' || currentUser?.role === 'project_manager' || currentUser?.role === 'team_member'

  const filteredClients = clients.filter((client) => {
    const term = searchTerm.toLowerCase().trim()
    if (!term) return true
    return (
      client.name.toLowerCase().includes(term) ||
      client.industry.toLowerCase().includes(term) ||
      client.service_type.toLowerCase().includes(term)
    )
  })

  return (
    <section className="brands-page">
      <div className="page-heading">
        <div>
          <p>Brand library</p>
          <h1>Brands</h1>
        </div>
        <span className="pill">Profiles</span>
      </div>
      {error ? <div className="notice error">{error}</div> : null}

      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <input
            type="text"
            placeholder="Search brands by name, industry, or service..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              fontSize: '13px',
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--card, #FFF)',
              color: 'var(--text)',
              outline: 'none',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'border-color 0.15s ease'
            }}
          />
        </div>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
          Showing {filteredClients.length} of {clients.length} brands
        </span>
      </div>

      <div className="brand-profile-grid">
        {filteredClients.map((client) => (
          <article className="panel brand-profile-card" key={client.id}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2>{client.name}</h2>
                <span className="muted">{client.industry} / {client.service_type}</span>
              </div>
              {canEdit && (
                <button 
                  className="ghost-button" 
                  onClick={() => setEditingClient(client)}
                  style={{ minHeight: '32px', height: '32px', fontSize: '12px', padding: '0 12px', borderRadius: '6px' }}
                  type="button"
                >
                  Edit Profile
                </button>
              )}
            </div>
            <div className="brand-signal-row">
              <span><Palette size={15} /> Palette fields ready</span>
              <span><Type size={15} /> Font fields ready</span>
              <span><Users size={15} /> Audience fields ready</span>
            </div>
            <dl>
              <div>
                <dt>Brand URL</dt>
                <dd>{renderFieldValue('Brand URL', client.brand_url)}</dd>
              </div>
              <div>
                <dt>Brand Profile on Instagram and other socials</dt>
                <dd>{renderFieldValue('Brand Profile on Instagram and other socials', client.instagram_profile)}</dd>
              </div>
              <div>
                <dt>Brand Guidelines</dt>
                <dd>{renderFieldValue('Brand Guidelines', client.brand_guidelines)}</dd>
              </div>
              <div>
                <dt>Logo Assets</dt>
                <dd>{renderFieldValue('Logo Assets', client.logo_assets)}</dd>
              </div>
              <div>
                <dt>Color Palette</dt>
                <dd>{renderFieldValue('Color Palette', client.color_palette)}</dd>
              </div>
              <div>
                <dt>Fonts</dt>
                <dd>{renderFieldValue('Fonts', client.fonts)}</dd>
              </div>
              <div>
                <dt>Target Audience</dt>
                <dd>{renderFieldValue('Target Audience', client.target_audience)}</dd>
              </div>
              <div>
                <dt>Competitor List</dt>
                <dd>{renderFieldValue('Competitor List', client.competitor_list)}</dd>
              </div>
              <div>
                <dt>Positioning Statement</dt>
                <dd>{renderFieldValue('Positioning Statement', client.positioning_statement)}</dd>
              </div>
              <div>
                <dt>Campaign History</dt>
                <dd>{renderFieldValue('Campaign History', client.campaign_history)}</dd>
              </div>
              <div>
                <dt>Communication History</dt>
                <dd>{renderFieldValue('Communication History', client.communication_history)}</dd>
              </div>
            </dl>
          </article>
        ))}
        {!isClientsLoading && clients.length === 0 ? (
          <div className="muted-card">No brands yet.</div>
        ) : null}
        {!isClientsLoading && clients.length > 0 && filteredClients.length === 0 ? (
          <div className="muted-card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px' }}>
            No brands found matching "{searchTerm}".
          </div>
        ) : null}
      </div>

      {editingClient && createPortal(
        <div className="modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1100, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }}>
          <section className="task-detail-modal" style={{ maxWidth: '900px', width: '95%', display: 'flex', flexDirection: 'column', maxHeight: '90vh', background: 'var(--card, #FFF)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', padding: 0 }}>
            <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px' }}>Edit Brand Profile: {editingClient.name}</h2>
                <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Update profile metadata, assets, guidelines and change logs</span>
              </div>
              <button aria-label="Close brand profile editor" className="icon-button" onClick={() => setEditingClient(null)} type="button" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                <X size={17} />
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', padding: '16px', overflowY: 'auto', flex: 1 }}>
              {/* Form fields (Left) */}
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Brand URL</label>
                    <input
                      type="text"
                      placeholder="https://example.com"
                      value={brandUrl}
                      onChange={(e) => setBrandUrl(e.target.value)}
                      style={{ width: '100%', fontSize: '13px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input, #FFF)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Instagram & Social Profiles</label>
                    <input
                      type="text"
                      placeholder="e.g. @brandname"
                      value={instagramProfile}
                      onChange={(e) => setInstagramProfile(e.target.value)}
                      style={{ width: '100%', fontSize: '13px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input, #FFF)', color: 'var(--text)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Brand Guidelines URL / Text</label>
                  <input
                    type="text"
                    placeholder="Guidelines URL or summary"
                    value={brandGuidelines}
                    onChange={(e) => setBrandGuidelines(e.target.value)}
                    style={{ width: '100%', fontSize: '13px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input, #FFF)', color: 'var(--text)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Logo Assets (comma/newline separated)</label>
                    <input
                      type="text"
                      placeholder="url1, url2..."
                      value={logoAssets}
                      onChange={(e) => setLogoAssets(e.target.value)}
                      style={{ width: '100%', fontSize: '13px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input, #FFF)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Color Palette (comma/newline separated hex)</label>
                    <input
                      type="text"
                      placeholder="#FF0000, #00FF00..."
                      value={colorPalette}
                      onChange={(e) => setColorPalette(e.target.value)}
                      style={{ width: '100%', fontSize: '13px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input, #FFF)', color: 'var(--text)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Fonts (comma/newline separated)</label>
                    <input
                      type="text"
                      placeholder="Inter, Outfit, Roboto..."
                      value={fonts}
                      onChange={(e) => setFonts(e.target.value)}
                      style={{ width: '100%', fontSize: '13px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input, #FFF)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Competitor List (comma/newline separated)</label>
                    <input
                      type="text"
                      placeholder="Competitor A, Competitor B..."
                      value={competitorList}
                      onChange={(e) => setCompetitorList(e.target.value)}
                      style={{ width: '100%', fontSize: '13px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-input, #FFF)', color: 'var(--text)' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Target Audience</label>
                  <textarea
                    placeholder="Describe target demographics..."
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    rows={2}
                    style={{ width: '100%', fontSize: '13px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', resize: 'vertical', fontFamily: 'inherit', background: 'var(--bg-input, #FFF)', color: 'var(--text)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Positioning Statement</label>
                  <textarea
                    placeholder="Enter positioning statement..."
                    value={positioningStatement}
                    onChange={(e) => setPositioningStatement(e.target.value)}
                    rows={2}
                    style={{ width: '100%', fontSize: '13px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', resize: 'vertical', fontFamily: 'inherit', background: 'var(--bg-input, #FFF)', color: 'var(--text)' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Campaign History (comma/newline separated)</label>
                    <textarea
                      placeholder="Campaign 1, Campaign 2..."
                      value={campaignHistory}
                      onChange={(e) => setCampaignHistory(e.target.value)}
                      rows={2}
                      style={{ width: '100%', fontSize: '13px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', resize: 'vertical', fontFamily: 'inherit', background: 'var(--bg-input, #FFF)', color: 'var(--text)' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Communication History (comma/newline separated)</label>
                    <textarea
                      placeholder="Call logged 06/20, Email sent 06/21..."
                      value={communicationHistory}
                      onChange={(e) => setCommunicationHistory(e.target.value)}
                      rows={2}
                      style={{ width: '100%', fontSize: '13px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)', resize: 'vertical', fontFamily: 'inherit', background: 'var(--bg-input, #FFF)', color: 'var(--text)' }}
                    />
                  </div>
                </div>
              </form>

              {/* Change Log History Timeline (Right) */}
              <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border)', paddingLeft: '16px', maxHeight: '100%', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 12px 0' }}>Activity Change History</h3>
                {isLogsLoading ? (
                  <div className="muted" style={{ fontSize: '12px' }}>Loading history logs...</div>
                ) : logs.length === 0 ? (
                  <div className="muted" style={{ fontSize: '12px', fontStyle: 'italic' }}>No changes logged yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '12px' }}>
                    {logs.map((log) => {
                      const entry = formatLogEntry(log)
                      return (
                        <div key={log.id} style={{ display: 'flex', flexDirection: 'column', gap: '2px', borderBottom: '1px dashed var(--border)', paddingBottom: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 'bold' }}>{entry.date}</span>
                          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>{entry.description}</p>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="panel-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', padding: '16px', borderTop: '1px solid var(--border)' }}>
              <button 
                className="ghost-button" 
                onClick={() => setEditingClient(null)} 
                type="button" 
                disabled={isSaving}
                style={{ minHeight: '36px', height: '36px' }}
              >
                Cancel
              </button>
              <button 
                className="primary-action" 
                onClick={handleSave} 
                type="submit" 
                disabled={isSaving}
                style={{ width: 'auto', margin: 0, minHeight: '36px', height: '36px', padding: '0 18px' }}
              >
                {isSaving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </section>
        </div>,
        document.body
      )}
    </section>
  )
}
