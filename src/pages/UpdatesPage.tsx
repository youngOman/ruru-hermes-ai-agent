import { useMemo, useState } from 'react'
import { History, Search } from 'lucide-react'
import type { UpdateTag } from '../lib/api'
import { CHANGELOG } from '../data/changelog'

const TAG_LABEL: Record<UpdateTag, string> = {
  feature: '新功能',
  change: '調整',
  fix: '修正',
}

export function UpdatesPage() {
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState<UpdateTag | 'all'>('all')

  const releases = CHANGELOG

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return releases
      .map((r) => ({
        ...r,
        items: r.items.filter((it) => {
          if (tagFilter !== 'all' && it.tag !== tagFilter) return false
          if (q && !it.text.toLowerCase().includes(q) && !r.title.toLowerCase().includes(q))
            return false
          return true
        }),
      }))
      .filter((r) => r.items.length > 0)
  }, [releases, search, tagFilter])

  const renderInlineCode = (text: string) => {
    // Render `x` as <code>x</code>
    const parts = text.split(/(`[^`]+`)/g)
    return parts.map((part, i) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i}>{part.slice(1, -1)}</code>
      }
      return <span key={i}>{part}</span>
    })
  }

  return (
    <div className="page-container">
      <div className="updates-page">
        <header className="updates-header">
          <div className="updates-title-row">
            <span className="updates-title-icon" aria-hidden="true">
              <History size={20} />
            </span>
            <h1 className="updates-title">更新紀錄</h1>
          </div>
          <p className="updates-subtitle">
            Hermes Console 是內部工具，會頻繁更新。新功能與破壞性變動會在 Mattermost 主動通知；其他調整在這裡看就好。
          </p>
        </header>

        <div className="updates-toolbar">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="搜尋更新..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="tag-filters">
            {(['all', 'feature', 'change', 'fix'] as const).map((t) => (
              <button
                key={t}
                className={`tag-filter-btn ${tagFilter === t ? 'active' : ''}`}
                onClick={() => setTagFilter(t)}
              >
                {t === 'all' ? '全部' : TAG_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="releases">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <History size={28} />
              <p>沒有符合條件的更新</p>
            </div>
          ) : (
            filtered.map((release) => (
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
            ))
          )}
        </div>
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
          max-width: 880px;
          margin: 0 auto;
        }

        /* Header */
        .updates-header {
          margin-bottom: 1.75rem;
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
          line-height: 1.65;
          max-width: 640px;
        }

        /* Toolbar */
        .updates-toolbar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .search-box {
          position: relative;
          flex: 1;
          min-width: 220px;
          max-width: 320px;
        }
        .search-icon {
          position: absolute;
          left: 0.85rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--fg-muted);
        }
        .search-input {
          width: 100%;
          padding: 0.5rem 0.8rem 0.5rem 2.3rem;
          border-radius: 0.55rem;
          border: 1px solid var(--border);
          background: var(--surface);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: var(--fg);
          font-size: 0.875rem;
          outline: none;
          transition: all 0.18s ease;
        }
        .search-input:focus {
          border-color: var(--border-hover);
          box-shadow: 0 0 0 3px var(--accent-soft);
        }
        .search-input::placeholder {
          color: var(--fg-subtle);
        }
        .tag-filters {
          display: flex;
          gap: 0.3rem;
        }
        .tag-filter-btn {
          padding: 0.4rem 0.8rem;
          border-radius: 9999px;
          border: 1px solid var(--border);
          background: var(--surface);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: var(--fg-muted);
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .tag-filter-btn:hover {
          color: var(--fg);
          border-color: var(--border-hover);
        }
        .tag-filter-btn.active {
          background: var(--accent-soft);
          color: var(--accent);
          border-color: rgba(169, 139, 255, 0.4);
        }

        /* Release cards */
        .releases {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .release-card {
          padding: 1.25rem 1.4rem 1.4rem;
          border-radius: 0.85rem;
          background: rgba(15, 15, 35, 0.55);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid var(--border);
          transition: border-color 0.2s ease;
        }
        .release-card:hover {
          border-color: rgba(169, 139, 255, 0.22);
        }
        .release-header {
          display: flex;
          align-items: baseline;
          gap: 1rem;
          flex-wrap: wrap;
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
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }
        .release-item {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          line-height: 1.6;
        }
        .item-text {
          font-size: 0.875rem;
          color: var(--fg);
          flex: 1;
          min-width: 0;
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

        /* Tags */
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

        /* Empty */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 3rem;
          text-align: center;
          background: var(--surface);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px dashed rgba(169, 139, 255, 0.2);
          border-radius: 0.75rem;
          color: var(--fg-muted);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  )
}
