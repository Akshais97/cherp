import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, CheckCircle2, ListChecks, UserRoundCheck } from 'lucide-react'
import type React from 'react'
import { useMemo, useState } from 'react'
import { normalizeApiError } from '../../lib/api/errors'
import {
  getTeamMembers,
  getTeamMemberWorkload,
  type TeamMemberBlocker,
  type TeamMemberTask,
} from './api'

const taskStatusLabels: Record<TeamMemberTask['status'], string> = {
  yet_to_start: 'Yet to start',
  ongoing: 'Ongoing',
  blocked: 'Blocked',
  completed: 'Completed',
  task_approved_by_manager: 'Task Approved By Manager',
  rework: 'Rework',
  task_approved_by_client: 'Task Approved by client',
}

const priorityLabels: Record<TeamMemberTask['priority'], string> = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

const blockerStatusLabels: Record<TeamMemberBlocker['status'], string> = {
  open: 'Open',
  resolved: 'Resolved',
}

export function TeamMembersPage() {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [searchValue, setSearchValue] = useState('')
  const membersQuery = useQuery({
    queryKey: ['team-members'],
    queryFn: getTeamMembers,
  })
  const membersError = membersQuery.error
    ? normalizeApiError(membersQuery.error).message
    : null
  const members = useMemo(() => {
    const search = searchValue.trim().toLowerCase()
    return (membersQuery.data ?? []).filter((member) => {
      if (!search) return true
      return `${member.full_name} ${member.email}`.toLowerCase().includes(search)
    })
  }, [membersQuery.data, searchValue])

  return (
    <section className="team-members-page" data-testid="team-members-page">
      <div className="page-heading">
        <div>
          <p>Delivery team</p>
          <h1>Team Members</h1>
        </div>
        <span className="pill">Assignments</span>
      </div>

      {membersError ? <div className="notice error">{membersError}</div> : null}

      <div className="team-member-layout">
        <section className="panel team-member-list-panel" data-testid="team-member-list">
          <div className="panel-header">
            <h2>Team member list</h2>
            <span className="muted">
              {membersQuery.isLoading ? 'Loading...' : `${members.length} members`}
            </span>
          </div>

          <label className="field">
            <span>Search Team Members</span>
            <input
              data-testid="input-team-member-search"
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
            />
          </label>

          <div className="team-member-list">
            {members.map((member) => (
              <button
                className={
                  selectedMemberId === member.id
                    ? 'team-member-list-item active'
                    : 'team-member-list-item'
                }
                data-testid="team-member-row"
                key={member.id}
                onClick={() => setSelectedMemberId(member.id)}
                type="button"
              >
                <UserRoundCheck size={16} />
                <span>
                  <strong>{member.full_name}</strong>
                  <small>{member.email}</small>
                </span>
              </button>
            ))}
            {!membersQuery.isLoading && members.length === 0 ? (
              <div className="muted-card">No team members found.</div>
            ) : null}
          </div>
        </section>

        <TeamMemberDetailPanel memberId={selectedMemberId} />
      </div>
    </section>
  )
}

function TeamMemberDetailPanel({ memberId }: { memberId: string | null }) {
  const workloadQuery = useQuery({
    queryKey: ['team-member-workload', memberId],
    queryFn: () => getTeamMemberWorkload(memberId ?? ''),
    enabled: Boolean(memberId),
  })
  const workloadError = workloadQuery.error
    ? normalizeApiError(workloadQuery.error).message
    : null

  const data = workloadQuery.data
  const tasks = data?.tasks ?? []
  const blockers = data?.blockers ?? []
  const member = data?.member ?? null

  const openTasksList = useMemo(() => tasks.filter((task) => task.status !== 'task_approved_by_client'), [tasks])
  const openTasksCount = openTasksList.length
  const openBlockers = blockers.filter((blocker) => blocker.status === 'open').length

  const dailyTaskCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    openTasksList.forEach((t) => {
      if (t.due_date) {
        const dateStr = t.due_date.slice(0, 10)
        counts[dateStr] = (counts[dateStr] || 0) + 1
      }
    })
    return counts
  }, [openTasksList])

  const uniqueDeadlineDays = Object.keys(dailyTaskCounts).length
  const taskLoadIndex = uniqueDeadlineDays > 0 ? (openTasksCount / uniqueDeadlineDays).toFixed(1) : '0.0'

  const peakDailyLoad = useMemo(() => {
    const counts = Object.values(dailyTaskCounts)
    return counts.length > 0 ? Math.max(...counts) : 0
  }, [dailyTaskCounts])

  const loadCapacityLabel = useMemo(() => {
    if (peakDailyLoad >= 4) return { label: 'Overloaded', class: 'rework' }
    if (peakDailyLoad === 3) return { label: 'High Load', class: 'blocked' }
    if (peakDailyLoad === 2) return { label: 'Optimal Load', class: 'ongoing' }
    return { label: 'Light Load', class: 'yet_to_start' }
  }, [peakDailyLoad])

  if (!memberId) {
    return (
      <section className="panel muted-card" data-testid="team-member-detail-empty">
        Select a team member to review assigned tasks and related blockers.
      </section>
    )
  }

  if (workloadQuery.isLoading) {
    return (
      <section className="panel muted-card" data-testid="team-member-detail-loading">
        Loading team member workload...
      </section>
    )
  }

  if (workloadError || !data || !member) {
    return (
      <section className="panel muted-card" data-testid="team-member-detail-unavailable">
        {workloadError ?? 'Team member workload unavailable.'}
      </section>
    )
  }

  return (
    <section className="panel team-member-detail-panel" data-testid="team-member-detail-panel">
      <div className="panel-header workflow-title-row">
        <div>
          <h2>{member.full_name}</h2>
          <p>{member.email}</p>
        </div>
        <span className={member.is_active ? 'status-badge active' : 'status-badge archived'}>
          {member.is_active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="team-member-summary">
        <SummaryTile icon={<ListChecks size={16} />} label="Assigned tasks" value={tasks.length} />
        <SummaryTile icon={<CheckCircle2 size={16} />} label="Open tasks" value={openTasksCount} />
        <SummaryTile icon={<AlertTriangle size={16} />} label="Open blockers" value={openBlockers} />
      </div>

      <div className="panel-header compact-header" style={{ marginTop: '20px' }}>
        <h2>Task Load Analysis</h2>
      </div>
      <div className="team-member-summary" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginTop: '8px', gap: '12px' }}>
        <div className="team-summary-tile" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Overall Tasks</span>
          <strong>{tasks.length}</strong>
        </div>
        <div className="team-summary-tile" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase' }}>Tasks Load Index</span>
          <strong>{taskLoadIndex} <small style={{ fontSize: '10px', color: 'var(--muted)', fontWeight: 'normal' }}>tasks/day</small></strong>
        </div>
        <div className="team-summary-tile" style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '2px' }}>Load Capacity</span>
          <span className={`status-badge ${loadCapacityLabel.class}`} style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px' }}>
            {loadCapacityLabel.label}
          </span>
        </div>
      </div>

      {uniqueDeadlineDays > 0 ? (
        <div style={{ marginTop: '14px', padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--muted)', display: 'block', marginBottom: '8px', letterSpacing: '0.5px' }}>
            Daily Workload Density
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {Object.entries(dailyTaskCounts).map(([date, count]) => {
              const statusClass = count >= 4 ? 'rework' : count === 3 ? 'blocked' : count === 2 ? 'ongoing' : 'yet_to_start'
              return (
                <div key={date} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px' }}>
                  <strong>{date}</strong>
                  <span className={`status-badge ${statusClass}`} style={{ fontSize: '11px', padding: '2px 6px' }}>
                    {count} {count === 1 ? 'task' : 'tasks'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      <section className="team-work-section">
        <div className="panel-header compact-header">
          <h2>Tasks</h2>
          <span className="muted">{tasks.length}</span>
        </div>
        <div className="team-work-list" data-testid="team-member-task-list">
          {tasks.map((task) => (
            <TaskSummary key={task.id} task={task} />
          ))}
          {tasks.length === 0 ? <div className="muted-card">No assigned tasks.</div> : null}
        </div>
      </section>

      <section className="team-work-section">
        <div className="panel-header compact-header">
          <h2>Blockers</h2>
          <span className="muted">{blockers.length}</span>
        </div>
        <div className="team-work-list" data-testid="team-member-blocker-list">
          {blockers.map((blocker) => (
            <BlockerSummary key={blocker.id} blocker={blocker} />
          ))}
          {blockers.length === 0 ? <div className="muted-card">No blockers linked to assigned tasks.</div> : null}
        </div>
      </section>
    </section>
  )
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <div className="team-summary-tile">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function TaskSummary({ task }: { task: TeamMemberTask }) {
  return (
    <article className="team-work-item" data-testid="team-member-task-row">
      <div>
        <strong>{task.title}</strong>
        <p>
          {task.workflow.client.name} · {task.workflow.title} · Due{' '}
          {task.due_date?.slice(0, 10) ?? 'not set'}
        </p>
      </div>
      <div className="team-work-meta">
        <span className={`status-badge ${task.status}`}>
          {taskStatusLabels[task.status]}
        </span>
        <span>{priorityLabels[task.priority]}</span>
        <span>{task._count.blockers} open blockers</span>
      </div>
    </article>
  )
}

function BlockerSummary({ blocker }: { blocker: TeamMemberBlocker }) {
  return (
    <article className="team-work-item" data-testid="team-member-blocker-row">
      <div>
        <strong>{blocker.title}</strong>
        <p>
          {blocker.client.name} · {blocker.task.title} · Flagged{' '}
          {blocker.flagged_at.slice(0, 10)}
        </p>
      </div>
      <div className="team-work-meta">
        <span className={`status-badge ${blocker.status}`}>
          {blockerStatusLabels[blocker.status]}
        </span>
        <span>{blocker.severity}</span>
      </div>
    </article>
  )
}
