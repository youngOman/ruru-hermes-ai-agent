import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Session, Message } from '../App'
import { streamChat } from '../lib/api'

interface ChatPageProps {
  session: Session
  onAddMessage: (sessionId: string, message: Message) => void
  onUpdateStreaming: (sessionId: string, messageId: string, content: string) => void
  onFinishStreaming: (sessionId: string, messageId: string) => void
  onAutoNameSession: (sessionId: string, firstUserMessage: string) => void
  onNewSession: () => void
}

export function ChatPage({
  session,
  onAddMessage,
  onUpdateStreaming,
  onFinishStreaming,
  onAutoNameSession,
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

  // Auto-grow textarea
  useEffect(() => {
    if (!inputRef.current) return
    inputRef.current.style.height = 'auto'
    inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 200)}px`
  }, [input])

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return

    const trimmed = input.trim()
    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    }

    // Auto-name session on first user message
    const isFirstUserMsg = session.messages.filter((m) => m.role === 'user').length === 0
    if (isFirstUserMsg) {
      onAutoNameSession(session.id, trimmed)
    }

    onAddMessage(session.id, userMessage)
    setInput('')
    setIsLoading(true)

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
        if (chunk.done) break
        fullContent += chunk.content
        onUpdateStreaming(session.id, assistantMessageId, fullContent)
      }
      onFinishStreaming(session.id, assistantMessageId)
    } catch (err) {
      console.error('Chat error:', err)
      onUpdateStreaming(
        session.id,
        assistantMessageId,
        `❌ 錯誤：${err instanceof Error ? err.message : '未知錯誤'}`
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
          <div className="chat-title-row">
            <span className="chat-title-orb" />
            <h1 className="chat-title">{session.name}</h1>
          </div>
          {session.activeSkills.length > 0 && (
            <div className="active-skills">
              {session.activeSkills.map((skill) => (
                <span key={skill} className="skill-badge">
                  <Sparkles size={10} /> {skill}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="chat-messages">
        {session.messages.length === 0 && (
          <div className="chat-empty">
            <div className="chat-empty-orb">
              <div className="orb-core" />
              <div className="orb-ring" />
              <div className="orb-ring orb-ring-2" />
            </div>
            <p className="empty-title">嗨～準備好聊聊了嗎？</p>
            <p className="empty-sub">寫一句話，讓星空中的 AI 為你思考</p>
          </div>
        )}

        {session.messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.role === 'user' ? 'user' : 'assistant'}`}
          >
            <div className="message-avatar">
              {msg.role === 'user' ? (
                <div className="avatar user-avatar">
                  <span>R</span>
                </div>
              ) : (
                <div className="avatar ai-avatar">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <defs>
                      <linearGradient id={`avatar-grad-${msg.id}`} x1="0" x2="1" y1="0" y2="1">
                        <stop offset="0%" stopColor="#a98bff" />
                        <stop offset="100%" stopColor="#6ee7ff" />
                      </linearGradient>
                    </defs>
                    <path d="M12 2L2 7l10 5 10-5-10-5z" fill={`url(#avatar-grad-${msg.id})`} />
                    <path d="M2 17l10 5 10-5" stroke={`url(#avatar-grad-${msg.id})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12l10 5 10-5" stroke={`url(#avatar-grad-${msg.id})`} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </div>
            <div className="message-content">
              <div className="message-bubble">
                {msg.role === 'assistant' ? (
                  <div className="markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content || (msg.isStreaming ? '✨' : '')}
                    </ReactMarkdown>
                    {msg.isStreaming && <span className="cursor-blink">▊</span>}
                  </div>
                ) : (
                  <span className="user-text">{msg.content}</span>
                )}
              </div>
              <span className="message-time">{formatTime(msg.timestamp)}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="chat-input-area">
        <div className={`chat-input-wrapper ${isLoading ? 'loading' : ''}`}>
          <textarea
            ref={inputRef}
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="跟 AI 說點什麼... (Enter 發送 · Shift+Enter 換行)"
            rows={1}
            disabled={isLoading}
          />
          <button
            className="send-btn"
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            aria-label="發送"
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
        <p className="input-hint">Hermes 可能會犯錯，重要事情記得自己驗證喔 ✦</p>
      </div>

      <style>{`
        .chat-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          z-index: 1;
        }
        .chat-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.75rem;
          border-bottom: 1px solid var(--border);
          background: linear-gradient(180deg,
            rgba(18, 18, 44, 0.7),
            rgba(12, 12, 36, 0.4));
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        .chat-header-left {
          display: flex;
          flex-direction: column;
          gap: 0.375rem;
        }
        .chat-title-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
        }
        .chat-title-orb {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent), var(--cyan));
          box-shadow: 0 0 12px var(--accent-glow);
          animation: twinkle 3s ease-in-out infinite;
        }
        .chat-title {
          font-size: 1rem;
          font-weight: 600;
          letter-spacing: -0.01em;
        }
        .active-skills {
          display: flex;
          gap: 0.375rem;
          flex-wrap: wrap;
        }
        .skill-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          font-size: 0.6875rem;
          padding: 0.2rem 0.5rem;
          border-radius: 9999px;
          background: var(--accent-soft);
          color: var(--accent);
          border: 1px solid rgba(169, 139, 255, 0.25);
          font-weight: 500;
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 2rem 1.75rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          max-width: 920px;
          width: 100%;
          margin: 0 auto;
        }
        .chat-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          flex: 1;
          gap: 0.75rem;
          text-align: center;
          padding: 3rem 1rem;
        }
        .chat-empty-orb {
          position: relative;
          width: 96px;
          height: 96px;
          margin-bottom: 1rem;
        }
        .orb-core {
          position: absolute;
          inset: 28%;
          border-radius: 50%;
          background: radial-gradient(circle at 30% 30%, #fff, var(--accent) 40%, #4a1f9e 90%);
          box-shadow:
            0 0 30px var(--accent-glow),
            inset 0 0 18px rgba(255, 255, 255, 0.4);
          animation: pulse-glow 3.5s ease-in-out infinite;
        }
        .orb-ring {
          position: absolute;
          inset: 12%;
          border-radius: 50%;
          border: 1px solid rgba(169, 139, 255, 0.4);
          animation: orb-spin 12s linear infinite;
        }
        .orb-ring-2 {
          inset: 0;
          border-color: rgba(110, 231, 255, 0.3);
          animation: orb-spin 18s linear infinite reverse;
        }
        @keyframes orb-spin {
          to { transform: rotate(360deg); }
        }
        .empty-title {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--fg);
        }
        .empty-sub {
          font-size: 0.875rem;
          color: var(--fg-muted);
        }
        .message {
          display: flex;
          gap: 0.75rem;
          max-width: 85%;
          animation: msg-in 0.3s ease-out;
        }
        @keyframes msg-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
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
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.8125rem;
          font-weight: 700;
          position: relative;
        }
        .user-avatar {
          background: linear-gradient(135deg, #ff9fd6 0%, #a98bff 100%);
          color: #fff;
          box-shadow: 0 0 16px rgba(255, 159, 214, 0.35);
        }
        .ai-avatar {
          background: rgba(20, 20, 50, 0.85);
          border: 1px solid rgba(169, 139, 255, 0.4);
          box-shadow: 0 0 14px rgba(169, 139, 255, 0.25);
        }
        .message-content {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
          min-width: 0;
        }
        .message.user .message-content {
          align-items: flex-end;
        }
        .message-bubble {
          padding: 0.75rem 1rem;
          border-radius: 1rem;
          font-size: 0.9375rem;
          line-height: 1.6;
          word-break: break-word;
        }
        .message.user .message-bubble {
          background: linear-gradient(135deg, #8b6dff 0%, #c87bd6 100%);
          color: #fff;
          border-bottom-right-radius: 0.375rem;
          box-shadow:
            0 4px 18px rgba(139, 109, 255, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }
        .message.assistant .message-bubble {
          background: rgba(20, 20, 50, 0.6);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          border-bottom-left-radius: 0.375rem;
          color: var(--fg);
        }
        .user-text {
          white-space: pre-wrap;
        }
        .message-time {
          font-size: 0.6875rem;
          color: var(--fg-subtle);
          padding: 0 0.25rem;
        }
        .cursor-blink {
          display: inline-block;
          margin-left: 2px;
          animation: blink 0.9s step-end infinite;
          color: var(--accent);
        }
        @keyframes blink {
          50% { opacity: 0; }
        }

        /* Markdown styling */
        .markdown { display: contents; }
        .markdown :where(p) {
          margin: 0;
        }
        .markdown :where(p) + :where(p) {
          margin-top: 0.6em;
        }
        .markdown :where(h1, h2, h3, h4) {
          margin-top: 0.6em;
          margin-bottom: 0.3em;
          line-height: 1.3;
          font-weight: 600;
        }
        .markdown :where(h1) { font-size: 1.25rem; }
        .markdown :where(h2) { font-size: 1.125rem; }
        .markdown :where(h3) { font-size: 1rem; }
        .markdown :where(ul, ol) {
          padding-left: 1.4rem;
          margin: 0.4em 0;
        }
        .markdown :where(li) + :where(li) {
          margin-top: 0.2em;
        }
        .markdown :where(a) {
          color: var(--cyan);
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .markdown :where(a):hover {
          color: var(--accent-hover);
        }
        .markdown :where(code) {
          font-family: 'SF Mono', Menlo, Consolas, monospace;
          font-size: 0.85em;
          padding: 0.15em 0.4em;
          background: rgba(110, 231, 255, 0.1);
          border: 1px solid rgba(110, 231, 255, 0.18);
          border-radius: 0.3rem;
          color: var(--cyan);
        }
        .markdown :where(pre) {
          margin: 0.6em 0;
          padding: 0.85rem 1rem;
          background: rgba(7, 7, 26, 0.7);
          border: 1px solid var(--border);
          border-radius: 0.6rem;
          overflow-x: auto;
        }
        .markdown :where(pre code) {
          background: transparent;
          border: none;
          padding: 0;
          color: var(--fg);
          font-size: 0.8125rem;
          line-height: 1.55;
        }
        .markdown :where(blockquote) {
          margin: 0.6em 0;
          padding: 0.4em 0.9em;
          border-left: 3px solid var(--accent);
          background: var(--accent-soft);
          color: var(--fg-muted);
          border-radius: 0 0.4rem 0.4rem 0;
        }
        .markdown :where(table) {
          border-collapse: collapse;
          margin: 0.6em 0;
          font-size: 0.875rem;
        }
        .markdown :where(th, td) {
          padding: 0.4rem 0.7rem;
          border: 1px solid var(--border);
        }
        .markdown :where(th) {
          background: var(--accent-soft);
          font-weight: 600;
        }
        .markdown :where(hr) {
          border: none;
          border-top: 1px solid var(--border);
          margin: 0.8em 0;
        }

        /* Input */
        .chat-input-area {
          padding: 1rem 1.75rem 1.25rem;
          border-top: 1px solid var(--border);
          background: linear-gradient(180deg,
            rgba(12, 12, 36, 0.4),
            rgba(7, 7, 26, 0.7));
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
        }
        .chat-input-wrapper {
          display: flex;
          align-items: flex-end;
          gap: 0.625rem;
          max-width: 920px;
          margin: 0 auto;
          background: rgba(20, 20, 50, 0.65);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid var(--border);
          border-radius: 1.1rem;
          padding: 0.5rem 0.5rem 0.5rem 1rem;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-soft);
        }
        .chat-input-wrapper:focus-within {
          border-color: var(--border-hover);
          box-shadow:
            var(--shadow-soft),
            0 0 0 3px var(--accent-soft),
            0 0 32px rgba(169, 139, 255, 0.18);
        }
        .chat-input-wrapper.loading {
          border-color: rgba(169, 139, 255, 0.5);
          animation: pulse-glow 2s ease-in-out infinite;
        }
        .chat-input {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: var(--fg);
          font-size: 0.9375rem;
          line-height: 1.55;
          resize: none;
          max-height: 200px;
          font-family: inherit;
          padding: 0.4rem 0;
        }
        .chat-input::placeholder {
          color: var(--fg-subtle);
        }
        .chat-input:disabled {
          opacity: 0.55;
        }
        .send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 0.85rem;
          border: none;
          background: linear-gradient(135deg, #a98bff 0%, #6ee7ff 100%);
          color: #fff;
          cursor: pointer;
          transition: all 0.18s ease;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(169, 139, 255, 0.35);
        }
        .send-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(169, 139, 255, 0.5);
        }
        .send-btn:active:not(:disabled) {
          transform: translateY(0);
        }
        .send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          background: rgba(80, 80, 120, 0.4);
          box-shadow: none;
        }
        .input-hint {
          text-align: center;
          font-size: 0.6875rem;
          color: var(--fg-subtle);
          margin-top: 0.625rem;
          letter-spacing: 0.02em;
        }
      `}</style>
    </div>
  )
}
