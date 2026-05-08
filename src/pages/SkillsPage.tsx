import { useQuery } from '@tanstack/react-query'
import { Sparkles, Lock, Loader2, RefreshCw } from 'lucide-react'
import { getSkills } from '../lib/api'

export function SkillsPage() {
  const { data: skills, isLoading, refetch } = useQuery({
    queryKey: ['skills'],
    queryFn: getSkills,
  })

  return (
    <div className="skills-page">
      <div className="page-header">
        <div className="header-left">
          <h1 className="page-title">Skills</h1>
          <p className="page-desc text-muted text-sm">
            管理和啟用你的 AI 技能
          </p>
        </div>
        <button className="icon-btn" onClick={() => refetch()} disabled={isLoading}>
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        </button>
      </div>

      <div className="skills-section">
        <div className="section-header">
          <Lock size={14} className="text-muted" />
          <h2 className="section-title">內建 Skills</h2>
          <span className="section-count">{skills?.length ?? 0}</span>
        </div>

        {isLoading && (
          <div className="loading-state">
            <Loader2 size={20} className="animate-spin text-muted" />
            <span className="text-muted text-sm">載入中...</span>
          </div>
        )}

        {!isLoading && skills && (
          <div className="skills-grid">
            {skills.map((skill) => (
              <div key={skill} className="skill-card">
                <div className="skill-icon">
                  <Sparkles size={16} />
                </div>
                <div className="skill-info">
                  <span className="skill-name">{skill}</span>
                  <span className="skill-status text-muted text-xs">已啟用</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="skills-section">
        <div className="section-header">
          <Sparkles size={14} />
          <h2 className="section-title">個人 Skills</h2>
        </div>
        <div className="empty-state">
          <p className="text-muted text-sm">
            還沒有個人 Skills — 跟 AI 對話後會自動出現在這裡
          </p>
        </div>
      </div>

      <style>{`
        .skills-page {
          padding: 1.5rem;
          max-width: 900px;
        }
        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 2rem;
        }
        .page-title {
          font-size: 1.5rem;
          font-weight: 600;
          letter-spacing: -0.02em;
        }
        .page-desc {
          margin-top: 0.25rem;
        }
        .icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--fg-muted);
          cursor: pointer;
          transition: all 0.15s;
        }
        .icon-btn:hover:not(:disabled) {
          border-color: var(--border-hover);
          color: var(--fg);
        }
        .icon-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .skills-section {
          margin-bottom: 2rem;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid var(--border);
        }
        .section-title {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--fg-muted);
        }
        .section-count {
          font-size: 0.75rem;
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
          background: var(--card);
          border: 1px solid var(--border);
          color: var(--fg-muted);
        }
        .loading-state {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 2rem;
          justify-content: center;
        }
        .skills-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 0.75rem;
        }
        .skill-card {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.875rem 1rem;
          background: var(--card);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          cursor: pointer;
          transition: all 0.15s;
        }
        .skill-card:hover {
          border-color: var(--border-hover);
          background: var(--card-hover);
        }
        .skill-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 0.5rem;
          background: var(--accent);
          color: white;
          flex-shrink: 0;
        }
        .skill-info {
          display: flex;
          flex-direction: column;
          gap: 0.125rem;
          min-width: 0;
        }
        .skill-name {
          font-size: 0.875rem;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .skill-status {
          font-size: 0.6875rem;
        }
        .empty-state {
          padding: 2rem;
          text-align: center;
          background: var(--card);
          border: 1px dashed var(--border);
          border-radius: 0.5rem;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
