import { Plus, MessageSquare, Sparkles, History, Trash2, MoreVertical } from 'lucide-react'
import type { Session, Page } from '../App'
import { useState } from 'react'

interface SidebarProps {
  sessions: Session[]
  activeSessionId: string
  currentPage: Page
  onSelectSession: (id: string) => void
  onNewSession: () => void
  onDeleteSession: (id: string) => void
  onRenameSession: (id: string, name: string) => void
  onChangePage: (page: Page) => void
}

export function Sidebar({
  sessions,
  activeSessionId,
  currentPage,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onChangePage,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)

  const startRename = (session: Session) => {
    setEditingId(session.id)
    setEditingName(session.name)
    setMenuOpenId(null)
  }

  const commitRename = () => {
    if (editingId && editingName.trim()) {
      onRenameSession(editingId, editingName.trim())
    }
    setEditingId(null)
    setEditingName('')
  }

  const navItems: { page: Page; icon: React.ReactNode; label: string }[] = [
    { page: 'chat', icon: <MessageSquare size={16} />, label: '對話' },
    { page: 'skills', icon: <Sparkles size={16} />, label: 'Skills' },
    { page: 'updates', icon: <History size={16} />, label: '更新記錄' },
  ]

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="var(--accent)" />
            <path d="M2 17l10 5 10-5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12l10 5 10-5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="logo-text">Hermes</span>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navItems.map(({ page, icon, label }) => (
          <button
            key={page}
            className={`nav-item ${currentPage === page ? 'active' : ''}`}
            onClick={() => onChangePage(page)}
          >
            {icon}
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Sessions */}
      {currentPage === 'chat' && (
        <>
          <div className="sidebar-section-header">
            <span className="text-xs text-muted">對話</span>
            <button className="new-session-btn" onClick={onNewSession} title="新對話">
              <Plus size={14} />
            </button>
          </div>
          <div className="session-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
                onClick={() => onSelectSession(session.id)}
              >
                {editingId === session.id ? (
                  <input
                    className="session-rename-input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename()
                      if (e.key === 'Escape') {
                        setEditingId(null)
                        setEditingName('')
                      }
                    }}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="session-name truncate">{session.name}</span>
                    <button
                      className="session-menu-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMenuOpenId(menuOpenId === session.id ? null : session.id)
                      }}
                    >
                      <MoreVertical size={12} />
                    </button>
                    {menuOpenId === session.id && (
                      <div className="session-menu">
                        <button onClick={() => startRename(session)}>重新命名</button>
                        <button
                          className="destructive"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteSession(session.id)
                            setMenuOpenId(null)
                          }}
                          disabled={sessions.length <= 1}
                        >
                          <Trash2 size={12} /> 刪除
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <style>{`
        .sidebar {
          width: 240px;
          min-width: 240px;
          height: 100%;
          background: var(--bg-secondary);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          border-bottom: 1px solid var(--border);
        }
        .logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-text {
          font-weight: 600;
          font-size: 1rem;
          letter-spacing: -0.02em;
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0.5rem;
          border-bottom: 1px solid var(--border);
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.375rem;
          border: none;
          background: transparent;
          color: var(--fg-muted);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
        }
        .nav-item:hover {
          background: var(--card);
          color: var(--fg);
        }
        .nav-item.active {
          background: var(--card);
          color: var(--fg);
          font-weight: 500;
        }
        .sidebar-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 1rem 0.25rem;
        }
        .new-session-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 0.25rem;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--fg-muted);
          cursor: pointer;
          transition: all 0.15s;
        }
        .new-session-btn:hover {
          background: var(--card);
          color: var(--fg);
          border-color: var(--border-hover);
        }
        .session-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.25rem 0.5rem;
        }
        .session-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem 0.5rem;
          border-radius: 0.375rem;
          cursor: pointer;
          transition: background 0.15s;
          position: relative;
        }
        .session-item:hover {
          background: var(--card);
        }
        .session-item.active {
          background: var(--card);
          border: 1px solid var(--border);
        }
        .session-name {
          flex: 1;
          font-size: 0.8125rem;
          min-width: 0;
        }
        .session-menu-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border-radius: 0.25rem;
          border: none;
          background: transparent;
          color: var(--fg-muted);
          cursor: pointer;
          opacity: 0;
          transition: opacity 0.15s;
        }
        .session-item:hover .session-menu-btn {
          opacity: 1;
        }
        .session-menu-btn:hover {
          background: var(--border);
          color: var(--fg);
        }
        .session-menu {
          position: absolute;
          right: 0.5rem;
          top: 100%;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 0.375rem;
          padding: 0.25rem;
          z-index: 50;
          min-width: 100px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        }
        .session-menu button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.375rem 0.5rem;
          border: none;
          background: transparent;
          color: var(--fg);
          font-size: 0.8125rem;
          cursor: pointer;
          border-radius: 0.25rem;
          text-align: left;
        }
        .session-menu button:hover {
          background: var(--border);
        }
        .session-menu button.destructive {
          color: var(--destructive);
        }
        .session-menu button.destructive:hover {
          background: rgba(239,68,68,0.1);
        }
        .session-menu button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .session-rename-input {
          flex: 1;
          background: var(--bg);
          border: 1px solid var(--accent);
          border-radius: 0.25rem;
          padding: 0.25rem 0.375rem;
          color: var(--fg);
          font-size: 0.8125rem;
          outline: none;
        }
      `}</style>
    </aside>
  )
}
