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
  pending: 'Pending',
  in_progress: 'In progress',
  blocked: 'Blocked',
  completed: 'Completed',
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

  if (workloadError || !workloadQuery.data) {
    return (
      <section className="panel muted-card" data-testid="team-member-detail-unavailable">
        {workloadError ?? 'Team member workload unavailable.'}
      </section>
    )
  }

  const { member, tasks, blockers } = workloadQuery.data
  const openTasks = tasks.filter((task) => task.status !== 'completed').length
  const openBlockers = blockers.filter((blocker) => blocker.status === 'open').length

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
        <SummaryTile icon={<CheckCircle2 size={16} />} label="Open tasks" value={openTasks} />
        <SummaryTile icon={<AlertTriangle size={16} />} label="Open blockers" value={openBlockers} />
      </div>

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
