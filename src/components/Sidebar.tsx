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
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <defs>
              <linearGradient id="logo-grad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#a98bff" />
                <stop offset="100%" stopColor="#6ee7ff" />
              </linearGradient>
            </defs>
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="url(#logo-grad)" />
            <path d="M2 17l10 5 10-5" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 12l10 5 10-5" stroke="url(#logo-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className="logo-text">Hermes</span>
        <span className="logo-sparkle">✦</span>
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
            <span className="section-label">對話</span>
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
                    <span className="session-dot" aria-hidden="true" />
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

      <div className="sidebar-footer">
        <span className="footer-text">made with ✦ for ruru</span>
      </div>

      <style>{`
        .sidebar {
          width: 248px;
          min-width: 248px;
          height: 100%;
          position: relative;
          background: linear-gradient(180deg,
            rgba(18, 18, 44, 0.85) 0%,
            rgba(12, 12, 36, 0.7) 100%);
          backdrop-filter: blur(24px) saturate(140%);
          -webkit-backdrop-filter: blur(24px) saturate(140%);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          z-index: 1;
        }
        .sidebar::before {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 1px;
          height: 100%;
          background: linear-gradient(180deg,
            transparent,
            rgba(169, 139, 255, 0.4) 30%,
            rgba(110, 231, 255, 0.3) 70%,
            transparent);
          pointer-events: none;
        }
        .sidebar-logo {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 1.125rem 1.125rem 1rem;
          border-bottom: 1px solid var(--border);
          position: relative;
        }
        .logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          filter: drop-shadow(0 0 12px rgba(169, 139, 255, 0.55));
        }
        .logo-text {
          font-weight: 700;
          font-size: 1.05rem;
          letter-spacing: -0.02em;
          background: linear-gradient(135deg, #fff 0%, #c8b8ff 60%, #6ee7ff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }
        .logo-sparkle {
          margin-left: auto;
          font-size: 0.75rem;
          color: var(--accent);
          animation: twinkle 2.4s ease-in-out infinite;
          text-shadow: 0 0 8px var(--accent-glow);
        }
        .sidebar-nav {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 0.625rem;
          border-bottom: 1px solid var(--border);
        }
        .nav-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.55rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid transparent;
          background: transparent;
          color: var(--fg-muted);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.18s ease;
          text-align: left;
          position: relative;
        }
        .nav-item:hover {
          background: var(--surface);
          color: var(--fg);
          border-color: var(--border);
        }
        .nav-item.active {
          background: linear-gradient(135deg,
            rgba(169, 139, 255, 0.2),
            rgba(110, 231, 255, 0.1));
          color: var(--fg);
          font-weight: 500;
          border-color: rgba(169, 139, 255, 0.35);
          box-shadow: inset 0 0 12px rgba(169, 139, 255, 0.1);
        }
        .nav-item.active::before {
          content: '';
          position: absolute;
          left: -0.625rem;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 60%;
          background: linear-gradient(180deg, var(--accent), var(--cyan));
          border-radius: 0 3px 3px 0;
          box-shadow: 0 0 12px var(--accent-glow);
        }
        .sidebar-section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0.875rem 1.125rem 0.375rem;
        }
        .section-label {
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--fg-subtle);
        }
        .new-session-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 0.375rem;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--fg-muted);
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .new-session-btn:hover {
          background: var(--accent-soft);
          color: var(--accent);
          border-color: var(--border-hover);
          box-shadow: 0 0 12px var(--accent-glow);
        }
        .session-list {
          flex: 1;
          overflow-y: auto;
          padding: 0.25rem 0.625rem;
        }
        .session-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.55rem 0.625rem;
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.18s ease;
          position: relative;
          border: 1px solid transparent;
        }
        .session-item:hover {
          background: var(--surface);
          border-color: var(--border);
        }
        .session-item.active {
          background: linear-gradient(135deg,
            rgba(169, 139, 255, 0.18),
            rgba(110, 231, 255, 0.06));
          border-color: rgba(169, 139, 255, 0.32);
        }
        .session-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
          background: var(--fg-subtle);
          transition: all 0.18s;
        }
        .session-item.active .session-dot {
          background: var(--accent);
          box-shadow: 0 0 10px var(--accent-glow);
        }
        .session-name {
          flex: 1;
          font-size: 0.8125rem;
          min-width: 0;
          color: var(--fg);
        }
        .session-item:not(.active) .session-name {
          color: var(--fg-muted);
        }
        .session-menu-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 22px;
          height: 22px;
          border-radius: 0.25rem;
          border: none;
          background: transparent;
          color: var(--fg-muted);
          cursor: pointer;
          opacity: 0;
          transition: all 0.18s;
        }
        .session-item:hover .session-menu-btn,
        .session-item.active .session-menu-btn {
          opacity: 1;
        }
        .session-menu-btn:hover {
          background: rgba(169, 139, 255, 0.18);
          color: var(--fg);
        }
        .session-menu {
          position: absolute;
          right: 0.5rem;
          top: 100%;
          margin-top: 4px;
          background: rgba(20, 20, 50, 0.95);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--border-hover);
          border-radius: 0.5rem;
          padding: 0.25rem;
          z-index: 50;
          min-width: 120px;
          box-shadow: var(--shadow-soft), 0 0 24px rgba(169, 139, 255, 0.15);
        }
        .session-menu button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.5rem 0.625rem;
          border: none;
          background: transparent;
          color: var(--fg);
          font-size: 0.8125rem;
          cursor: pointer;
          border-radius: 0.375rem;
          text-align: left;
          transition: background 0.15s;
        }
        .session-menu button:hover {
          background: var(--accent-soft);
        }
        .session-menu button.destructive {
          color: var(--destructive);
        }
        .session-menu button.destructive:hover {
          background: rgba(255, 122, 138, 0.12);
        }
        .session-menu button:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .session-rename-input {
          flex: 1;
          background: var(--bg);
          border: 1px solid var(--accent);
          border-radius: 0.375rem;
          padding: 0.3rem 0.5rem;
          color: var(--fg);
          font-size: 0.8125rem;
          outline: none;
          box-shadow: 0 0 0 3px var(--accent-soft);
        }
        .sidebar-footer {
          padding: 0.75rem 1.125rem;
          border-top: 1px solid var(--border);
        }
        .footer-text {
          font-size: 0.6875rem;
          color: var(--fg-subtle);
          letter-spacing: 0.04em;
        }
      `}</style>
    </aside>
  )
}
