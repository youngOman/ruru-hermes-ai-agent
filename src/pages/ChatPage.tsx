import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'
import type { Session, Message } from '../App'
import { streamChat } from '../lib/api'

interface ChatPageProps {
  session: Session
  onAddMessage: (sessionId: string, message: Message) => void
  onUpdateStreaming: (sessionId: string, messageId: string, content: string) => void
  onFinishStreaming: (sessionId: string, messageId: string) => void
  onNewSession: () => void
}

export function ChatPage({
  session,
  onAddMessage,
  onUpdateStreaming,
  onFinishStreaming,
}: ChatPageProps) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const streamingIdRef = useRef<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [session.messages])

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    onAddMessage(session.id, userMessage)
    setInput('')
    setIsLoading(true)

    // Create placeholder for assistant
    const assistantMessageId = `msg_${Date.now()}_assistant`
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isStreaming: true,
    }
    onAddMessage(session.id, assistantMessage)
    streamingIdRef.current = assistantMessageId

    try {
      const messages = session.messages
        .filter((m) => !m.isStreaming)
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }))
      messages.push({ role: 'user', content: userMessage.content })

      let fullContent = ''
      for await (const chunk of streamChat(session.id, messages)) {
        if (chunk.done) {
          break
        }
        fullContent += chunk.content
        onUpdateStreaming(session.id, assistantMessageId, fullContent)
      }
      onFinishStreaming(session.id, assistantMessageId)
    } catch (err) {
      console.error('Chat error:', err)
      onUpdateStreaming(
        session.id,
        assistantMessageId,
        `錯誤：${err instanceof Error ? err.message : '未知錯誤'}`
      )
      onFinishStreaming(session.id, assistantMessageId)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString('zh-TW', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="chat-container">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-left">
          <h1 className="chat-title">{session.name}</h1>
          {session.activeSkills.length > 0 && (
            <div className="active-skills">
              {session.activeSkills.map((skill) => (
                <span key={skill} className="skill-badge">{skill}</span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="chat-messages">
        {session.messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="var(--fg-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-muted text-sm">開始一個新對話吧！</p>
            <p className="text-muted text-xs">傳送訊息給 AI 助理</p>
          </div>
        )}

        {session.messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}
          >
            <div className="message-avatar">
              {msg.role === 'user' ? (
                <div className="avatar user-avatar">Y</div>
              ) : (
                <div className="avatar ai-avatar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" fill="var(--accent)" />
                    <path d="M2 17l10 5 10-5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12l10 5 10-5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
            <div className="message-content">
              <div className="message-bubble">
                {msg.content}
                {msg.isStreaming && <span className="cursor-blink">▊</span>}
              </div>
              <span className="message-time">{formatTime(msg.timestamp)}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入訊息... (Enter 發送，Shift+Enter 換行)"
            rows={1}
            disabled={isLoading}
          />
          <button
            className="send-btn"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>

      <style>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--bg);
        }
        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border);
          background: var(--bg-secondary);
        }
        .chat-header-left {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .chat-title {
          font-size: 1rem;
          font-weight: 600;
        }
        .active-skills {
          display: flex;
          gap: 0.25rem;
        }
        .skill-badge {
          font-size: 0.625rem;
          padding: 0.125rem 0.375rem;
          border-radius: 9999px;
          background: var(--accent);
          color: white;
          font-weight: 500;
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .chat-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: 0.5rem;
          text-align: center;
        }
        .chat-empty-icon {
          margin-bottom: 0.5rem;
          opacity: 0.5;
        }
        .message {
          display: flex;
          gap: 0.75rem;
          max-width: 80%;
        }
        .message.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .message.assistant {
          align-self: flex-start;
        }
        .message-avatar {
          flex-shrink: 0;
        }
        .avatar {
          width: 32px;
          height: 32px;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: 600;
        }
        .user-avatar {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .ai-avatar {
          background: var(--card);
          border: 1px solid var(--border);
        }
        .message-content {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .message.user .message-content {
          align-items: flex-end;
        }
        .message-bubble {
          padding: 0.625rem 0.875rem;
          border-radius: 0.875rem;
          font-size: 0.9375rem;
          line-height: 1.5;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .message.user .message-bubble {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-bottom-right-radius: 0.25rem;
        }
        .message.assistant .message-bubble {
          background: var(--card);
          border: 1px solid var(--border);
          border-bottom-left-radius: 0.25rem;
        }
        .message-time {
          font-size: 0.6875rem;
          color: var(--fg-muted);
        }
        .cursor-blink {
          animation: blink 1s step-end infinite;
          color: var(--accent);
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
        .chat-input-area {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border);
          background: var(--bg-secondary);
        }
        .chat-input-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 0.75rem;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 0.875rem;
          padding: 0.5rem 0.5rem 0.5rem 1rem;
        }
        .chat-input-wrapper:focus-within {
          border-color: var(--accent);
        }
        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--fg);
          font-size: 0.9375rem;
          line-height: 1.5;
          resize: none;
          max-height: 150px;
          font-family: inherit;
        }
        .chat-input::placeholder {
          color: var(--fg-muted);
        }
        .chat-input:disabled {
          opacity: 0.6;
        }
        .send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 0.75rem;
          border: none;
          background: var(--accent);
          color: white;
          cursor: pointer;
          transition: background 0.15s;
          flex-shrink: 0;
        }
        .send-btn:hover:not(:disabled) {
          background: var(--accent-hover);
        }
        .send-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
