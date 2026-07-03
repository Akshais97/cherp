import { Eye } from 'lucide-react'
import { type WorkflowTask, type UserOption, type TaskStatus, type TaskPriority } from '../../workflows/api'

interface TaskGridViewProps {
  tasks: WorkflowTask[]
  users: UserOption[]
  onTaskClick: (task: WorkflowTask) => void
  onUpdateTask: (taskId: string, fields: any) => void
}

const taskStatusLabels: Record<TaskStatus, string> = {
  yet_to_start: 'Yet to start',
  ongoing: 'Ongoing',
  blocked: 'Blocked',
  completed: 'Pending Approval',
  task_approved_by_manager: 'Approved by Manager',
  rework: 'Rework',
  task_approved_by_client: 'Approved by Client',
}

const labelColors: Record<string, { bg: string; text: string }> = {
  'Content Marketing': { bg: '#E0F2FE', text: '#0369A1' },
  'Search Engine Optimization': { bg: '#E0F8E9', text: '#15803D' },
  'Performance Marketing': { bg: '#FEE2E2', text: '#B91C1C' },
  'Strategy': { bg: '#F3E8FF', text: '#6B21A8' },
  'Creative Statics': { bg: '#FEF3C7', text: '#B45309' },
  'Video / Motion Graphics': { bg: '#FCE7F3', text: '#BE185D' },
  'Social Media': { bg: '#E0F7FA', text: '#006064' },
  'Follow Up': { bg: '#F1F5F9', text: '#334155' },
  'Website Dev': { bg: '#FFF1F2', text: '#9F1239' },
  'BM Task List': { bg: '#ECFDF5', text: '#047857' }
}

export function TaskGridView({ tasks, users: _users, onTaskClick, onUpdateTask }: TaskGridViewProps) {
  const getPriorityBadgeClass = (priority: TaskPriority) => {
    switch (priority) {
      case 'high': return 'priority-high-badge'
      case 'medium': return 'priority-medium-badge'
      case 'low': return 'priority-low-badge'
      default: return 'priority-medium-badge'
    }
  }

  const getChecklistStats = (task: WorkflowTask) => {
    const list = task.checklist || []
    const completed = list.filter(item => item.is_completed).length
    return {
      completed,
      total: list.length,
      percentage: list.length > 0 ? Math.round((completed / list.length) * 100) : 0
    }
  }

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div data-testid="task-grid-view" className="panel" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: '12px' }}>
      <div className="table-wrap" style={{ maxHeight: 'calc(80vh - 180px)', overflowY: 'auto' }}>
        <table className="tasks-grid-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead style={{ background: 'var(--hover-bg, #F5F5F2)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 1 }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Task Name</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Assignee</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Start Date</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Due Date</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Brand</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Priority</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Labels</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Slot</th>
              <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600' }}>Checklist</th>
              <th style={{ textAlign: 'center', padding: '12px 16px', fontWeight: '600', width: '60px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const { completed, total } = getChecklistStats(task)
              const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['completed', 'task_approved_by_manager', 'task_approved_by_client'].includes(task.status)
              
              return (
                <tr 
                  key={task.id} 
                  className="grid-task-row"
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                >
                  <td style={{ padding: '12px 16px', fontWeight: '500', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <button 
                      onClick={() => onTaskClick(task)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text)', fontWeight: '500', textAlign: 'left', cursor: 'pointer', outline: 'none', padding: 0 }}
                      className="hover:underline"
                    >
                      {task.title}
                    </button>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {task.assignee ? (
                        <>
                          {task.assignee.avatar_url ? (
                            <img 
                              src={task.assignee.avatar_url} 
                              alt={task.assignee.full_name} 
                              style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                            />
                          ) : (
                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--accent-light, #EEF4FF)', color: 'var(--accent, #3B6DD6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                              {task.assignee.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span style={{ fontSize: '12px' }}>{task.assignee.full_name}</span>
                        </>
                      ) : (
                        <span style={{ color: 'var(--muted-text, #9A9A9A)', fontStyle: 'italic', fontSize: '12px' }}>Unassigned</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--secondary-text, #6B6B6B)' }}>
                    {formatDate(task.start_date)}
                  </td>
                  <td style={{ 
                    padding: '12px 16px', 
                    color: isOverdue ? 'var(--danger-red, #D44)' : 'var(--secondary-text, #6B6B6B)',
                    fontWeight: isOverdue ? '600' : 'normal'
                  }}>
                    {formatDate(task.due_date)}
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--secondary-text, #6B6B6B)' }}>
                    {task.client?.name || task.workflow?.client?.name || 'Internal'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={task.status}
                      onChange={(e) => onUpdateTask(task.id, { status: e.target.value })}
                      style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--card, #FFF)', cursor: 'pointer' }}
                      className={`status-badge-select ${task.status}`}
                    >
                      {Object.entries(taskStatusLabels).map(([statusKey, statusLabel]) => (
                        <option key={statusKey} value={statusKey}>{statusLabel}</option>
                      ))}
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={task.priority}
                      onChange={(e) => onUpdateTask(task.id, { priority: e.target.value })}
                      style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--card, #FFF)', cursor: 'pointer' }}
                      className={`priority-badge-select ${getPriorityBadgeClass(task.priority)}`}
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '160px' }}>
                      {task.labels && task.labels.length > 0 ? (
                        task.labels.map((lbl) => {
                          const styling = labelColors[lbl] || { bg: '#F1F5F9', text: '#334155' }
                          return (
                            <span 
                              key={lbl} 
                              style={{ 
                                fontSize: '9px', 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                backgroundColor: styling.bg, 
                                color: styling.text, 
                                fontWeight: '600' 
                              }}
                            >
                              {lbl}
                            </span>
                          )
                        })
                      ) : (
                        <span style={{ color: 'var(--muted-text, #9A9A9A)', fontSize: '11px' }}>-</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <select
                      value={task.slot || ''}
                      onChange={(e) => onUpdateTask(task.id, { slot: e.target.value || null })}
                      style={{ fontSize: '11px', padding: '2px 8px', border: '1px solid var(--border)', borderRadius: '4px', background: 'var(--card, #FFF)', cursor: 'pointer' }}
                    >
                      <option value="">Unslotted</option>
                      <option value="Slot 1">Slot 1</option>
                      <option value="Slot 2">Slot 2</option>
                      <option value="Slot 3">Slot 3</option>
                      <option value="Slot 4">Slot 4</option>
                      <option value="Slot 5">Slot 5</option>
                      <option value="Slot 6">Slot 6</option>
                      <option value="Slot 7">Slot 7</option>
                      <option value="Slot 8">Slot 8</option>
                      <option value="Slot 9">Slot 9</option>
                      <option value="Slot 10">Slot 10</option>
                      <option value="Slot 11">Slot 11</option>
                    </select>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {total > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 'bold' }}>{completed}/{total}</span>
                        <div style={{ width: '40px', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round((completed / total) * 100)}%`, height: '100%', background: 'var(--accent, #3B6DD6)' }}></div>
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--muted-text, #9A9A9A)', fontSize: '11px' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <button 
                      onClick={() => onTaskClick(task)}
                      style={{ background: 'var(--hover-bg, #F5F5F2)', border: '1px solid var(--border)', padding: '4px', borderRadius: '4px', color: 'var(--secondary-text)', cursor: 'pointer' }}
                      title="Quick Look"
                      type="button"
                    >
                      <Eye size={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted-text)' }}>
                  No tasks match the active filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
