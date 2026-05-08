import { useState } from 'react'
import { History, Download, Search, Filter } from 'lucide-react'
import type { UpdateEntry } from '../lib/api'

// Placeholder data - will be connected to Hermes session history
const PLACEHOLDER_UPDATES: UpdateEntry[] = [
  {
    id: '1',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    action: 'chat',
    details: '新對話：一般聊天',
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    action: 'skill',
    details: '啟用技能：travel-expenses',
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    action: 'session',
    details: '建立新 Session：新對話 2',
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    action: 'chat',
    details: '對話完成：討論旅行計畫',
  },
]

export function UpdatesPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')

  const updates = PLACEHOLDER_UPDATES

  const filteredUpdates = updates.filter((u) => {
    if (filter !== 'all' && u.action !== filter) return false
    if (search && !u.details.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const formatTime = (iso: string) => {
    const date = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '剛剛'
    if (diffMins < 60) return `${diffMins} 分鐘前`
    if (diffHours < 24) return `${diffHours} 小時前`
    if (diffDays < 7) return `${diffDays} 天前`
    return date.toLocaleDateString('zh-TW')
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'chat':
        return <span className="action-icon chat">💬</span>
      case 'skill':
        return <span className="action-icon skill">✨</span>
      case 'session':
        return <span className="action-icon session">📁</span>
      default:
        return <span className="action-icon">•</span>
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'chat':
        return 'var(--accent)'
      case 'skill':
        return 'var(--success)'
      case 'session':
        return 'var(--warn)'
      default:
        return 'var(--fg-muted)'
    }
  }

  const handleExport = () => {
    const csv = [
      ['時間', '類型', '詳情'],
      ...filteredUpdates.map((u) => [u.timestamp, u.action, u.details]),
    ]
      .map((row) => row.map((c) => `"${c}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `hermes-updates-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="updates-page">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">更新記錄</h1>
          <p className="page-desc text-muted text-sm">
            所有操作歷史
          </p>
        </div>
        <button className="export-btn" onClick={handleExport}>
          <Download size={14} />
          匯出 CSV
        </button>
      </div>

      <div className="filters">
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="搜尋..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={14} className="text-muted" />
          <select
            className="filter-select"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">全部</option>
            <option value="chat">對話</option>
            <option value="skill">技能</option>
            <option value="session">Session</option>
          </select>
        </div>
      </div>

      <div className="updates-list">
        {filteredUpdates.length === 0 ? (
          <div className="empty-state">
            <History size={32} className="text-muted" />
            <p className="text-muted text-sm">沒有符合條件的記錄</p>
          </div>
        ) : (
          filteredUpdates.map((update) => (
            <div key={update.id} className="update-item">
              {getActionIcon(update.action)}
              <div className="update-content">
                <span className="update-time">{formatTime(update.timestamp)}</span>
                <span className="update-details">{update.details}</span>
              </div>
              <span
                className="update-action-badge"
                style={{ color: getActionColor(update.action) }}
              >
                {update.action}
              </span>
            </div>
          ))
        )}
      </div>

      <style>{`
        .updates-page {
          padding: 1.5rem;
          max-width: 800px;
        }
        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1.5rem;
        }
        .page-title {
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: -0.02em;
        }
        .page-desc {
          margin-top: 0.25rem;
        }
        .export-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--fg);
          font-size: 0.8125rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .export-btn:hover {
          border-color: var(--border-hover);
          background: var(--card-hover);
        }
        .filters {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }
        .search-box {
          position: relative;
          flex: 1;
          max-width: 300px;
        }
        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--fg-muted);
        }
        .search-input {
          width: 100%;
          padding: 0.5rem 0.75rem 0.5rem 2.25rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--fg);
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .search-input:focus {
          border-color: var(--accent);
        }
        .search-input::placeholder {
          color: var(--fg-muted);
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .filter-select {
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--fg);
          font-size: 0.875rem;
          outline: none;
          cursor: pointer;
        }
        .filter-select:focus {
          border-color: var(--accent);
        }
        .updates-list {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .update-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          background: var(--card);
          border: 1px solid var(--border);
          transition: background 0.15s;
        }
        .update-item:hover {
          background: var(--card-hover);
        }
        .action-icon {
          font-size: 1rem;
          width: 24px;
          text-align: center;
          flex-shrink: 0;
        }
        .update-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          min-width: 0;
        }
        .update-time {
          font-size: 0.6875rem;
          color: var(--fg-muted);
        }
        .update-details {
          font-size: 0.875rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .update-action-badge {
          font-size: 0.6875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          flex-shrink: 0;
        }
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 3rem;
          text-align: center;
          background: var(--card);
          border: 1px dashed var(--border);
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  )
}
