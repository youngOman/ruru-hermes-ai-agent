import type { UpdateRelease } from '../lib/api'

/**
 * Hermes WebUI 開發紀錄。
 * 每次發版時在最上面加一筆，並同步更新 repo 根目錄的 CHANGELOG.md。
 *
 * tag 對照：
 *   feature → Added   （新功能）
 *   change  → Changed （調整）
 *   fix     → Fixed   （修正）
 */
export const CHANGELOG: UpdateRelease[] = [
  {
    id: '0.2.0',
    date: '2026-05-08',
    title: '宇宙星空 UI 改造 + 對話品質優化',
    items: [
      { tag: 'feature', text: '全站換裝深太空藍紫主題：繁星動態背景、流星、星雲漸層飄移' },
      { tag: 'feature', text: '對話訊息支援 Markdown 渲染（`react-markdown` + GFM）— code block、表格、引用、清單都能正確顯示' },
      { tag: 'feature', text: 'Sessions 自動持久化到 `localStorage`，重新整理不會掉資料' },
      { tag: 'feature', text: '送出第一則訊息後，session 名稱會自動從訊息開頭擷取（手動改過就不會再被覆蓋）' },
      { tag: 'feature', text: '`CHANGELOG.md` + `src/data/changelog.ts`：開發紀錄正式有了固定家' },
      { tag: 'change', text: 'Sidebar、ChatPage、Skills、Updates 全部改成霧化玻璃面板 + 漸層描邊 + 發光動效' },
      { tag: 'change', text: '輸入框 textarea 改為自動撐高，最高 200px；focus 時加上紫色輝光' },
      { tag: 'change', text: '更新紀錄頁改為 release 卡片格式（日期 + 標題 + 標籤化條目）取代舊的 audit log 列表' },
    ],
  },
  {
    id: '0.1.0',
    date: '2026-05-07',
    title: 'Hermes WebUI 初版上線',
    items: [
      { tag: 'feature', text: '多 Session 並行：左側 sidebar 列表，可新增 / 切換 / 重新命名 / 刪除' },
      { tag: 'feature', text: '串流對話介面：對接 Hermes `/v1/chat/completions`（SSE），訊息逐字顯示' },
      { tag: 'feature', text: 'Skills 頁面骨架（顯示內建 skill 清單，尚未串真實 API）' },
      { tag: 'feature', text: '更新紀錄頁面骨架' },
      { tag: 'change', text: '前端走 Vite + React 19 + TypeScript，深色 theme、紫色 accent' },
      { tag: 'change', text: 'API proxy 設定到 `127.0.0.1:8642`（Hermes API server）' },
    ],
  },
]
