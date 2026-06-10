import { useMutation } from '@tanstack/react-query'
import { MessageCircle, Send, X, RefreshCw } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../app/providers/useAuth'
import { normalizeApiError } from '../../lib/api/errors'
import { sendAiChatMessage, type ChatHistoryItem } from './api'

export function AiChatWidget() {
  const { currentUser } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'model'; text: string; task?: any; blocker?: any }>>([])
  
  const historyEndRef = useRef<HTMLDivElement | null>(null)

  // Initialize welcoming greeting
  useEffect(() => {
    if (chatHistory.length === 0 && currentUser) {
      const pmMenu = "Hello! I am your Sakhaa Assistant. Would you like to:\n- Create Task\n- Update Status\n- Read Task Details\n- Delete Task\n- Give Approval\n- Add Blocker"
      const tmMenu = "Hello! I am your Sakhaa Assistant. Would you like to:\n- Update Status\n- Read Task Details\n- Ask Approval\n- Add Blocker"
      setChatHistory([
        {
          role: 'model',
          text: currentUser.role === 'team_member' ? tmMenu : pmMenu
        }
      ])
    }
  }, [currentUser, chatHistory])

  // Scroll to bottom when history updates
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory])

  const mutation = useMutation({
    mutationFn: sendAiChatMessage,
    onSuccess: (response) => {
      setChatHistory((items) => [
        ...items,
        {
          role: 'model',
          text: response.text || botText(response.type),
          task: response.task,
          blocker: response.blocker
        },
      ])
      setMessage('')
    },
    onError: (error) => {
      setChatHistory((items) => [
        ...items,
        { role: 'model', text: normalizeApiError(error).message },
      ])
    },
  })

  const handleSend = () => {
    if (!message.trim()) return

    const userMessage = message.trim()
    
    // Convert history state to backend DTO history payload
    const apiHistory: ChatHistoryItem[] = chatHistory.map((item) => ({
      role: item.role,
      parts: [{ text: item.text }],
    }))

    setChatHistory((items) => [...items, { role: 'user', text: userMessage }])
    setMessage('')

    mutation.mutate({
      action: 'chat',
      message: userMessage,
      history: apiHistory,
    })
  }

  const handleReset = () => {
    const pmMenu = "Hello! I am your Sakhaa Assistant. Would you like to:\n- Create Task\n- Update Status\n- Read Task Details\n- Delete Task\n- Give Approval\n- Add Blocker"
    const tmMenu = "Hello! I am your Sakhaa Assistant. Would you like to:\n- Update Status\n- Read Task Details\n- Ask Approval\n- Add Blocker"
    setChatHistory([
      {
        role: 'model',
        text: currentUser?.role === 'team_member' ? tmMenu : pmMenu
      }
    ])
  }

  return (
    <div className="ai-chat-shell">
      {isOpen ? (
        <section className="ai-chat-panel" data-testid="ai-chat-panel" style={{ display: 'flex', flexDirection: 'column', height: '480px', width: '360px', background: 'rgba(15, 15, 15, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {/* Header */}
          <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '14px', color: '#fff', fontWeight: '600' }}>Your Sakhaa</h2>
              <span className="muted" style={{ fontSize: '11px' }}>AI task companion</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button className="icon-button" onClick={handleReset} title="Reset conversation" style={{ padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} type="button">
                <RefreshCw size={14} />
              </button>
              <button className="icon-button" onClick={() => setIsOpen(false)} style={{ padding: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} type="button">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Messages History */}
          <div className="ai-chat-history" style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {chatHistory.map((item, index) => (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: item.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <p
                  className={item.role === 'user' ? 'user' : 'bot'}
                  style={{
                    margin: 0,
                    padding: '8px 12px',
                    borderRadius: '12px',
                    fontSize: '12.5px',
                    lineHeight: '1.4',
                    maxWidth: '85%',
                    whiteSpace: 'pre-line',
                    background: item.role === 'user' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                    color: item.role === 'user' ? '#93c5fd' : '#fff',
                    border: item.role === 'user' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(255,255,255,0.06)'
                  }}
                >
                  {item.text}
                </p>

                {/* Optional Task Card */}
                {item.task && (
                  <div style={{
                    marginTop: '6px',
                    padding: '10px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    width: '260px',
                    fontSize: '11px',
                    color: '#fff',
                  }}>
                    <strong style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#4ade80' }}>
                      ✓ Task Details
                    </strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div><strong>Title:</strong> {item.task.title}</div>
                      <div><strong>Status:</strong> {item.task.status.replaceAll('_', ' ')}</div>
                      {item.task.due_date && <div><strong>Due Date:</strong> {new Date(item.task.due_date).toLocaleDateString()}</div>}
                      {item.task.assignee && <div><strong>Assignee:</strong> {item.task.assignee.full_name}</div>}
                    </div>
                  </div>
                )}

                {/* Optional Blocker Card */}
                {item.blocker && (
                  <div style={{
                    marginTop: '6px',
                    padding: '10px',
                    background: 'rgba(239, 68, 68, 0.02)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    borderRadius: '8px',
                    width: '260px',
                    fontSize: '11px',
                    color: '#fff',
                  }}>
                    <strong style={{ display: 'block', fontSize: '12px', marginBottom: '4px', color: '#f87171' }}>
                      ⚠ Blocker Reported
                    </strong>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div><strong>Title:</strong> {item.blocker.title}</div>
                      <div><strong>Severity:</strong> {item.blocker.severity}</div>
                      <div><strong>Status:</strong> {item.blocker.status}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={historyEndRef} />
          </div>

          {/* Input form */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
              data-testid="textarea-ai-chat-message"
              placeholder="Ask anything..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              style={{
                width: '100%',
                minHeight: '44px',
                maxHeight: '80px',
                padding: '8px 10px',
                background: 'rgba(20, 20, 20, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '12.5px',
                resize: 'none',
                outline: 'none'
              }}
            />
            <button
              className="primary-action"
              data-testid="button-ai-chat-send"
              disabled={mutation.isPending || !message.trim()}
              onClick={handleSend}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                background: 'var(--blue)',
                color: '#fff',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                opacity: (mutation.isPending || !message.trim()) ? 0.6 : 1
              }}
              type="button"
            >
              <Send size={14} />
              {mutation.isPending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </section>
      ) : null}
      
      {/* Floating launcher button */}
      <button
        aria-label="Open Sakhaa Assistant"
        className="ai-chat-launcher"
        data-testid="button-ai-chat-open"
        onClick={() => setIsOpen((value) => !value)}
        type="button"
      >
        <img alt="" src="/cherp-logo.png" />
        <span />
        <MessageCircle size={18} />
      </button>
    </div>
  )
}

function botText(type: string) {
  if (type === 'task_created') return 'Task created and logged.'
  if (type === 'task_updated') return 'Task status updated and notifications queued.'
  if (type === 'task_card') return 'Task details loaded by the backend.'
  if (type === 'task_deleted') return 'Task deleted and workflow completion recalculated.'
  if (type === 'blocker_created') return 'Blocker added and notifications queued.'
  return 'Action completed.'
}
