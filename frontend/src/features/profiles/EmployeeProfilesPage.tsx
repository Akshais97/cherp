import { useQuery } from '@tanstack/react-query'
import { BriefcaseBusiness, Cpu, Gauge, UserRoundCheck } from 'lucide-react'
import { normalizeApiError } from '../../lib/api/errors'
import { getTeamMembers } from '../users/api'

const teams = [
  'Brand Manager',
  'Copywriter',
  'Designer',
  'Video Editor',
  'SEO Specialist',
  'Performance Marketer',
  'Automation',
]

export function EmployeeProfilesPage() {
  const usersQuery = useQuery({ queryKey: ['employee-profiles'], queryFn: getTeamMembers })
  const users = usersQuery.data ?? []
  const error = usersQuery.error ? normalizeApiError(usersQuery.error).message : null

  return (
    <section className="employee-profiles-page">
      <div className="page-heading">
        <div>
          <p>People operations</p>
          <h1>Employee Profiles</h1>
        </div>
        <span className="pill">PM / Owner</span>
      </div>
      {error ? <div className="notice error">{error}</div> : null}
      <div className="profile-grid">
        {users.map((user, index) => (
          <article className="panel employee-profile-card" key={user.id}>
            <div className="panel-header">
              <div>
                <h2>{user.full_name}</h2>
                <span className="muted">{user.email}</span>
              </div>
              <UserRoundCheck size={17} />
            </div>
            <div className="employee-profile-metrics">
              <span><BriefcaseBusiness size={15} /> {teams[index % teams.length]}</span>
              <span><Gauge size={15} /> Availability normal</span>
              <span><Cpu size={15} /> Agent assignment coming soon</span>
            </div>
            <dl>
              <div><dt>Skills</dt><dd>Profile storage ready</dd></div>
              <div><dt>Designation</dt><dd>{teams[index % teams.length]}</dd></div>
              <div><dt>Experience</dt><dd>To be captured</dd></div>
              <div><dt>Current workload</dt><dd>{50 + (index * 9) % 55}%</dd></div>
            </dl>
            <button className="ghost-button" disabled type="button">
              Assign to agent - coming soon
            </button>
          </article>
        ))}
      </div>
    </section>
  )
}
