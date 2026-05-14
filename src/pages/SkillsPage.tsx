import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Loader2, RefreshCw, Search, AlertCircle } from 'lucide-react'
import { getSkills, toggleSkill, type Skill } from '../lib/adminApi'

export function SkillsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  const {
    data: skills,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['skills'],
    queryFn: getSkills,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) =>
      toggleSkill(name, enabled),
    // Optimistic update so the switch flips immediately, no flicker.
    onMutate: async ({ name, enabled }) => {
      await qc.cancelQueries({ queryKey: ['skills'] })
      const prev = qc.getQueryData<Skill[]>(['skills'])
      qc.setQueryData<Skill[]>(['skills'], (old) =>
        old?.map((s) => (s.name === name ? { ...s, enabled } : s)),
      )
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['skills'], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['skills'] }),
  })

  // Group + filter
  const grouped = useMemo(() => {
    if (!skills) return null
    const q = search.trim().toLowerCase()
    const filtered = q
      ? skills.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.description.toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q),
        )
      : skills
    const map = new Map<string, Skill[]>()
    for (const s of filtered) {
      const cat = s.category || 'misc'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(s)
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [skills, search])

  const totalEnabled = skills?.filter((s) => s.enabled).length ?? 0
  const totalCount = skills?.length ?? 0

  return (
    <div className="page-container">
      <div className="skills-page">
        <div className="page-header">
          <div className="header-left">
            <h1 className="page-title">
              <span className="title-glow">Skills</span>
            </h1>
            <p className="page-desc">
              {totalCount > 0
                ? `已啟用 ${totalEnabled} / ${totalCount} 個技能 ✦`
                : '管理和啟用你的 AI 技能 ✦'}
            </p>
          </div>
          <button
            className="icon-btn"
            onClick={() => refetch()}
            disabled={isFetching}
            title="重新整理"
          >
            {isFetching ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>

        <div className="toolbar">
          <div className="search-box">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="搜尋技能（名稱、描述、分類）..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading && (
          <div className="loading-state">
            <Loader2 size={20} className="animate-spin" />
            <span>從 Hermes 載入技能列表中...</span>
          </div>
        )}

        {error && (
          <div className="error-state">
            <AlertCircle size={20} />
            <div>
              <p className="error-title">無法載入技能</p>
              <p className="error-detail">
                {error instanceof Error ? error.message : String(error)}
              </p>
              <p className="error-hint">
                檢查 admin tunnel（9119）是否還在：<code>pnpm tunnel:status</code>
              </p>
            </div>
          </div>
        )}

        {grouped && grouped.length === 0 && (
          <div className="empty-state">
            <p>沒有符合條件的技能</p>
          </div>
        )}

        {grouped && grouped.map(([category, items]) => {
          const isExpanded = expandedCategory === category || search.trim() !== ''
          const enabledCount = items.filter((s) => s.enabled).length
          return (
            <section key={category} className="skill-category">
              <button
                className="category-header"
                onClick={() => setExpandedCategory(isExpanded && search === '' ? null : category)}
                aria-expanded={isExpanded}
              >
                <span className={`chevron ${isExpanded ? 'open' : ''}`}>▸</span>
                <h2 className="category-title">{category}</h2>
                <span className="category-count">
                  {enabledCount} / {items.length}
                </span>
              </button>
              {isExpanded && (
                <div className="skills-grid">
                  {items.map((skill) => (
                    <SkillCard
                      key={skill.name}
                      skill={skill}
                      onToggle={(enabled) =>
                        toggleMutation.mutate({ name: skill.name, enabled })
                      }
                      pending={
                        toggleMutation.isPending &&
                        toggleMutation.variables?.name === skill.name
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>

      <style>{`
        .page-container {
          height: 100%;
          overflow-y: auto;
          position: relative;
          z-index: 1;
        }
        .skills-page {
          padding: 2rem 2rem 3rem;
          max-width: 1000px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 1.75rem;
        }
        .page-title {
          font-size: 1.75rem;
          font-weight: 700;
          letter-spacing: -0.02em;
        }
        .title-glow {
          background: linear-gradient(135deg, #fff 0%, #c8b8ff 60%, #6ee7ff 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          text-shadow: 0 0 22px rgba(169, 139, 255, 0.3);
        }
        .page-desc {
          margin-top: 0.4rem;
          color: var(--fg-muted);
          font-size: 0.875rem;
        }
        .icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 0.6rem;
          border: 1px solid var(--border);
          background: var(--surface);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: var(--fg-muted);
          cursor: pointer;
          transition: all 0.18s ease;
        }
        .icon-btn:hover:not(:disabled) {
          border-color: var(--border-hover);
          color: var(--accent);
          background: var(--accent-soft);
        }
        .icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .toolbar {
          margin-bottom: 1.5rem;
        }
        .search-box {
          position: relative;
          max-width: 460px;
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
          padding: 0.55rem 0.8rem 0.55rem 2.3rem;
          border-radius: 0.6rem;
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

        .loading-state,
        .empty-state {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 2.5rem;
          justify-content: center;
          color: var(--fg-muted);
          font-size: 0.875rem;
        }
        .empty-state {
          background: var(--surface);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px dashed rgba(169, 139, 255, 0.2);
          border-radius: 0.75rem;
        }
        .error-state {
          display: flex;
          align-items: flex-start;
          gap: 0.85rem;
          padding: 1.25rem 1.5rem;
          background: rgba(255, 122, 138, 0.08);
          border: 1px solid rgba(255, 122, 138, 0.3);
          border-radius: 0.75rem;
          color: var(--destructive);
        }
        .error-state svg { margin-top: 2px; flex-shrink: 0; }
        .error-title { font-weight: 600; margin-bottom: 0.3rem; }
        .error-detail {
          font-size: 0.8125rem;
          color: var(--fg-muted);
          word-break: break-word;
          font-family: 'SF Mono', Menlo, monospace;
        }
        .error-hint {
          margin-top: 0.5rem;
          font-size: 0.8125rem;
          color: var(--fg-muted);
        }
        .error-hint code {
          padding: 0.1rem 0.35rem;
          background: rgba(169, 139, 255, 0.12);
          border-radius: 0.25rem;
          color: var(--accent);
        }

        .skill-category {
          margin-bottom: 1rem;
        }
        .category-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.625rem 0.875rem;
          background: var(--surface);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid var(--border);
          border-radius: 0.625rem;
          color: var(--fg);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .category-header:hover {
          border-color: var(--border-hover);
          background: var(--surface-hover);
        }
        .chevron {
          font-size: 0.7rem;
          color: var(--fg-muted);
          transition: transform 0.18s ease;
          display: inline-block;
        }
        .chevron.open {
          transform: rotate(90deg);
          color: var(--accent);
        }
        .category-title {
          font-size: 0.95rem;
          font-weight: 600;
          letter-spacing: 0.01em;
          text-transform: capitalize;
          flex: 1;
          text-align: left;
        }
        .category-count {
          font-size: 0.75rem;
          color: var(--fg-muted);
          font-variant-numeric: tabular-nums;
        }
        .skills-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 0.75rem;
          padding: 0.75rem 0 0.25rem 1.5rem;
        }
      `}</style>
    </div>
  )
}

interface SkillCardProps {
  skill: Skill
  onToggle: (enabled: boolean) => void
  pending: boolean
}

function SkillCard({ skill, onToggle, pending }: SkillCardProps) {
  return (
    <div className={`skill-card ${skill.enabled ? 'on' : 'off'}`}>
      <div className="skill-icon">
        <Sparkles size={14} />
      </div>
      <div className="skill-info">
        <span className="skill-name">{skill.name}</span>
        {skill.description && (
          <span className="skill-desc" title={skill.description}>
            {skill.description}
          </span>
        )}
      </div>
      <label className="switch" title={skill.enabled ? '已啟用' : '已停用'}>
        <input
          type="checkbox"
          checked={skill.enabled}
          disabled={pending}
          onChange={(e) => onToggle(e.target.checked)}
        />
        <span className="slider">
          {pending && <Loader2 size={10} className="animate-spin slider-spinner" />}
        </span>
      </label>

      <style>{`
        .skill-card {
          display: grid;
          grid-template-columns: 32px 1fr auto;
          align-items: center;
          gap: 0.75rem;
          padding: 0.7rem 0.85rem;
          background: rgba(20, 20, 50, 0.5);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid var(--border);
          border-radius: 0.6rem;
          transition: all 0.18s ease;
        }
        .skill-card.off { opacity: 0.6; }
        .skill-card:hover {
          border-color: rgba(169, 139, 255, 0.3);
          background: rgba(40, 40, 80, 0.55);
        }
        .skill-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.45rem;
          background: linear-gradient(135deg, #a98bff 0%, #6ee7ff 100%);
          color: #fff;
          flex-shrink: 0;
        }
        .skill-card.off .skill-icon {
          background: rgba(80, 80, 120, 0.4);
        }
        .skill-info {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
          min-width: 0;
        }
        .skill-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--fg);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .skill-desc {
          font-size: 0.7rem;
          color: var(--fg-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          line-height: 1.35;
        }

        /* iOS-style switch */
        .switch {
          position: relative;
          display: inline-block;
          width: 36px;
          height: 20px;
          flex-shrink: 0;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          inset: 0;
          background: rgba(80, 80, 120, 0.5);
          border-radius: 9999px;
          transition: background 0.18s ease;
          cursor: pointer;
        }
        .slider::before {
          content: '';
          position: absolute;
          left: 2px;
          top: 2px;
          width: 16px;
          height: 16px;
          background: #fff;
          border-radius: 50%;
          transition: transform 0.18s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        }
        .switch input:checked + .slider {
          background: linear-gradient(135deg, #a98bff, #6ee7ff);
          box-shadow: 0 0 10px rgba(169, 139, 255, 0.4);
        }
        .switch input:checked + .slider::before {
          transform: translateX(16px);
        }
        .switch input:disabled + .slider {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .slider-spinner {
          position: absolute;
          right: 2px;
          top: 50%;
          transform: translateY(-50%);
          color: #fff;
        }
      `}</style>
    </div>
  )
}
