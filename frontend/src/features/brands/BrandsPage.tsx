import { useQuery } from '@tanstack/react-query'
import { ExternalLink, Palette, Type, Users } from 'lucide-react'
import { getClients } from '../clients/api'
import { normalizeApiError } from '../../lib/api/errors'

const brandFields = [
  'Brand URL',
  'Brand Profile on Instagram and other socials',
  'Brand Guidelines',
  'Logo Assets',
  'Color Palette',
  'Fonts',
  'Target Audience',
  'Competitor List',
  'Positioning Statement',
  'Campaign History',
  'Communication History',
]

export function BrandsPage() {
  const clientsQuery = useQuery({ queryKey: ['brands-clients'], queryFn: () => getClients() })
  const clients = clientsQuery.data ?? []
  const error = clientsQuery.error ? normalizeApiError(clientsQuery.error).message : null

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
      <div className="brand-profile-grid">
        {clients.map((client) => (
          <article className="panel brand-profile-card" key={client.id}>
            <div className="panel-header">
              <div>
                <h2>{client.name}</h2>
                <span className="muted">{client.industry} / {client.service_type}</span>
              </div>
              <ExternalLink size={16} />
            </div>
            <div className="brand-signal-row">
              <span><Palette size={15} /> Palette fields ready</span>
              <span><Type size={15} /> Font fields ready</span>
              <span><Users size={15} /> Audience fields ready</span>
            </div>
            <dl>
              {brandFields.map((field) => (
                <div key={field}>
                  <dt>{field}</dt>
                  <dd>Stored after brand profile migration</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
        {!clientsQuery.isLoading && clients.length === 0 ? (
          <div className="muted-card">No brands yet.</div>
        ) : null}
      </div>
    </section>
  )
}
