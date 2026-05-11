import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Activity, Sparkles, AlertCircle, Loader2, RefreshCw, FileText, MessageSquare, BookOpen } from 'lucide-react'
import { getSessions, getLogs, type SessionSummary } from '../lib/adminApi'
import { CHANGELOG } from '../data/changelog'

type Tab = 'changelog' | 'sessions' | 'logs'

interface ParsedLog {
  timestamp: string
  level: string
  module: string
  message: string
  raw: string
}

const LOG_RE = /^(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}[,.]\d+)\s+(\w+)\s+([\w.]+):\s+(.*)$/

function parseLog(line: string): ParsedLog {
  const trimmed = line.trimEnd()
  const m = trimmed.match(LOG_RE)
  if (!m) {
    return { timestamp: '', level: '', module: '', message: trimmed, raw: trimmed }
  }
  return { timestamp: m[1], level: m[2], module: m[3], message: m[4], raw: trimmed }
}

function sessionTypeLabel(s: SessionSummary): { label: string; icon: typeof Sparkles } {
  const id = s.id || ''
  if (id.startsWith('api-')) return { label: 'API / WebUI', icon: Sparkles }
  if (s.source === 'telegram' || id.includes('telegram')) return { label: 'Telegram', icon: MessageSquare }
  if (s.source === 'discord' || id.includes('discord')) return { label: 'Discord', icon: MessageSquare }
  if (s.source === 'mattermost' || id.includes('mm')) return { label: 'Mattermost', icon: MessageSquare }
  return { label: s.source || 'unknown', icon: Sparkles }
}

export function UpdatesPage() {
  const [tab, setTab] = useState<Tab>('changelog')

  return (
    <div className="page-container">
      <div className="updates-page">
        <header className="updates-header">
          <div className="updates-title-row">
            <span className="updates-title-icon" aria-hidden="true">
              <Activity size={20} />
            </span>
            <h1 className="updates-title">活動 & 更新</h1>
          </div>
          <p className="updates-subtitle">
            看 Hermes 後端最近的對話、系統 log，還有這個 webui 本身的版本紀錄
          </p>
        </header>

        <div className="tabs">
          <TabBtn active={tab === 'changelog'} onClick={() => setTab('changelog')} icon={BookOpen}>
            版本紀錄
          </TabBtn>
          <TabBtn active={tab === 'sessions'} onClick={() => setTab('sessions')} icon={MessageSquare}>
            Sessions
          </TabBtn>
          <TabBtn active={tab === 'logs'} onClick={() => setTab('logs')} icon={FileText}>
            系統 Logs
          </TabBtn>
        </div>

        {tab === 'changelog' && <ChangelogTab />}
        {tab === 'sessions' && <SessionsTab />}
        {tab === 'logs' && <LogsTab />}
      </div>

      <style>{`
        .page-container {
          height: 100%;
          overflow-y: auto;
          position: relative;
          z-index: 1;
        }
        .updates-page {
          padding: 2rem 2rem 3rem;
          max-width: 940px;
          margin: 0 auto;
        }
        .updates-header {
          margin-bottom: 1.5rem;
        }
        .updates-title-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 0.5rem;
        }
        .updates-title-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          color: var(--accent);
          filter: drop-shadow(0 0 8px var(--accent-glow));
        }
        .updates-title {
          font-size: 1.65rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          color: var(--fg);
        }
        .updates-subtitle {
          color: var(--fg-muted);
          font-size: 0.875rem;
          line-height: 1.6;
          max-width: 620px;
        }

        .tabs {
          display: flex;
          gap: 0.4rem;
          margin-bottom: 1.25rem;
          border-bottom: 1px solid var(--border);
          padding-bottom: 0.4rem;
        }
      `}</style>
    </div>
  )
}

interface TabBtnProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  icon: typeof Activity
}

function TabBtn({ active, onClick, children, icon: Icon }: TabBtnProps) {
  return (
    <button className={`tab-btn ${active ? 'active' : ''}`} onClick={onClick}>
      <Icon size={14} />
      {children}
      <style>{`
        .tab-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.9rem;
          border-radius: 0.55rem;
          border: 1px solid transparent;
          background: transparent;
          color: var(--fg-muted);
          font-size: 0.85rem;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .tab-btn:hover {
          color: var(--fg);
          background: var(--surface);
        }
        .tab-btn.active {
          background: var(--accent-soft);
          color: var(--accent);
          border-color: rgba(169, 139, 255, 0.3);
        }
      `}</style>
    </button>
  )
}

// ---------------------------------------------------------------------------
// Changelog tab (existing static data)
// ---------------------------------------------------------------------------

const TAG_LABEL = { feature: '新功能', change: '調整', fix: '修正' } as const

function ChangelogTab() {
  const renderInlineCode = (text: string) => {
    const parts = text.split(/(`[^`]+`)/g)
    return parts.map((part, i) =>
      part.startsWith('`') && part.endsWith('`') ? (
        <code key={i}>{part.slice(1, -1)}</code>
      ) : (
        <span key={i}>{part}</span>
      ),
    )
  }

  return (
    <div className="releases">
      {CHANGELOG.map((release) => (
        <article key={release.id} className="release-card">
          <header className="release-header">
            <span className="release-date">{release.date}</span>
            <h2 className="release-title">{release.title}</h2>
          </header>
          <hr className="release-divider" />
          <ul className="release-items">
            {release.items.map((item, idx) => (
              <li key={idx} className="release-item">
                <span className={`tag tag-${item.tag}`}>{TAG_LABEL[item.tag]}</span>
                <span className="item-text">{renderInlineCode(item.text)}</span>
              </li>
            ))}
          </ul>
        </article>
      ))}

      <style>{`
        .releases { display: flex; flex-direction: column; gap: 1rem; }
        .release-card {
          padding: 1.25rem 1.4rem 1.4rem;
          border-radius: 0.85rem;
          background: rgba(15, 15, 35, 0.55);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid var(--border);
          transition: border-color 0.2s ease;
        }
        .release-card:hover { border-color: rgba(169, 139, 255, 0.22); }
        .release-header {
          display: flex; align-items: baseline; gap: 1rem; flex-wrap: wrap;
        }
        .release-date {
          font-size: 0.8125rem;
          color: var(--fg-subtle);
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.01em;
          flex-shrink: 0;
        }
        .release-title {
          font-size: 1.05rem;
          font-weight: 600;
          color: var(--fg);
          letter-spacing: -0.01em;
          line-height: 1.4;
        }
        .release-divider {
          margin: 0.85rem 0 1rem;
          border: none;
          border-top: 1px solid var(--border);
        }
        .release-items {
          list-style: none; padding: 0; margin: 0;
          display: flex; flex-direction: column; gap: 0.65rem;
        }
        .release-item {
          display: flex; align-items: flex-start; gap: 0.65rem; line-height: 1.6;
        }
        .item-text {
          font-size: 0.875rem; color: var(--fg); flex: 1; min-width: 0;
        }
        .item-text code {
          font-family: 'SF Mono', Menlo, Consolas, monospace;
          font-size: 0.85em;
          padding: 0.1em 0.35em;
          background: rgba(110, 231, 255, 0.1);
          border: 1px solid rgba(110, 231, 255, 0.18);
          border-radius: 0.3rem;
          color: var(--cyan);
        }
        .tag {
          display: inline-flex;
          align-items: center;
          padding: 0.18rem 0.6rem;
          border-radius: 9999px;
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          flex-shrink: 0;
          margin-top: 0.15rem;
          border: 1px solid transparent;
          line-height: 1.4;
        }
        .tag-feature {
          background: rgba(94, 158, 255, 0.14);
          color: #7eb6ff;
          border-color: rgba(94, 158, 255, 0.32);
        }
        .tag-change {
          background: rgba(140, 140, 180, 0.14);
          color: #b8b8d8;
          border-color: rgba(140, 140, 180, 0.28);
        }
        .tag-fix {
          background: rgba(94, 234, 212, 0.12);
          color: #5eead4;
          border-color: rgba(94, 234, 212, 0.28);
        }
      `}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sessions tab
// ---------------------------------------------------------------------------

function SessionsTab() {
  const { data: sessions, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-sessions'],
    queryFn: getSessions,
  })

  return (
    <div>
      <div className="tab-toolbar">
        <span className="count-pill">
          {sessions?.length ?? 0} 個 sessions
        </span>
        <button className="icon-btn" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      {isLoading && (
        <div className="state-msg"><Loader2 size={18} className="animate-spin" /> 載入中...</div>
      )}
      {error && <ApiError error={error} />}

      {sessions && sessions.length === 0 && (
        <div className="state-msg">還沒有任何 session 紀錄</div>
      )}

      {sessions && sessions.length > 0 && (
        <div className="session-list">
          {sessions.map((s) => {
            const { label, icon: Icon } = sessionTypeLabel(s)
            return (
              <div key={s.id} className="session-row">
                <span className="session-source-icon"><Icon size={14} /></span>
                <div className="session-main">
                  <div className="session-line-1">
                    <span className="session-source">{label}</span>
                    <span className="session-id">{s.id}</span>
                  </div>
                  <div className="session-line-2">
                    <span className="session-model">{s.model}</span>
                    {s.user_id && <span className="session-user">· user: {s.user_id}</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <SharedStyles />
      <style>{`
        .session-list {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .session-row {
          display: flex;
          align-items: center;
          gap: 0.8rem;
          padding: 0.7rem 0.9rem;
          border-radius: 0.55rem;
          background: var(--surface);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          transition: all 0.15s ease;
        }
        .session-row:hover {
          border-color: rgba(169, 139, 255, 0.25);
          background: var(--surface-hover);
        }
        .session-source-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.45rem;
          background: var(--accent-soft);
          color: var(--accent);
          flex-shrink: 0;
        }
        .session-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .session-line-1 {
          display: flex;
          align-items: baseline;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .session-source {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--fg);
        }
        .session-id {
          font-size: 0.7rem;
          color: var(--fg-subtle);
          font-family: 'SF Mono', Menlo, monospace;
        }
        .session-line-2 {
          font-size: 0.75rem;
          color: var(--fg-muted);
        }
      `}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Logs tab
// ---------------------------------------------------------------------------

const LOG_FILES = ['agent', 'gateway'] as const

function LogsTab() {
  const [file, setFile] = useState<(typeof LOG_FILES)[number]>('agent')
  const [limit, setLimit] = useState(50)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['admin-logs', file],
    queryFn: () => getLogs(500, file),
    // 30s polling so it feels live
    refetchInterval: 30_000,
  })

  const parsed = useMemo(() => {
    if (!data?.lines) return []
    // backend returns oldest→newest, we want newest at top
    return data.lines
      .slice(-limit)
      .reverse()
      .map(parseLog)
  }, [data, limit])

  return (
    <div>
      <div className="tab-toolbar">
        <div className="log-filter-group">
          {LOG_FILES.map((f) => (
            <button
              key={f}
              className={`pill-btn ${file === f ? 'active' : ''}`}
              onClick={() => setFile(f)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="limit-group">
          <span className="limit-label">顯示</span>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="limit-select"
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>全部</option>
          </select>
        </div>
        <button className="icon-btn" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      {isLoading && <div className="state-msg"><Loader2 size={18} className="animate-spin" /> 載入中...</div>}
      {error && <ApiError error={error} />}

      {parsed.length > 0 && (
        <div className="log-list">
          {parsed.map((log, i) => (
            <div key={i} className={`log-row level-${log.level.toLowerCase()}`}>
              <span className="log-ts">{log.timestamp.split(' ')[1]?.split(',')[0] ?? ''}</span>
              <span className="log-level">{log.level}</span>
              <span className="log-module">{log.module}</span>
              <span className="log-msg">{log.message}</span>
            </div>
          ))}
        </div>
      )}

      <SharedStyles />
      <style>{`
        .log-filter-group { display: flex; gap: 0.3rem; }
        .pill-btn {
          padding: 0.35rem 0.75rem;
          border-radius: 9999px;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--fg-muted);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .pill-btn:hover { color: var(--fg); }
        .pill-btn.active {
          background: var(--accent-soft);
          color: var(--accent);
          border-color: rgba(169, 139, 255, 0.35);
        }
        .limit-group {
          display: flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.75rem;
          color: var(--fg-muted);
        }
        .limit-select {
          padding: 0.3rem 0.55rem;
          border-radius: 0.4rem;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--fg);
          font-size: 0.75rem;
          outline: none;
          cursor: pointer;
        }

        .log-list {
          display: flex;
          flex-direction: column;
          background: rgba(7, 7, 26, 0.55);
          border: 1px solid var(--border);
          border-radius: 0.55rem;
          font-family: 'SF Mono', Menlo, Consolas, monospace;
          font-size: 0.75rem;
          line-height: 1.55;
          overflow: hidden;
        }
        .log-row {
          display: grid;
          grid-template-columns: 70px 60px 180px 1fr;
          gap: 0.6rem;
          padding: 0.35rem 0.7rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.04);
        }
        .log-row:last-child { border-bottom: none; }
        .log-row:hover { background: rgba(255, 255, 255, 0.02); }
        .log-ts {
          color: var(--fg-subtle);
          font-variant-numeric: tabular-nums;
        }
        .log-level {
          font-weight: 600;
          letter-spacing: 0.04em;
        }
        .log-row.level-info .log-level    { color: #6ee7ff; }
        .log-row.level-warning .log-level { color: #fbbf24; }
        .log-row.level-error .log-level   { color: #ff7a8a; }
        .log-row.level-debug .log-level   { color: var(--fg-subtle); }
        .log-module {
          color: var(--accent);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .log-msg {
          color: var(--fg);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .log-msg:hover {
          white-space: normal;
          overflow: visible;
        }
      `}</style>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------

function ApiError({ error }: { error: unknown }) {
  return (
    <div className="error-state">
      <AlertCircle size={18} />
      <div>
        <p className="error-title">無法載入資料</p>
        <p className="error-detail">{error instanceof Error ? error.message : String(error)}</p>
        <p className="error-hint">
          檢查 admin tunnel：<code>npm run tunnel:status</code>（需要 9119 listening）
        </p>
      </div>
      <style>{`
        .error-state {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          padding: 1rem 1.25rem;
          background: rgba(255, 122, 138, 0.08);
          border: 1px solid rgba(255, 122, 138, 0.3);
          border-radius: 0.6rem;
          color: var(--destructive);
        }
        .error-state svg { margin-top: 2px; flex-shrink: 0; }
        .error-title { font-weight: 600; margin-bottom: 0.3rem; font-size: 0.875rem; }
        .error-detail {
          font-size: 0.8125rem;
          color: var(--fg-muted);
          word-break: break-word;
          font-family: 'SF Mono', Menlo, monospace;
        }
        .error-hint {
          margin-top: 0.4rem;
          font-size: 0.8125rem;
          color: var(--fg-muted);
        }
        .error-hint code {
          padding: 0.1rem 0.35rem;
          background: rgba(169, 139, 255, 0.12);
          border-radius: 0.25rem;
          color: var(--accent);
        }
      `}</style>
    </div>
  )
}

function SharedStyles() {
  return (
    <style>{`
      .tab-toolbar {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .tab-toolbar > :first-child { margin-right: auto; }
      .count-pill {
        font-size: 0.75rem;
        padding: 0.2rem 0.6rem;
        border-radius: 9999px;
        background: var(--accent-soft);
        color: var(--accent);
        border: 1px solid rgba(169, 139, 255, 0.25);
        font-weight: 600;
        margin-right: auto;
      }
      .icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        border-radius: 0.5rem;
        border: 1px solid var(--border);
        background: var(--surface);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        color: var(--fg-muted);
        cursor: pointer;
        transition: all 0.18s ease;
      }
      .icon-btn:hover:not(:disabled) {
        color: var(--accent);
        border-color: var(--border-hover);
      }
      .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      .state-msg {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        padding: 2rem;
        justify-content: center;
        color: var(--fg-muted);
        font-size: 0.875rem;
      }
    `}</style>
  )
}
