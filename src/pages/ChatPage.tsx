import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, ImagePlus, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Session, Message, MessageAttachment } from '../App'
import { streamChat, type ChatMessage, type ChatContentPart } from '../lib/api'
import { putImage, blobToDataUrl, getImage, getImageObjectUrl } from '../lib/imageStore'

const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB — gateway 那邊 base64 化後仍要塞進 request
const ACCEPT_MIME = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']

/**
 * 草稿態的 attachment：剛從 file picker / drop / paste 收進來、
 * 還沒送出。已經寫進 IndexedDB（拿到 imageId）但同時保留
 * objectUrl 給 preview thumbnail 用，避免又跑一次 DB 讀取。
 */
interface DraftAttachment {
  imageId: string
  name: string
  mime: string
  size: number
  objectUrl: string
}

/**
 * Hermes agents emit absolute mac mini paths like
 *   MEDIA:/Users/young/.hermes/cache/screenshots/browser_xxx.png
 * after taking screenshots or generating images. We rewrite those into
 * markdown image syntax pointing at the dev-server's `/__hermes_file__/`
 * plugin endpoint (defined in vite.config.ts), which streams the file via
 * SSH from the mac mini.
 */
function rewriteMediaPaths(text: string): string {
  // Match MEDIA: followed by an absolute path ending in a common image ext.
  // The path can contain anything except whitespace.
  const MEDIA_RE = /MEDIA:(\/\S+\.(?:png|jpg|jpeg|gif|webp|bmp|svg))/gi
  return text.replace(MEDIA_RE, (_full, path: string) => {
    // base64url encode (RFC 4648 §5) — safe for URL path segments
    const b64 = btoa(path).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    const filename = path.split('/').pop() || 'image'
    return `\n\n![${filename}](/__hermes_file__/${b64})\n\n`
  })
}

/**
 * 把已存的 Message 還原成可以送進 streamChat 的 ChatMessage。
 * 純文字訊息保持 string，多模態才包成 parts array — Gateway 兩種都吃，
 * 但純字串可以省下一些 JSON 體積。
 */
async function materializeMessage(m: Message): Promise<ChatMessage> {
  const role = m.role as 'user' | 'assistant'
  if (!m.attachments || m.attachments.length === 0) {
    return { role, content: m.content }
  }
  const parts: ChatContentPart[] = []
  if (m.content) parts.push({ type: 'text', text: m.content })
  for (const att of m.attachments) {
    const stored = await getImage(att.imageId)
    if (!stored) continue // 圖被使用者從 DB 清掉了；略過該 part，至少對話還能繼續
    const dataUrl = await blobToDataUrl(stored.blob)
    parts.push({ type: 'image_url', image_url: { url: dataUrl } })
  }
  return { role, content: parts }
}

/**
 * 從 IndexedDB 把圖讀出來顯示成 <img>。要單獨抽出來是因為 React 元件
 * 不能用 async render — useEffect + state 等 object URL 解出來再渲染。
 */
function StoredImageThumb({ imageId, name }: { imageId: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const u = await getImageObjectUrl(imageId)
      if (cancelled) return
      if (u) setUrl(u)
      else setMissing(true)
    })()
    return () => {
      cancelled = true
    }
  }, [imageId])

  if (missing) {
    return <div className="message-image missing">圖片已遺失</div>
  }
  if (!url) {
    return <div className="message-image missing">載入中…</div>
  }
  return (
    <img
      src={url}
      alt={name}
      className="message-image"
      onClick={() => window.open(url, '_blank')}
    />
  )
}

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
  const [drafts, setDrafts] = useState<DraftAttachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamingIdRef = useRef<string | null>(null)
  // Drag enter / leave 會在子元素間不斷觸發，要用 counter 才不會閃爍
  const dragDepthRef = useRef(0)

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

  const addFiles = async (files: FileList | File[]) => {
    setUploadError(null)
    const accepted: DraftAttachment[] = []
    const errors: string[] = []

    for (const file of Array.from(files)) {
      if (!ACCEPT_MIME.includes(file.type)) {
        errors.push(`${file.name || '檔案'} 不是支援的圖片格式`)
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        errors.push(`${file.name}（${(file.size / 1024 / 1024).toFixed(1)}MB）超過 10MB`)
        continue
      }
      try {
        const stored = await putImage(file)
        accepted.push({
          imageId: stored.id,
          name: stored.name,
          mime: stored.mime,
          size: stored.size,
          objectUrl: URL.createObjectURL(stored.blob),
        })
      } catch (err) {
        errors.push(`${file.name} 存檔失敗：${err instanceof Error ? err.message : '未知'}`)
      }
    }

    if (accepted.length > 0) setDrafts((prev) => [...prev, ...accepted])
    if (errors.length > 0) setUploadError(errors.join('；'))
  }

  const removeDraft = (imageId: string) => {
    setDrafts((prev) => {
      const target = prev.find((d) => d.imageId === imageId)
      if (target) URL.revokeObjectURL(target.objectUrl)
      return prev.filter((d) => d.imageId !== imageId)
    })
  }

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void addFiles(e.target.files)
    }
    // 重設 value 才能讓同一個檔案連續選兩次都觸發 onChange
    e.target.value = ''
  }

  const handleDragEnter = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    dragDepthRef.current += 1
    setIsDragging(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    dragDepthRef.current = 0
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      void addFiles(e.dataTransfer.files)
    }
  }

  const handleSubmit = async () => {
    if (isLoading) return
    const trimmed = input.trim()
    // 允許「只有圖、沒有文字」的送出
    if (!trimmed && drafts.length === 0) return

    const userAttachments: MessageAttachment[] = drafts.map((d) => ({
      imageId: d.imageId,
      name: d.name,
      mime: d.mime,
      size: d.size,
    }))

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
      attachments: userAttachments.length > 0 ? userAttachments : undefined,
    }

    // Auto-name session on first user message
    const isFirstUserMsg = session.messages.filter((m) => m.role === 'user').length === 0
    if (isFirstUserMsg) {
      // 純圖片訊息也給個合理 fallback 名字
      onAutoNameSession(session.id, trimmed || `[圖片] ${userAttachments[0]?.name ?? ''}`)
    }

    onAddMessage(session.id, userMessage)
    setInput('')
    // 草稿用完就清掉，object URL 等下面 send 完後一次 revoke
    const draftsSnapshot = drafts
    setDrafts([])
    setUploadError(null)
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
      // 1) 歷史訊息：每則都檢查有沒有 attachments、有就從 IndexedDB 還原成 base64
      const history: ChatMessage[] = []
      for (const m of session.messages) {
        if (m.isStreaming) continue
        history.push(await materializeMessage(m))
      }

      // 2) 當前這則：草稿已經是 in-memory 的 blob，直接轉 base64
      const currentParts: ChatContentPart[] = []
      if (trimmed) currentParts.push({ type: 'text', text: trimmed })
      for (const d of draftsSnapshot) {
        const stored = await getImage(d.imageId)
        if (!stored) continue
        const dataUrl = await blobToDataUrl(stored.blob)
        currentParts.push({ type: 'image_url', image_url: { url: dataUrl } })
      }
      history.push({
        role: 'user',
        content: currentParts.length === 1 && currentParts[0].type === 'text'
          ? currentParts[0].text  // 沒附件就回退到簡單字串，省 token
          : currentParts,
      })

      let fullContent = ''
      for await (const chunk of streamChat(session.id, history)) {
        if (chunk.done) break
        fullContent += chunk.content
        onUpdateStreaming(session.id, assistantMessageId, fullContent)
      }
      onFinishStreaming(session.id, assistantMessageId)

      // 送完才 revoke，避免 user message 還在用 thumbnail
      draftsSnapshot.forEach((d) => URL.revokeObjectURL(d.objectUrl))
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
    <div
      className="chat-container"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="drop-overlay">
          <div className="drop-overlay-card">
            <ImagePlus size={36} />
            <p>放開就上傳給 AI 看</p>
          </div>
        </div>
      )}
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
                      {rewriteMediaPaths(msg.content) || (msg.isStreaming ? '✨' : '')}
                    </ReactMarkdown>
                    {msg.isStreaming && <span className="cursor-blink">▊</span>}
                  </div>
                ) : (
                  <>
                    {msg.content && <span className="user-text">{msg.content}</span>}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="message-images">
                        {msg.attachments.map((att) => (
                          <StoredImageThumb
                            key={att.imageId}
                            imageId={att.imageId}
                            name={att.name}
                          />
                        ))}
                      </div>
                    )}
                  </>
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
        {drafts.length > 0 && (
          <div className="draft-row">
            {drafts.map((d) => (
              <div key={d.imageId} className="draft-chip">
                <img src={d.objectUrl} alt={d.name} />
                <button
                  type="button"
                  className="draft-remove"
                  onClick={() => removeDraft(d.imageId)}
                  aria-label={`移除 ${d.name}`}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        {uploadError && (
          <div className="upload-error" role="alert">
            {uploadError}
          </div>
        )}
        <div className={`chat-input-wrapper ${isLoading ? 'loading' : ''}`}>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPT_MIME.join(',')}
            multiple
            onChange={handleFilePick}
            style={{ display: 'none' }}
          />
          <button
            type="button"
            className="attach-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            aria-label="上傳圖片"
            title="上傳圖片"
          >
            <ImagePlus size={18} />
          </button>
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
            disabled={(!input.trim() && drafts.length === 0) || isLoading}
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
        .markdown :where(img) {
          display: block;
          max-width: min(100%, 560px);
          max-height: 420px;
          margin: 0.6em 0;
          border-radius: 0.6rem;
          border: 1px solid var(--border);
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.35);
          cursor: zoom-in;
          transition: transform 0.18s ease;
        }
        .markdown :where(img):hover {
          transform: scale(1.01);
          border-color: rgba(169, 139, 255, 0.4);
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

        /* === 圖片上傳 === */
        .attach-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          border-radius: 0.85rem;
          border: 1px solid transparent;
          background: transparent;
          color: var(--fg-muted);
          cursor: pointer;
          transition: all 0.18s ease;
          flex-shrink: 0;
        }
        .attach-btn:hover:not(:disabled) {
          color: var(--accent);
          background: var(--accent-soft);
          border-color: rgba(169, 139, 255, 0.3);
        }
        .attach-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .draft-row {
          max-width: 920px;
          margin: 0 auto 0.5rem;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .draft-chip {
          position: relative;
          width: 64px;
          height: 64px;
          border-radius: 0.6rem;
          overflow: hidden;
          border: 1px solid var(--border);
          background: rgba(20, 20, 50, 0.6);
          box-shadow: var(--shadow-soft);
        }
        .draft-chip img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .draft-remove {
          position: absolute;
          top: 2px;
          right: 2px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: none;
          background: rgba(7, 7, 26, 0.85);
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          transition: background 0.15s ease;
        }
        .draft-remove:hover {
          background: rgba(220, 70, 90, 0.9);
        }
        .upload-error {
          max-width: 920px;
          margin: 0 auto 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.75rem;
          color: #ffb4c0;
          background: rgba(220, 70, 90, 0.12);
          border: 1px solid rgba(220, 70, 90, 0.3);
          border-radius: 0.5rem;
        }
        .drop-overlay {
          position: absolute;
          inset: 0;
          z-index: 10;
          background: rgba(7, 7, 26, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          animation: msg-in 0.18s ease-out;
        }
        .drop-overlay-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 2rem 3rem;
          border-radius: 1rem;
          border: 2px dashed rgba(169, 139, 255, 0.6);
          background: rgba(20, 20, 50, 0.75);
          color: var(--accent);
          font-size: 0.95rem;
          font-weight: 600;
          box-shadow: 0 0 36px rgba(169, 139, 255, 0.25);
        }
        .drop-overlay-card p { margin: 0; }

        /* user message 內的附件圖 */
        .message-images {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-top: 0.4rem;
        }
        .message-image {
          max-width: 220px;
          max-height: 220px;
          border-radius: 0.6rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          cursor: zoom-in;
          display: block;
          transition: transform 0.18s ease;
        }
        .message-image:hover {
          transform: scale(1.02);
        }
        .message-image.missing {
          width: 140px;
          height: 80px;
          background: rgba(20, 20, 50, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          color: var(--fg-subtle);
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
