import { useQuery } from '@tanstack/react-query'
import { Sparkles, Lock, Loader2, RefreshCw } from 'lucide-react'
import { getSkills } from '../lib/api'

export function SkillsPage() {
  const { data: skills, isLoading, refetch } = useQuery({
    queryKey: ['skills'],
    queryFn: getSkills,
  })

  return (
    <div className="page-container">
      <div className="skills-page">
        <div className="page-header">
          <div className="header-left">
            <h1 className="page-title">
              <span className="title-glow">Skills</span>
            </h1>
            <p className="page-desc">管理和啟用你的 AI 技能 ✦</p>
          </div>
          <button className="icon-btn" onClick={() => refetch()} disabled={isLoading}>
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          </button>
        </div>

        <div className="skills-section">
          <div className="section-header">
            <Lock size={14} />
            <h2 className="section-title">內建 Skills</h2>
            <span className="section-count">{skills?.length ?? 0}</span>
          </div>

          {isLoading && (
            <div className="loading-state">
              <Loader2 size={20} className="animate-spin" />
              <span>載入中...</span>
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
                    <span className="skill-status">
                      <span className="status-dot" />
                      已啟用
                    </span>
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
            <p>還沒有個人 Skills — 跟 AI 對話後會自動出現在這裡 ✦</p>
          </div>
        </div>
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
          max-width: 960px;
          margin: 0 auto;
        }
        .page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 2.5rem;
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
          box-shadow: 0 0 16px var(--accent-glow);
        }
        .icon-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .skills-section {
          margin-bottom: 2.5rem;
        }
        .section-header {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 1.25rem;
          padding-bottom: 0.625rem;
          border-bottom: 1px solid var(--border);
          color: var(--fg-muted);
        }
        .section-title {
          font-size: 0.8125rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: var(--fg-muted);
        }
        .section-count {
          font-size: 0.6875rem;
          padding: 0.15rem 0.55rem;
          border-radius: 9999px;
          background: var(--accent-soft);
          border: 1px solid rgba(169, 139, 255, 0.25);
          color: var(--accent);
          font-weight: 600;
        }
        .loading-state {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 2.5rem;
          justify-content: center;
          color: var(--fg-muted);
          font-size: 0.875rem;
        }
        .skills-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 0.875rem;
        }
        .skill-card {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 1rem 1.1rem;
          background: rgba(20, 20, 50, 0.5);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          cursor: pointer;
          transition: all 0.22s ease;
          position: relative;
          overflow: hidden;
        }
        .skill-card::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg,
            rgba(169, 139, 255, 0),
            rgba(169, 139, 255, 0.4),
            rgba(110, 231, 255, 0.4),
            rgba(169, 139, 255, 0));
          mask: linear-gradient(#000, #000) content-box, linear-gradient(#000, #000);
          -webkit-mask: linear-gradient(#000, #000) content-box, linear-gradient(#000, #000);
          mask-composite: exclude;
          -webkit-mask-composite: xor;
          opacity: 0;
          transition: opacity 0.25s ease;
          pointer-events: none;
        }
        .skill-card:hover {
          transform: translateY(-2px);
          background: rgba(40, 40, 80, 0.6);
          border-color: rgba(169, 139, 255, 0.3);
          box-shadow:
            0 8px 24px rgba(0, 0, 0, 0.3),
            0 0 24px rgba(169, 139, 255, 0.15);
        }
        .skill-card:hover::before {
          opacity: 1;
        }
        .skill-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 0.6rem;
          background: linear-gradient(135deg, #a98bff 0%, #6ee7ff 100%);
          color: #fff;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(169, 139, 255, 0.35);
        }
        .skill-info {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          min-width: 0;
        }
        .skill-name {
          font-size: 0.9rem;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--fg);
        }
        .skill-status {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.6875rem;
          color: var(--success);
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 8px var(--success);
        }
        .empty-state {
          padding: 2.5rem;
          text-align: center;
          background: var(--surface);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px dashed rgba(169, 139, 255, 0.25);
          border-radius: 0.75rem;
          color: var(--fg-muted);
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  )
}
