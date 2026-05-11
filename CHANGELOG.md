# Changelog

Hermes WebUI 的開發紀錄。新版本由上往下排（最新在最上面）。

格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)。

標籤對照：

- **Added** → 對應 UI 上的 `新功能`
- **Changed** → 對應 UI 上的 `調整`
- **Fixed** → 對應 UI 上的 `修正`

---

## [Unreleased]

### Added

- `npm run tunnel` / `tunnel:status` / `tunnel:kill` script，把筆電的 `127.0.0.1:8642` 透過 SSH 接到 mac mini 的 Hermes API server，方便在筆電完整測試前端
- `CLAUDE.md` 補上「本地開發 / 測試流程」段落，記錄 tunnel 流程與所需前置設定
- Skills 頁面接上 Hermes Dashboard 真實 API：顯示所有技能、按分類折疊、可即時 toggle 啟用/停用（樂觀更新）、可搜尋
- `src/lib/adminApi.ts`：封裝 Hermes Dashboard 的 session token 取得（從 SPA HTML 抽 `window.__HERMES_SESSION_TOKEN__`）、自動 cache、401 時自動失效重試
- `npm run tunnel` 同時轉發 8642（gateway）和 9119（dashboard），單一 SSH process

### Changed

- `vite.config.ts` 加上 `/api` proxy 到 `127.0.0.1:9119`，以及 `/__hermes_dashboard__` 用來抓 token HTML（不衝突自己的 SPA 路由）
- `tunnel:status` 同時檢查 8642 和 9119
- `tunnel:kill` regex 改成可以殺帶多個 `-L` 的 ssh process

---

## [0.2.0] — 2026-05-08

宇宙星空 UI 改造 + 對話品質優化

### Added

- 全站換裝深太空藍紫主題：繁星動態背景、流星、星雲漸層飄移
- 對話訊息支援 Markdown 渲染（`react-markdown` + GFM）— code block、表格、引用、清單都能正確顯示
- Sessions 自動持久化到 `localStorage`，重新整理不會掉資料
- 送出第一則訊息後，session 名稱會自動從訊息開頭擷取（手動改過就不會再被覆蓋）
- `CHANGELOG.md` + `src/data/changelog.ts`：開發紀錄正式有了固定家

### Changed

- Sidebar、ChatPage、Skills、Updates 全部改成霧化玻璃面板 + 漸層描邊 + 發光動效
- 輸入框 textarea 改為自動撐高，最高 200px；focus 時加上紫色輝光
- 更新紀錄頁改為 release 卡片格式（日期 + 標題 + 標籤化條目）取代舊的 audit log 列表

---

## [0.1.0] — 2026-05-07

Hermes WebUI 初版上線

### Added

- 多 Session 並行：左側 sidebar 列表，可新增 / 切換 / 重新命名 / 刪除
- 串流對話介面：對接 Hermes `/v1/chat/completions`（SSE），訊息逐字顯示
- Skills 頁面骨架（顯示內建 skill 清單，尚未串真實 API）
- 更新紀錄頁面骨架

### Changed

- 前端走 Vite + React 19 + TypeScript，深色 theme、紫色 accent
- API proxy 設定到 `127.0.0.1:8642`（Hermes API server）
