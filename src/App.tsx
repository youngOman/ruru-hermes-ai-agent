import { useState } from 'react'
import { ChatPage } from './pages/ChatPage'
import { SkillsPage } from './pages/SkillsPage'
import { UpdatesPage } from './pages/UpdatesPage'
import { Sidebar } from './components/Sidebar'

export interface Session {
  id: string
  name: string
  createdAt: number
  messages: Message[]
  activeSkills: string[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  isStreaming?: boolean
}

export type Page = 'chat' | 'skills' | 'updates'

function generateSessionId() {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export default function App() {
  const [page, setPage] = useState<Page>('chat')
  const [sessions, setSessions] = useState<Session[]>([
    {
      id: generateSessionId(),
      name: '一般聊天',
      createdAt: Date.now(),
      messages: [],
      activeSkills: [],
    },
  ])
  const [activeSessionId, setActiveSessionId] = useState(sessions[0].id)

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
      setActiveSessionId(sessions[0].id)
    }
  }

  const renameSession = (id: string, name: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, name } : s))
    )
  }

  const addMessage = (sessionId: string, message: Message) => {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, message] }
          : s
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
    <div className="flex h-full w-full">
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
            onNewSession={() => createSession()}
          />
        )}
        {page === 'skills' && <SkillsPage />}
        {page === 'updates' && <UpdatesPage />}
      </main>
    </div>
  )
}
