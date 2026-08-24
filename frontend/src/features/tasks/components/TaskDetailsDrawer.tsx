import { useQuery, useQueryClient } from '@tanstack/react-query'
import { X, Plus, Trash2, CheckCircle, Paperclip, Reply, AtSign, CornerDownRight } from 'lucide-react'
import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../../../app/providers/useAuth'
import { normalizeApiError } from '../../../lib/api/errors'
import { getBlockers, createBlocker, resolveBlocker } from '../../blockers/api'
import {
  getTaskComments,
  addTaskComment,
  getTaskAttachments,
  addTaskAttachment,
  deleteTaskAttachment,
  getTaskLogs,
  requestTaskApproval,
  approveTask,
  requestTaskChanges,
  deleteTask,
  type TaskStatus,
  type WorkflowTask,
  type UserOption,
  type TaskComment,
} from '../../workflows/api'

interface TaskDetailsDrawerProps {
  task: WorkflowTask
  users: UserOption[]
  onClose: () => void
  onSuccess: () => void
  onUpdateTask: (taskId: string, fields: any) => Promise<any>
}

type TabType = 'details' | 'comments' | 'attachments' | 'logs'

const taskStatusLabels: Record<TaskStatus, string> = {
  yet_to_start: 'Yet to start',
  ongoing: 'Ongoing',
  blocked: 'Blocked',
  completed: 'Pending Approval',
  task_approved_by_manager: 'Approved by Manager',
  rework: 'Rework',
  task_approved_by_client: 'Approved by Client',
}

const defaultLabelsList = [
  'Content Marketing',
  'Search Engine Optimization',
  'Performance Marketing',
  'Strategy',
  'Creative Statics',
  'Video / Motion Graphics',
  'Social Media',
  'Follow Up',
  'Website Dev',
  'BM Task List'
]

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

export function TaskDetailsDrawer({ task, users, onClose, onSuccess, onUpdateTask }: TaskDetailsDrawerProps) {
  const queryClient = useQueryClient()
  const { currentUser } = useAuth()
  const isPM = currentUser?.role === 'super_admin' || currentUser?.role === 'project_manager'
  const isAssigned = task.assignee?.email === currentUser?.email
  const canEditDetails = isPM
  const canEditProgress = isPM || isAssigned

  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [error, setError] = useState<string | null>(null)
  
  // Title & description inline states
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description || '')

  // Local states for fields
  const [localAssignee, setLocalAssignee] = useState(task.assigned_to ?? '')
  const [localStatus, setLocalStatus] = useState(task.status)
  const [localPriority, setLocalPriority] = useState(task.priority)
  const [localDueDate, setLocalDueDate] = useState(task.due_date ? task.due_date.slice(0, 10) : '')
  const [localStartDate, setLocalStartDate] = useState(task.start_date ? task.start_date.slice(0, 10) : '')
  const [localSlot, setLocalSlot] = useState(task.slot ?? '')
  const [localRecurrenceRule, setLocalRecurrenceRule] = useState(task.recurrence_rule ?? '')
  const [localRecurrenceEndDate, setLocalRecurrenceEndDate] = useState(task.recurrence_end_date ? task.recurrence_end_date.slice(0, 10) : '')
  const [localLabels, setLocalLabels] = useState<string[]>(task.labels || [])
  
  // Lifecycle reasons
  const [showActionDialog, setShowActionDialog] = useState<'request_approval' | 'approve' | 'request_changes' | 'delete' | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [isActionSubmitting, setIsActionSubmitting] = useState(false)

  // Labels selector toggle
  const [showLabelsDropdown, setShowLabelsDropdown] = useState(false)

  // Checklist state
  const checklist = useMemo<any[]>(() => {
    try {
      if (typeof task.checklist === 'string') {
        return JSON.parse(task.checklist)
      }
      return Array.isArray(task.checklist) ? task.checklist : []
    } catch {
      return []
    }
  }, [task.checklist])
  const [newChecklistItem, setNewChecklistItem] = useState('')

  // Comments feed
  const { data: comments = [] } = useQuery({
    queryKey: ['task-comments', task.id],
    queryFn: () => getTaskComments(task.id),
    enabled: activeTab === 'comments',
  })

  // Attachments list
  const { data: attachments = [] } = useQuery({
    queryKey: ['task-attachments', task.id],
    queryFn: () => getTaskAttachments(task.id),
    enabled: activeTab === 'attachments',
  })

  // Audit logs
  const { data: logs = [] } = useQuery({
    queryKey: ['task-logs', task.id],
    queryFn: () => getTaskLogs(task.id),
    enabled: activeTab === 'logs',
  })

  // Blocker records
  const [blockerTitle, setBlockerTitle] = useState('')
  const [blockerDescription, setBlockerDescription] = useState('')
  const [blockerImpact, setBlockerImpact] = useState('')
  const [blockerSeverity, setBlockerSeverity] = useState<'high' | 'medium' | 'low'>('medium')
  const [blockerAssignee, setBlockerAssignee] = useState('')
  const [isBlockerSubmitting, setIsBlockerSubmitting] = useState(false)

  const [resolvingBlockerId, setResolvingBlockerId] = useState<string | null>(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [isResolving, setIsResolving] = useState(false)

  const { data: blockers = [] } = useQuery({
    queryKey: ['task-blockers', task.id],
    queryFn: () => getBlockers({ task_id: task.id }),
  })

  useEffect(() => {
    setTitle(task.title)
    setDescription(task.description || '')
    setLocalAssignee(task.assigned_to ?? '')
    setLocalStatus(task.status)
    setLocalPriority(task.priority)
    setLocalDueDate(task.due_date ? task.due_date.slice(0, 10) : '')
    setLocalStartDate(task.start_date ? task.start_date.slice(0, 10) : '')
    setLocalSlot(task.slot ?? '')
    setLocalRecurrenceRule(task.recurrence_rule ?? '')
    setLocalRecurrenceEndDate(task.recurrence_end_date ? task.recurrence_end_date.slice(0, 10) : '')
    setLocalLabels(task.labels || [])
  }, [task])

  const [isSaving, setIsSaving] = useState(false)

  const isDirty = useMemo(() => {
    const origTitle = task.title || ''
    const origDescription = task.description || ''
    const origAssignee = task.assigned_to ?? ''
    const origStatus = task.status || ''
    const origPriority = task.priority || ''
    const origSlot = task.slot ?? ''
    const origStartDate = task.start_date ? task.start_date.slice(0, 10) : ''
    const origDueDate = task.due_date ? task.due_date.slice(0, 10) : ''
    const origRecurrenceRule = task.recurrence_rule ?? ''
    const origRecurrenceEndDate = task.recurrence_end_date ? task.recurrence_end_date.slice(0, 10) : ''
    const origLabels = task.labels || []

    const sortedLocalLabels = [...localLabels].sort()
    const sortedOrigLabels = [...origLabels].sort()

    return (
      title !== origTitle ||
      description !== origDescription ||
      localAssignee !== origAssignee ||
      localStatus !== origStatus ||
      localPriority !== origPriority ||
      localSlot !== origSlot ||
      localStartDate !== origStartDate ||
      localDueDate !== origDueDate ||
      localRecurrenceRule !== origRecurrenceRule ||
      localRecurrenceEndDate !== origRecurrenceEndDate ||
      JSON.stringify(sortedLocalLabels) !== JSON.stringify(sortedOrigLabels)
    )
  }, [
    title,
    description,
    localAssignee,
    localStatus,
    localPriority,
    localSlot,
    localStartDate,
    localDueDate,
    localRecurrenceRule,
    localRecurrenceEndDate,
    localLabels,
    task
  ])

  const handleSaveTask = async () => {
    if (!isDirty) return
    setIsSaving(true)
    setError(null)
    try {
      const payload: any = {}
      if (title !== task.title) {
        if (!title.trim()) {
          throw new Error('Task title is required')
        }
        payload.title = title.trim()
      }
      if (description !== (task.description || '')) {
        payload.description = description
      }
      if (localAssignee !== (task.assigned_to ?? '')) {
        payload.assigned_to = localAssignee || null
      }
      if (localStatus !== task.status) {
        payload.status = localStatus
      }
      if (localPriority !== task.priority) {
        payload.priority = localPriority
      }
      if (localSlot !== (task.slot ?? '')) {
        payload.slot = localSlot || null
      }
      
      const origStartDate = task.start_date ? task.start_date.slice(0, 10) : ''
      if (localStartDate !== origStartDate) {
        payload.start_date = localStartDate ? localStartDate + 'T00:00:00.000Z' : null
      }

      const origDueDate = task.due_date ? task.due_date.slice(0, 10) : ''
      if (localDueDate !== origDueDate) {
        payload.due_date = localDueDate ? localDueDate + 'T12:00:00.000Z' : null
      }

      if (localRecurrenceRule !== (task.recurrence_rule ?? '')) {
        payload.recurrence_rule = localRecurrenceRule || null
        payload.recurrence_type = localRecurrenceRule || null
      }

      const origRecurrenceEndDate = task.recurrence_end_date ? task.recurrence_end_date.slice(0, 10) : ''
      if (localRecurrenceEndDate !== origRecurrenceEndDate) {
        payload.recurrence_end_date = localRecurrenceEndDate ? localRecurrenceEndDate + 'T23:59:59.000Z' : null
      }

      const sortedLocalLabels = [...localLabels].sort()
      const sortedOrigLabels = [...(task.labels || [])].sort()
      if (JSON.stringify(sortedLocalLabels) !== JSON.stringify(sortedOrigLabels)) {
        payload.labels = localLabels
      }

      await onUpdateTask(task.id, payload)
    } catch (err: any) {
      setError(normalizeApiError(err).message || err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateBlocker = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!blockerTitle.trim() || !blockerDescription.trim() || !blockerAssignee) return
    setIsBlockerSubmitting(true)
    setError(null)
    try {
      await createBlocker({
        task_id: task.id,
        title: blockerTitle.trim(),
        description: blockerDescription.trim(),
        severity: blockerSeverity,
        impact: blockerImpact.trim() || undefined,
        assigned_to: blockerAssignee,
      })
      setBlockerTitle('')
      setBlockerDescription('')
      setBlockerImpact('')
      setBlockerSeverity('medium')
      setBlockerAssignee('')
      queryClient.invalidateQueries({ queryKey: ['task-blockers', task.id] })
      onSuccess()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    } finally {
      setIsBlockerSubmitting(false)
    }
  }

  const handleResolveBlocker = async (blockerId: string) => {
    if (!resolutionNotes.trim()) return
    setIsResolving(true)
    setError(null)
    try {
      await resolveBlocker(blockerId, { resolution_notes: resolutionNotes.trim() })
      setResolvingBlockerId(null)
      setResolutionNotes('')
      queryClient.invalidateQueries({ queryKey: ['task-blockers', task.id] })
      onSuccess()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    } finally {
      setIsResolving(false)
    }
  }

  // Comments submit & threading/mention state
  const [commentContent, setCommentContent] = useState('')
  const [isCommentAdding, setIsCommentAdding] = useState(false)
  const [replyingTo, setReplyingTo] = useState<TaskComment | null>(null)
  const [selectedMentionIds, setSelectedMentionIds] = useState<string[]>([])
  const [showMentionDropdown, setShowMentionDropdown] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')

  const topLevelComments = useMemo(() => {
    return (comments as TaskComment[]).filter((c) => !c.parent_comment_id)
  }, [comments])

  const repliesByParentId = useMemo(() => {
    const map: Record<string, TaskComment[]> = {}
    ;(comments as TaskComment[]).forEach((c) => {
      if (c.parent_comment_id) {
        if (!map[c.parent_comment_id]) {
          map[c.parent_comment_id] = []
        }
        map[c.parent_comment_id].push(c)
      }
    })
    return map
  }, [comments])

  const filteredMentionUsers = useMemo(() => {
    if (!mentionQuery) return users
    const q = mentionQuery.toLowerCase()
    return users.filter(
      (u) => u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [users, mentionQuery])

  const handleCommentTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setCommentContent(val)

    const cursorPos = e.target.selectionStart
    const textBeforeCursor = val.slice(0, cursorPos)
    const lastAtIndex = textBeforeCursor.lastIndexOf('@')

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)
      if (!/\s/.test(textAfterAt)) {
        setMentionQuery(textAfterAt)
        setShowMentionDropdown(true)
        return
      }
    }
    setShowMentionDropdown(false)
  }

  const handleSelectMentionUser = (user: UserOption) => {
    const lastAtIndex = commentContent.lastIndexOf('@')
    let updatedText = commentContent
    if (lastAtIndex !== -1) {
      updatedText = commentContent.slice(0, lastAtIndex) + `@${user.full_name} `
    } else {
      updatedText = commentContent + `@${user.full_name} `
    }
    setCommentContent(updatedText)
    if (!selectedMentionIds.includes(user.id)) {
      setSelectedMentionIds((prev) => [...prev, user.id])
    }
    setShowMentionDropdown(false)
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentContent.trim()) return
    setIsCommentAdding(true)
    setError(null)
    try {
      await addTaskComment(task.id, {
        content: commentContent.trim(),
        parent_comment_id: replyingTo?.id || undefined,
        mentioned_user_ids: selectedMentionIds.length > 0 ? selectedMentionIds : undefined,
      })
      setCommentContent('')
      setReplyingTo(null)
      setSelectedMentionIds([])
      setShowMentionDropdown(false)
      queryClient.invalidateQueries({ queryKey: ['task-comments', task.id] })
      onSuccess()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    } finally {
      setIsCommentAdding(false)
    }
  }

  const renderFormattedComment = (text: string) => {
    const mentionRegex = /(@\[?[A-Za-z0-9._ -]+\]?(?:\([0-9a-f-]+\))?)/g
    const parts = text.split(mentionRegex)

    return parts.map((part, index) => {
      if (part.startsWith('@')) {
        const cleanName = part.replace(/^@\[?/, '').replace(/\]?\(.*$/, '').trim()
        return (
          <span
            key={index}
            style={{
              background: 'rgba(59, 109, 214, 0.12)',
              color: 'var(--accent, #3B6DD6)',
              padding: '1px 6px',
              borderRadius: '4px',
              fontWeight: '600',
              fontSize: '11px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              marginRight: '2px',
            }}
          >
            <AtSign size={10} />
            {cleanName}
          </span>
        )
      }
      return part
    })
  }

  const renderCommentCard = (c: TaskComment, isReply = false) => {
    const replies = repliesByParentId[c.id] || []

    return (
      <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div
          style={{
            background: isReply ? 'var(--card, #FFFFFF)' : 'var(--hover-bg, #F5F5F2)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '10px 12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: 'var(--accent, #3B6DD6)',
                  color: '#FFF',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {c.author?.full_name ? c.author.full_name[0].toUpperCase() : 'U'}
              </div>
              <strong style={{ fontSize: '11px' }}>{c.author?.full_name || 'Author'}</strong>
              {c.parent_comment?.author?.full_name && (
                <span style={{ fontSize: '10px', color: 'var(--muted-text)' }}>
                  replied to <strong style={{ color: 'var(--secondary-text)' }}>{c.parent_comment.author.full_name}</strong>
                </span>
              )}
            </div>
            <span style={{ fontSize: '9px', color: 'var(--muted-text)' }}>
              {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <p style={{ margin: '4px 0 6px 0', fontSize: '12px', lineHeight: '1.4' }}>
            {renderFormattedComment(c.content)}
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setReplyingTo(c)}
              type="button"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent, #3B6DD6)',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              <Reply size={10} /> Reply
            </button>
          </div>
        </div>

        {replies.length > 0 && (
          <div style={{ borderLeft: '2px solid var(--accent, #3B6DD6)', marginLeft: '12px', paddingLeft: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {replies.map((reply) => renderCommentCard(reply, true))}
          </div>
        )}
      </div>
    )
  }

  // Attachments submit
  const [attachmentName, setAttachmentName] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [isAttachmentAdding, setIsAttachmentAdding] = useState(false)
  const handleAddAttachment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!attachmentName.trim() || !attachmentUrl.trim()) return
    setIsAttachmentAdding(true)
    try {
      await addTaskAttachment(task.id, { file_name: attachmentName, file_url: attachmentUrl })
      setAttachmentName('')
      setAttachmentUrl('')
      queryClient.invalidateQueries({ queryKey: ['task-attachments', task.id] })
      onSuccess()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    } finally {
      setIsAttachmentAdding(false)
    }
  }

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await deleteTaskAttachment(task.id, attachmentId)
      queryClient.invalidateQueries({ queryKey: ['task-attachments', task.id] })
      onSuccess()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    }
  }

  // Checklist edits
  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newChecklistItem.trim()) return
    const newItem = {
      id: Math.random().toString(36).substring(2, 9),
      text: newChecklistItem.trim(),
      is_completed: false,
    }
    const updatedChecklist = [...checklist, newItem]
    setNewChecklistItem('')
    await onUpdateTask(task.id, { checklist: updatedChecklist })
  }

  const handleToggleChecklistItem = async (itemId: string) => {
    const updatedChecklist = checklist.map((item) =>
      item.id === itemId ? { ...item, is_completed: !item.is_completed } : item
    )
    await onUpdateTask(task.id, { checklist: updatedChecklist })
  }

  const handleDeleteChecklistItem = async (itemId: string) => {
    const updatedChecklist = checklist.filter((item) => item.id !== itemId)
    await onUpdateTask(task.id, { checklist: updatedChecklist })
  }

  // Labels select toggle helper
  const handleToggleLabel = (lbl: string) => {
    setLocalLabels(prev => {
      if (prev.includes(lbl)) {
        return prev.filter(item => item !== lbl)
      } else {
        return [...prev, lbl]
      }
    })
  }

  // Special lifecycle request
  const handleLifecycleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (showActionDialog === 'request_changes' && !actionReason.trim()) {
      setError('Rework reason is required')
      return
    }
    setIsActionSubmitting(true)
    setError(null)
    try {
      if (showActionDialog === 'request_approval') {
        await requestTaskApproval(task.id, { reason: actionReason })
      } else if (showActionDialog === 'approve') {
        await approveTask(task.id, { reason: actionReason })
      } else if (showActionDialog === 'request_changes') {
        await requestTaskChanges(task.id, { reason: actionReason })
      } else if (showActionDialog === 'delete') {
        await deleteTask(task.id)
        onClose()
        onSuccess()
        return
      }
      setShowActionDialog(null)
      setActionReason('')
      onSuccess()
    } catch (err: any) {
      setError(normalizeApiError(err).message)
    } finally {
      setIsActionSubmitting(false)
    }
  }

  const isLocked = task.status === 'task_approved_by_manager' || task.status === 'task_approved_by_client'

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        onClick={onClose}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.4)', zIndex: 99
        }}
      />
      
      {/* Sliding Side Drawer Panel */}
      <section style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: '560px', maxWidth: '100vw',
        background: 'var(--card, #FFF)', borderLeft: '1px solid var(--border)',
        zIndex: 100, display: 'flex', flexDirection: 'column',
        boxShadow: '-6px 0 24px rgba(0,0,0,0.06)'
      }}>
        
        {/* Drawer Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', padding: '20px', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
            {isLocked && (
              <span style={{ fontSize: '11px', color: 'var(--green, #2DA86B)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={12} /> Task Locked & Approved
              </span>
            )}
            <input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!canEditDetails || isLocked}
              style={{ fontSize: '18px', fontWeight: '700', border: 'none', background: 'transparent', width: '100%', outline: 'none', color: 'var(--text)' }}
            />
            <span style={{ fontSize: '11px', color: 'var(--muted-text)' }}>
              Brand: {task.client?.name || task.workflow?.client?.name || 'Internal'}
            </span>
          </div>
          <button 
            onClick={onClose}
            style={{ padding: '6px', background: 'var(--hover-bg, #F5F5F2)', border: 'none', borderRadius: '50%', cursor: 'pointer' }}
            type="button"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', padding: '0 20px', gap: '8px' }}>
          {(['details', 'comments', 'attachments', 'logs'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 16px', fontSize: '13px', fontWeight: '600',
                border: 'none', background: 'transparent', cursor: 'pointer',
                borderBottom: activeTab === tab ? '2px solid var(--accent, #3B6DD6)' : '2px solid transparent',
                color: activeTab === tab ? 'var(--accent, #3B6DD6)' : 'var(--secondary-text)'
              }}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Drawer Scrollable Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {error && <div className="notice error" style={{ marginBottom: '16px' }}>{error}</div>}

          {/* TAB 1: DETAILS */}
          {activeTab === 'details' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Inline Properties Fields Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label className="field" style={{ margin: 0 }}>
                  <span>Assignee</span>
                  <select
                    value={localAssignee}
                    onChange={(e) => setLocalAssignee(e.target.value)}
                    disabled={!canEditDetails || isLocked}
                  >
                    <option value="">Unassigned</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                </label>

                <label className="field" style={{ margin: 0 }}>
                  <span>Status</span>
                  <select
                    value={localStatus}
                    onChange={(e) => setLocalStatus(e.target.value as TaskStatus)}
                    disabled={!canEditProgress || isLocked}
                  >
                    {Object.entries(taskStatusLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </label>

                <label className="field" style={{ margin: 0 }}>
                  <span>Priority</span>
                  <select
                    value={localPriority}
                    onChange={(e) => setLocalPriority(e.target.value as any)}
                    disabled={!canEditDetails || isLocked}
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>

                <label className="field" style={{ margin: 0 }}>
                  <span>Slot Assignment</span>
                  <select
                    value={localSlot}
                    onChange={(e) => setLocalSlot(e.target.value)}
                    disabled={!canEditDetails || isLocked}
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
                </label>

                <label className="field" style={{ margin: 0 }}>
                  <span>Start Date</span>
                  <input
                    type="date"
                    value={localStartDate}
                    onChange={(e) => setLocalStartDate(e.target.value)}
                    disabled={!canEditDetails || isLocked}
                  />
                </label>

                <label className="field" style={{ margin: 0 }}>
                  <span>Due Date</span>
                  <input
                    type="date"
                    value={localDueDate}
                    onChange={(e) => setLocalDueDate(e.target.value)}
                    disabled={!canEditDetails || isLocked}
                  />
                </label>
              </div>

              {/* Multi-Label Selector */}
              <div style={{ position: 'relative' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--secondary-text)', display: 'block', marginBottom: '6px' }}>Task Labels</span>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {localLabels.map(lbl => {
                    const styling = labelColors[lbl] || { bg: '#F1F5F9', text: '#334155' }
                    return (
                      <span 
                        key={lbl} 
                        style={{ 
                          fontSize: '11px', padding: '4px 10px', borderRadius: '4px',
                          backgroundColor: styling.bg, color: styling.text, fontWeight: '700' 
                        }}
                      >
                        {lbl}
                      </span>
                    )
                  })}
                  <button
                    onClick={() => !isLocked && setShowLabelsDropdown(!showLabelsDropdown)}
                    style={{
                      padding: '4px 10px', fontSize: '11px', fontWeight: '600',
                      border: '1px dashed var(--border)', borderRadius: '4px',
                      background: 'transparent', cursor: isLocked ? 'default' : 'pointer'
                    }}
                    type="button"
                  >
                    + Edit Labels
                  </button>
                </div>

                {/* Dropdown panel for checkboxes */}
                {showLabelsDropdown && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0,
                    width: '240px', background: 'var(--card, #FFF)', border: '1px solid var(--border)',
                    borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 10, padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px',
                    marginTop: '4px'
                  }}>
                    {defaultLabelsList.map(lbl => {
                      const isChecked = localLabels.includes(lbl)
                      return (
                        <label 
                          key={lbl} 
                          style={{ 
                            display: 'flex', alignItems: 'center', gap: '8px', 
                            fontSize: '12px', padding: '4px 8px', borderRadius: '4px',
                            cursor: 'pointer', background: isChecked ? 'var(--hover-bg, #F5F5F2)' : 'transparent'
                          }}
                        >
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => handleToggleLabel(lbl)}
                          />
                          <span style={{ 
                            backgroundColor: labelColors[lbl]?.bg, 
                            color: labelColors[lbl]?.text, 
                            padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', fontSize: '10px'
                          }}>
                            {lbl}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Recurrence Rule block */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '16px', background: 'var(--hover-bg, #F5F5F2)' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', display: 'block', marginBottom: '8px' }}>
                  Repeat Rule Configuration
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <label className="field" style={{ margin: 0 }}>
                    <span>Interval</span>
                    <select
                      value={localRecurrenceRule}
                      onChange={(e) => setLocalRecurrenceRule(e.target.value)}
                      disabled={!canEditDetails || isLocked}
                    >
                      <option value="">None (One-time task)</option>
                      <option value="daily">Daily (Repeats everyday)</option>
                      <option value="weekdays">Weekdays (Mon - Fri)</option>
                      <option value="weekly">Weekly (Every 7 days)</option>
                    </select>
                  </label>

                  <label className="field" style={{ margin: 0 }}>
                    <span>Ends On</span>
                    <input
                      type="date"
                      value={localRecurrenceEndDate}
                      onChange={(e) => setLocalRecurrenceEndDate(e.target.value)}
                      disabled={!canEditDetails || !localRecurrenceRule || isLocked}
                    />
                  </label>
                </div>
              </div>

              {/* Description */}
              <label className="field" style={{ margin: 0 }}>
                <span>Notes / Description</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe task scope or add operational guidelines..."
                  rows={4}
                  disabled={!canEditDetails || isLocked}
                />
              </label>

              {/* Checklist / Subtasks section */}
              <div>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', display: 'block', marginBottom: '10px' }}>
                  Subtasks Checklist
                </span>
                
                {/* List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                  {checklist.map((item) => (
                    <div 
                      key={item.id} 
                      style={{ 
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                        padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '6px' 
                      }}
                    >
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isLocked ? 'default' : 'pointer', fontSize: '13px' }}>
                        <input
                          type="checkbox"
                          checked={item.is_completed}
                          onChange={() => !isLocked && handleToggleChecklistItem(item.id)}
                          disabled={isLocked}
                        />
                        <span style={{ textDecoration: item.is_completed ? 'line-through' : 'none', color: item.is_completed ? 'var(--muted-text)' : 'var(--text)' }}>
                          {item.text}
                        </span>
                      </label>
                      {!isLocked && (
                        <button
                          onClick={() => handleDeleteChecklistItem(item.id)}
                          style={{ padding: '4px', background: 'transparent', border: 'none', color: 'var(--danger-red, #D44)', cursor: 'pointer' }}
                          title="Delete item"
                          type="button"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                  {checklist.length === 0 && (
                    <div style={{ padding: '12px', background: 'var(--hover-bg, #F5F5F2)', border: '1px dashed var(--border)', borderRadius: '8px', fontSize: '12px', color: 'var(--muted-text)', textAlign: 'center' }}>
                      No subtasks added
                    </div>
                  )}
                </div>

                {/* Create checklist form */}
                {!isLocked && (
                  <form onSubmit={handleAddChecklistItem} style={{ display: 'flex', gap: '8px' }}>
                    <input
                      value={newChecklistItem}
                      onChange={(e) => setNewChecklistItem(e.target.value)}
                      placeholder="Add new subtask item..."
                      style={{ flex: 1, padding: '6px 12px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '6px' }}
                    />
                    <button 
                      type="submit"
                      style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--accent, #3B6DD6)', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      <Plus size={14} /> Add
                    </button>
                  </form>
                )}
              </div>

              {/* Blockers logging segment */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text)', display: 'block', marginBottom: '10px' }}>
                  Blockers ({blockers.length})
                </span>

                {/* List Blockers */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {blockers.map((blk: any) => (
                    <div 
                      key={blk.id} 
                      style={{ 
                        padding: '12px', border: '1px solid var(--border)', borderRadius: '8px',
                        borderLeft: blk.status === 'open' ? '4px solid var(--red, #D44)' : '4px solid var(--green, #2DA86B)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                        <strong style={{ fontSize: '12px' }}>{blk.title}</strong>
                        <span style={{ fontSize: '10px', textTransform: 'uppercase', padding: '1px 5px', borderRadius: '4px', background: blk.status === 'open' ? 'var(--red-light)' : 'var(--green-light)', color: blk.status === 'open' ? 'var(--red)' : 'var(--green)' }}>
                          {blk.status}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 6px 0', fontSize: '11px', color: 'var(--secondary-text)' }}>{blk.description}</p>
                      
                      {blk.status === 'open' ? (
                        resolvingBlockerId === blk.id ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                            <input 
                              placeholder="Resolution notes..."
                              value={resolutionNotes}
                              onChange={(e) => setResolutionNotes(e.target.value)}
                              style={{ padding: '4px 8px', fontSize: '11px', border: '1px solid var(--border)', borderRadius: '4px' }}
                            />
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button onClick={() => handleResolveBlocker(blk.id)} disabled={isResolving} style={{ fontSize: '10px', padding: '2px 8px', background: 'var(--green, #2DA86B)', color: '#FFF', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                                {isResolving ? 'Resolving...' : 'Confirm'}
                              </button>
                              <button onClick={() => setResolvingBlockerId(null)} style={{ fontSize: '10px', padding: '2px 8px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <button onClick={() => setResolvingBlockerId(blk.id)} style={{ fontSize: '11px', padding: '2px 8px', background: 'var(--green-light)', color: 'var(--green)', border: '1px solid rgba(45,168,107,0.2)', borderRadius: '4px', cursor: 'pointer' }}>
                            ✓ Mark Resolved
                          </button>
                        )
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--muted-text)', fontStyle: 'italic' }}>
                          Resolved: {blk.resolution_notes}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Blocker form */}
                {!isLocked && (
                  <form onSubmit={handleCreateBlocker} style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--secondary-text)' }}>Flag New Blocker</span>
                    <input 
                      placeholder="Blocker Title"
                      value={blockerTitle}
                      onChange={(e) => setBlockerTitle(e.target.value)}
                      required
                      style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                    <textarea 
                      placeholder="Provide impact details..."
                      value={blockerDescription}
                      onChange={(e) => setBlockerDescription(e.target.value)}
                      required
                      rows={2}
                      style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px' }}
                    />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <select
                        value={blockerSeverity}
                        onChange={(e) => setBlockerSeverity(e.target.value as any)}
                        style={{ fontSize: '11px', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px' }}
                      >
                        <option value="high">High Severity</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                      <select
                        value={blockerAssignee}
                        onChange={(e) => setBlockerAssignee(e.target.value)}
                        required
                        style={{ fontSize: '11px', padding: '4px', border: '1px solid var(--border)', borderRadius: '4px' }}
                      >
                        <option value="">Assign resolver...</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                    </div>
                    <button type="submit" disabled={isBlockerSubmitting} style={{ background: 'var(--red, #D44)', color: '#FFF', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                      {isBlockerSubmitting ? 'Flagging...' : 'Flag Blocker'}
                    </button>
                  </form>
                )}
              </div>

            </div>
          )}

          {/* TAB 2: COMMENTS */}
          {activeTab === 'comments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                {topLevelComments.map((c: TaskComment) => renderCommentCard(c, false))}
                {comments.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted-text)', fontSize: '12px', fontStyle: 'italic' }}>
                    No comments yet
                  </div>
                )}
              </div>

              <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                {/* Replying indicator banner */}
                {replyingTo && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      background: 'rgba(59, 109, 214, 0.1)',
                      border: '1px solid rgba(59, 109, 214, 0.2)',
                      borderRadius: '6px',
                      fontSize: '11px',
                      color: 'var(--accent, #3B6DD6)',
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CornerDownRight size={12} />
                      Replying to <strong>{replyingTo.author?.full_name || 'comment'}</strong>
                    </span>
                    <button
                      onClick={() => setReplyingTo(null)}
                      type="button"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                {/* Mentions dropdown */}
                {showMentionDropdown && filteredMentionUsers.length > 0 && (
                  <div
                    style={{
                      background: 'var(--card, #FFF)',
                      border: '1px solid var(--border)',
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      maxHeight: '140px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    {filteredMentionUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleSelectMentionUser(u)}
                        style={{
                          padding: '6px 12px',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 'none',
                          borderBottom: '1px solid var(--border)',
                          cursor: 'pointer',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <AtSign size={12} style={{ color: 'var(--accent, #3B6DD6)' }} />
                        <strong>{u.full_name}</strong>
                        <span style={{ color: 'var(--muted-text)', fontSize: '10px' }}>({u.email})</span>
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  placeholder="Post comment / task update... Type @ to mention a team member"
                  value={commentContent}
                  onChange={handleCommentTextChange}
                  rows={3}
                  style={{ padding: '8px 12px', fontSize: '13px', border: '1px solid var(--border)', borderRadius: '6px' }}
                />
                <button type="submit" disabled={isCommentAdding} style={{ alignSelf: 'flex-end', padding: '6px 16px', background: 'var(--accent, #3B6DD6)', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {isCommentAdding ? 'Posting...' : 'Send Message'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: ATTACHMENTS */}
          {activeTab === 'attachments' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {attachments.map((a: any) => (
                  <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', border: '1px solid var(--border)', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Paperclip size={14} style={{ color: 'var(--secondary-text)' }} />
                      <a href={a.file_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--accent, #3B6DD6)', fontWeight: '600' }}>
                        {a.file_name}
                      </a>
                    </div>
                    <button onClick={() => handleDeleteAttachment(a.id)} style={{ padding: '4px', background: 'transparent', border: 'none', color: 'var(--danger-red, #D44)', cursor: 'pointer' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
                {attachments.length === 0 && (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted-text)', fontSize: '12px', fontStyle: 'italic' }}>
                    No attachments uploaded
                  </div>
                )}
              </div>

              <form onSubmit={handleAddAttachment} style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--secondary-text)' }}>Link New Asset</span>
                <input 
                  placeholder="Asset Name (e.g. Figma wireframe)" 
                  value={attachmentName}
                  onChange={(e) => setAttachmentName(e.target.value)}
                  required
                  style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px' }}
                />
                <input 
                  placeholder="URL link (https://...)" 
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  required
                  style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid var(--border)', borderRadius: '4px' }}
                />
                <button type="submit" disabled={isAttachmentAdding} style={{ background: 'var(--accent, #3B6DD6)', color: '#FFF', border: 'none', padding: '6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
                  {isAttachmentAdding ? 'Linking...' : 'Add Link'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {logs.map((log: any) => (
                <div key={log.id} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: 'var(--muted-text)', fontSize: '10px' }}>
                    <span>{log.user?.full_name}</span>
                    <span>{new Date(log.created_at).toLocaleDateString()}</span>
                  </div>
                  <span>
                    Changed <strong>{log.field}</strong> from <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{log.old_value || '-'}</span> to <strong>{log.new_value || '-'}</strong>
                  </span>
                  {log.reason && <div style={{ fontSize: '11px', fontStyle: 'italic', marginTop: '2px', color: 'var(--secondary-text)' }}>Reason: {log.reason}</div>}
                </div>
              ))}
              {logs.length === 0 && (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--muted-text)', fontSize: '12px', fontStyle: 'italic' }}>
                  No logs recorded
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div style={{ borderTop: '1px solid var(--border)', padding: '20px', display: 'flex', justifyContent: 'space-between', gap: '12px', background: 'var(--hover-bg, #F5F5F2)' }}>
          {isPM ? (
            <button 
              onClick={() => setShowActionDialog('delete')}
              style={{ padding: '6px 12px', border: '1px solid var(--red, #D44)', color: 'var(--red, #D44)', background: 'transparent', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              type="button"
            >
              Delete Task
            </button>
          ) : <div />}
          
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Save Button */}
            <button
              onClick={handleSaveTask}
              disabled={!isDirty || isSaving}
              style={{
                padding: '6px 16px',
                background: isDirty ? 'var(--blue, #3B6DD6)' : 'var(--border, #E2E8F0)',
                color: isDirty ? '#FFF' : 'var(--muted-text, #94A3B8)',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: isDirty ? 'pointer' : 'default',
                transition: 'all 0.15s ease'
              }}
            >
              {isSaving ? 'Saving...' : isDirty ? 'Save' : 'Saved'}
            </button>

            {/* PM Lifecycle Actions */}
            {isPM && task.status === 'completed' && (
              <>
                <button onClick={() => setShowActionDialog('request_changes')} style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>Rework</button>
                <button onClick={() => setShowActionDialog('approve')} style={{ padding: '6px 12px', background: 'var(--green, #2DA86B)', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Approve</button>
              </>
            )}

            {/* TM Lifecycle Actions */}
            {!isLocked && task.status !== 'completed' && (
              <button 
                onClick={() => setShowActionDialog('request_approval')}
                style={{ padding: '6px 16px', background: 'var(--accent, #3B6DD6)', color: '#FFF', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                Submit for Approval
              </button>
            )}
          </div>
        </div>

      </section>

      {/* Lifecycle Actions Modal dialog overlay */}
      {showActionDialog && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 101, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form onSubmit={handleLifecycleActionSubmit} style={{ width: '380px', background: 'var(--card, #FFF)', padding: '20px', borderRadius: '8px', border: '1px solid var(--border)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: '700' }}>
              {showActionDialog === 'delete' ? 'Delete Task' :
               showActionDialog === 'request_approval' ? 'Submit for Review' :
               showActionDialog === 'approve' ? 'Approve Task' : 'Request Rework'}
            </h4>
            
            {showActionDialog !== 'delete' && (
              <label className="field" style={{ marginTop: 0 }}>
                <span>Optional Reason / Notes</span>
                <textarea
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  placeholder="Explain reasoning..."
                  rows={2}
                />
              </label>
            )}

            {showActionDialog === 'delete' && (
              <p style={{ fontSize: '12px', color: 'var(--secondary-text)', marginBottom: '16px' }}>Are you sure you want to permanently delete this task? This action cannot be undone.</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => setShowActionDialog(null)} type="button" style={{ padding: '6px 12px', background: 'transparent', border: '1px solid var(--border)', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={isActionSubmitting} style={{ padding: '6px 12px', background: showActionDialog === 'delete' ? 'var(--red, #D44)' : 'var(--accent, #3B6DD6)', color: '#FFF', border: 'none', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
                {isActionSubmitting ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
    , document.body
  )
}
