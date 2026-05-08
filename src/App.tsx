import { useEffect, useState } from 'react'
import { ChatPage } from './pages/ChatPage'
import { SkillsPage } from './pages/SkillsPage'
import { UpdatesPage } from './pages/UpdatesPage'
import { Sidebar } from './components/Sidebar'
import { StarfieldBackground } from './components/StarfieldBackground'

export interface Session {
  id: string
  name: string
  createdAt: number
  messages: Message[]
  activeSkills: string[]
  autoNamed?: boolean
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
}

export type Page = 'chat' | 'skills' | 'updates'

const STORAGE_KEY = 'hermes-webui:state:v1'

interface PersistedState {
  sessions: Session[]
  activeSessionId: string
}

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function defaultSession(): Session {
  return {
    id: generateSessionId(),
    name: '一般聊天',
    createdAt: Date.now(),
    messages: [],
    activeSkills: [],
  }
}

function loadState(): PersistedState {
  if (typeof window === 'undefined') {
    const fresh = defaultSession()
    return { sessions: [fresh], activeSessionId: fresh.id }
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) throw new Error('no state')
    const parsed = JSON.parse(raw) as PersistedState
    if (!parsed.sessions?.length) throw new Error('empty sessions')

    // Sanitize: drop streaming flags from any messages mid-stream when last closed
    parsed.sessions = parsed.sessions.map((s) => ({
      ...s,
      messages: (s.messages || []).map((m) => ({ ...m, isStreaming: false })),
    }))

    if (!parsed.sessions.find((s) => s.id === parsed.activeSessionId)) {
      parsed.activeSessionId = parsed.sessions[0].id
    }
    return parsed
  } catch {
    const fresh = defaultSession()
    return { sessions: [fresh], activeSessionId: fresh.id }
  }
}

function deriveSessionName(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (!cleaned) return '新對話'
  // Keep up to ~18 visible chars (CJK each counts as 1)
  const max = 18
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned
}

export default function App() {
  const [page, setPage] = useState<Page>('chat')
  const initial = loadState()
  const [sessions, setSessions] = useState<Session[]>(initial.sessions)
  const [activeSessionId, setActiveSessionId] = useState(initial.activeSessionId)

  // Persist to localStorage on changes
  useEffect(() => {
    try {
      const payload: PersistedState = { sessions, activeSessionId }
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    } catch (err) {
      console.warn('[hermes] failed to persist state', err)
    }
  }, [sessions, activeSessionId])

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? sessions[0]

  const createSession = (name?: string) => {
    const newSession: Session = {
      id: generateSessionId(),
      name: name ?? `新對話 ${sessions.length + 1}`,
      createdAt: Date.now(),
      messages: [],
      activeSkills: [],
    }
    setSessions((prev) => [...prev, newSession])
    setActiveSessionId(newSession.id)
  }

  const deleteSession = (id: string) => {
    if (sessions.length <= 1) return
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (activeSessionId === id) {
      const remaining = sessions.filter((s) => s.id !== id)
      setActiveSessionId(remaining[0].id)
    }
  }

  const renameSession = (id: string, name: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name, autoNamed: false } : s))
    )
  }

  const autoNameSession = (id: string, firstUserMessage: string) => {
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s
        // Only auto-name if user hasn't manually set a name and it still looks like default
        if (s.autoNamed) return s
        const looksDefault = s.name === '一般聊天' || /^新對話\s?\d*$/.test(s.name)
        if (!looksDefault) return s
        return { ...s, name: deriveSessionName(firstUserMessage), autoNamed: true }
      })
    )
  }

  const addMessage = (sessionId: string, message: Message) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId ? { ...s, messages: [...s.messages, message] } : s
      )
    )
  }

  const updateStreamingMessage = (sessionId: string, messageId: string, content: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === messageId ? { ...m, content } : m
              ),
            }
          : s
      )
    )
  }

  const finishStreamingMessage = (sessionId: string, messageId: string) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? {
              ...s,
              messages: s.messages.map((m) =>
                m.id === messageId ? { ...m, isStreaming: false } : m
              ),
            }
          : s
      )
    )
  }

  return (
    <>
      <StarfieldBackground />
      <div className="flex h-full w-full" style={{ position: 'relative', zIndex: 1 }}>
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSessionId}
          currentPage={page}
          onSelectSession={setActiveSessionId}
          onNewSession={() => createSession()}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          onChangePage={setPage}
        />
        <main className="flex-1 overflow-hidden">
          {page === 'chat' && (
            <ChatPage
              session={activeSession}
              onAddMessage={addMessage}
              onUpdateStreaming={updateStreamingMessage}
              onFinishStreaming={finishStreamingMessage}
              onAutoNameSession={autoNameSession}
              onNewSession={() => createSession()}
            />
          )}
          {page === 'skills' && <SkillsPage />}
          {page === 'updates' && <UpdatesPage />}
        </main>
      </div>
    </>
  )
}
