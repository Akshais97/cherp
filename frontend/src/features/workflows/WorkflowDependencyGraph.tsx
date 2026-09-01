import { ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react'

export interface TaskNode {
  id: string
  title: string
  status: string
  depends_on?: string[]
}

interface WorkflowDependencyGraphProps {
  tasks: TaskNode[]
  onSelectTask?: (taskId: string) => void
}

export function WorkflowDependencyGraph({ tasks, onSelectTask }: WorkflowDependencyGraphProps) {
  const taskMap = new Map<string, TaskNode>()
  tasks.forEach((t) => taskMap.set(t.id, t))

  // Find tasks that have dependencies or are dependencies of other tasks
  const tasksWithDeps = tasks.filter((t) => t.depends_on && t.depends_on.length > 0)
  const isPrerequisiteFor = new Map<string, string[]>()

  tasks.forEach((t) => {
    if (t.depends_on) {
      t.depends_on.forEach((depId) => {
        const current = isPrerequisiteFor.get(depId) || []
        isPrerequisiteFor.set(depId, [...current, t.id])
      })
    }
  })

  if (tasksWithDeps.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted)', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px border var(--border)' }}>
        <Clock size={24} style={{ marginBottom: '8px', opacity: 0.6 }} />
        <p style={{ margin: 0, fontSize: '13px' }}>No task dependencies configured in this workflow.</p>
      </div>
    )
  }

  return (
    <div className="workflow-dependency-graph" style={{ padding: '20px', background: 'var(--card)', borderRadius: '10px', border: '1px solid var(--border)' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '600', color: 'var(--text)' }}>
        Workflow Dependency DAG Canvas
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {tasksWithDeps.map((task) => (
          <div
            key={task.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
            }}
          >
            {/* Prerequisite Node(s) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--muted)', fontWeight: 'bold' }}>
                Prerequisites (Must Complete First)
              </span>
              {task.depends_on?.map((depId) => {
                const dep = taskMap.get(depId)
                const isComplete = dep?.status === 'completed'
                return (
                  <div
                    key={depId}
                    onClick={() => dep && onSelectTask?.(dep.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'var(--card)',
                      border: isComplete ? '1px solid rgba(45,168,107,0.3)' : '1px solid rgba(221,68,68,0.3)',
                      cursor: 'pointer',
                    }}
                  >
                    {isComplete ? (
                      <CheckCircle2 size={14} style={{ color: 'var(--green)' }} />
                    ) : (
                      <AlertCircle size={14} style={{ color: 'var(--red)' }} />
                    )}
                    <span style={{ fontSize: '12.5px', fontWeight: '500', color: 'var(--text)' }}>
                      {dep?.title || 'Unknown Task'}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--muted)', marginLeft: 'auto', textTransform: 'capitalize' }}>
                      {dep?.status || 'unknown'}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Connecting Directed Edge Arrow */}
            <div style={{ display: 'flex', alignItems: 'center', color: 'var(--accent)', padding: '0 8px' }}>
              <ArrowRight size={20} />
            </div>

            {/* Target Dependent Node */}
            <div
              onClick={() => onSelectTask?.(task.id)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '6px',
                background: 'var(--card)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 'bold' }}>
                Blocked Dependent Task
              </span>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', fontWeight: '600', color: 'var(--text)' }}>
                {task.title}
              </p>
              <span style={{ fontSize: '11px', color: 'var(--secondary-text)', textTransform: 'capitalize' }}>
                Status: {task.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
