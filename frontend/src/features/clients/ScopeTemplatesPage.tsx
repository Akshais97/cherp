import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Copy, Edit3, Plus, RefreshCw, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { getScopeTemplates, seedScopeTemplates, updateScopeTemplate, type ScopeTemplate } from './api'
import { normalizeApiError } from '../../lib/api/errors'

export function ScopeTemplatesPage() {
  const queryClient = useQueryClient()
  const [editingTemplate, setEditingTemplate] = useState<ScopeTemplate | null>(null)
  
  const { data: templates = [], isLoading, error } = useQuery({
    queryKey: ['scope-templates-page'],
    queryFn: getScopeTemplates,
  })

  const seedMutation = useMutation({
    mutationFn: seedScopeTemplates,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-templates-page'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ScopeTemplate> }) =>
      updateScopeTemplate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scope-templates-page'] })
      setEditingTemplate(null)
    },
  })

  if (isLoading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--secondary)' }}>
        <p className="animate-pulse">Loading scope templates...</p>
      </div>
    )
  }

  if (error) {
    const apiError = normalizeApiError(error)
    return (
      <div className="panel notice error" style={{ margin: '24px' }}>
        <h3>Error loading templates</h3>
        <p>{apiError.message}</p>
      </div>
    )
  }

  return (
    <section className="scope-templates-page" data-testid="scope-templates-page" style={{ padding: '8px' }}>
      <div className="page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p>Service Configurations</p>
          <h1>Scope Templates</h1>
        </div>
        <button
          className="ghost-button"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}
          onClick={() => seedMutation.mutate()}
          disabled={seedMutation.isPending}
          type="button"
        >
          <RefreshCw size={15} className={seedMutation.isPending ? 'animate-spin' : ''} />
          {seedMutation.isPending ? 'Syncing...' : 'Sync System Presets'}
        </button>
      </div>

      {updateMutation.isError ? (
        <div className="notice error" style={{ marginBottom: '16px' }}>
          {normalizeApiError(updateMutation.error).message}
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginTop: '24px' }}>
        {templates.map((template) => {
          const month1Tasks = template.default_tasks?.month_1 || []
          return (
            <div key={template.id} className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                  <Copy size={20} style={{ color: 'var(--blue)' }} />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{template.name}</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--secondary)', margin: '0 0 16px' }}>
                  {template.description || 'No description provided.'}
                </p>
                <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
                  <span>Industry: <strong>{template.industry}</strong></span>
                  <span>·</span>
                  <span>Type: <strong>{template.service_type}</strong></span>
                </div>
                <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
                  <span style={{ fontWeight: '600', display: 'block', marginBottom: '6px' }}>Month 1 Task Checklist:</span>
                  <ul style={{ margin: 0, paddingLeft: '20px', listStyleType: 'disc', color: 'var(--secondary)' }}>
                    {month1Tasks.slice(0, 3).map((task: any, idx: number) => (
                      <li key={idx}>{task.title}</li>
                    ))}
                    {month1Tasks.length > 3 ? (
                      <li style={{ fontStyle: 'italic', listStyle: 'none' }}>+ {month1Tasks.length - 3} more tasks</li>
                    ) : null}
                    {month1Tasks.length === 0 ? <li style={{ fontStyle: 'italic', listStyle: 'none' }}>No tasks configured</li> : null}
                  </ul>
                </div>
              </div>

              <button
                className="primary-action"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => setEditingTemplate(template)}
                type="button"
              >
                <Edit3 size={15} /> Customize Template
              </button>
            </div>
          )
        })}
      </div>

      {editingTemplate ? (
        <TemplateEditorModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
          onSave={(updatedTasks) => {
            updateMutation.mutate({
              id: editingTemplate.id,
              payload: {
                default_tasks: {
                  ...editingTemplate.default_tasks,
                  month_1: updatedTasks,
                },
              },
            })
          }}
          isSaving={updateMutation.isPending}
        />
      ) : null}
    </section>
  )
}

interface TemplateTask {
  title: string
  description?: string
  priority?: 'high' | 'medium' | 'low'
  due_offset_days?: number
}

function TemplateEditorModal({
  template,
  onClose,
  onSave,
  isSaving,
}: {
  template: ScopeTemplate
  onClose: () => void
  onSave: (tasks: TemplateTask[]) => void
  isSaving: boolean
}) {
  const [tasks, setTasks] = useState<TemplateTask[]>(() => {
    const defaultTasks = template.default_tasks?.month_1 || []
    return JSON.parse(JSON.stringify(defaultTasks))
  })

  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'high' | 'medium' | 'low'>('medium')
  const [newTaskOffset, setNewTaskOffset] = useState<number>(3)

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return
    const newTask: TemplateTask = {
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || undefined,
      priority: newTaskPriority,
      due_offset_days: Number(newTaskOffset),
    }
    setTasks([...tasks, newTask])
    setNewTaskTitle('')
    setNewTaskDesc('')
    setNewTaskPriority('medium')
    setNewTaskOffset(3)
  }

  const handleRemoveTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <section className="task-detail-modal" style={{ maxWidth: '640px', width: '90%' }}>
        <div className="panel-header">
          <div>
            <h2 style={{ margin: 0 }}>Customize {template.name}</h2>
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Configuring default Month 1 tasks</span>
          </div>
          <button aria-label="Close template editor" className="icon-button" onClick={onClose} type="button" disabled={isSaving}>
            <X size={17} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '16px 0', maxHeight: '420px', overflowY: 'auto', paddingRight: '8px' }}>
          
          {/* Add Task Form */}
          <div style={{ padding: '16px', border: '1px dashed var(--border-strong)', borderRadius: '8px', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold' }}>Add Default Task</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px' }}>
              <input
                placeholder="Task Title (e.g. Design Logo)"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                style={{ fontSize: '13px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}
              />
              <select
                value={newTaskPriority}
                onChange={(e) => setNewTaskPriority(e.target.value as any)}
                style={{ fontSize: '13px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '12px' }}>
              <input
                placeholder="Description (optional)"
                value={newTaskDesc}
                onChange={(e) => setNewTaskDesc(e.target.value)}
                style={{ fontSize: '13px', padding: '6px 10px', borderRadius: '4px', border: '1px solid var(--border)' }}
              />
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                Offset (Days):
                <input
                  type="number"
                  min="0"
                  value={newTaskOffset}
                  onChange={(e) => setNewTaskOffset(Number(e.target.value))}
                  style={{ width: '50px', fontSize: '13px', padding: '4px', borderRadius: '4px', border: '1px solid var(--border)', textAlign: 'center' }}
                />
              </label>
            </div>
            <button
              className="primary-action"
              style={{ alignSelf: 'flex-end', padding: '6px 16px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
              onClick={handleAddTask}
              type="button"
            >
              <Plus size={14} /> Add Task
            </button>
          </div>

          {/* Current Tasks List */}
          <div>
            <h4 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 'bold' }}>Default Task Checklist ({tasks.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tasks.map((task, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    background: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '13px', fontWeight: '600' }}>{task.title}</span>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      Priority: <strong style={{ textTransform: 'capitalize' }}>{task.priority || 'medium'}</strong> · Due Offset: <strong>{task.due_offset_days ?? 0} days</strong>
                    </span>
                  </div>
                  <button
                    aria-label={`Remove task ${task.title}`}
                    className="icon-button"
                    style={{ color: 'var(--red)' }}
                    onClick={() => handleRemoveTask(idx)}
                    type="button"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {tasks.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}>
                  No tasks configured. Add tasks above to populate this checklist.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
          <button className="ghost-button" onClick={onClose} type="button" disabled={isSaving}>
            Cancel
          </button>
          <button className="primary-action" onClick={() => onSave(tasks)} type="button" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </section>
    </div>
  )
}
