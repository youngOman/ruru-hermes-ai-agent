# Hermes WebUI — 女友專屬 AI 平台

> 讓女友能輕鬆使用 AI 助理的多 session 管理平台

---

## 🎯 核心目標

1. **多 Session 並行** — 同時開多個獨立的 AI 對話
2. **好看的視覺介面** — 參考 hermes-admin 簡約風格
3. **Skills 管理** — 查看/啟用/停用 Skills
4. **更新記錄** — 顯示操作歷史

---

## 🗺 功能藍圖

### Phase 1 — 核心功能

- [x] 多 Session 分頁系統（左側 sidebar 列表）
- [x] 對話區（訊息展示、輸入框）
- [x] Session 新增 / 關閉 / 切換
- [x] 好看的前端介面

### Phase 2 — Skills 管理

- [ ] Skills 列表頁面
- [ ] 個別 Skill 啟用/停用
- [ ] Skills 同步狀態

### Phase 3 — 更新記錄

- [ ] 操作歷史日誌
- [ ] 時間/類型過濾
- [ ] 匯出功能

---

## 📐 架構設計

```
女友（瀏覽器）
    │
    ├── Vite + React（前端）
    │       ├── Session 分頁管理
    │       ├── 對話 UI
    │       └── Skills / 更新記錄 頁面
    │
    └── Hermes API Server（Python，port 8642）
            ├── /v1/chat/completions（對話）
            ├── /v1/runs（異步任務 + SSE）
            └── Session 管理（X-Hermes-Session-Id）
```

---

## 🎨 設計風格

**參考**：hermes-admin（簡約、功能導向）

- **色調**：深色 theme（類似 Linear/Vercel Console）
- **字體**：Inter + Noto Sans CJK
- **元件**：shadcn/ui 風格

### 主色調

```
--bg: #09090b (zinc-950)
--fg: #fafafa
--accent: #a855f7 (purple-500)
--muted-fg: #71717a (zinc-500)
--border: #27272a (zinc-800)
```

---

## 📁 頁面結構

```
/                     → 登入頁（簡化版）
/chat                 → 主頁：Session 列表 + 對話區
/skills               → Skills 管理頁面
/updates              → 更新記錄頁面
```

---

## 🔧 Session 管理設計

### 左側 Sidebar

- Session 列表（名稱 + 狀態）
- [+ 新增 Session] 按鈕
- 當前活躍 Session 標記

### 右側對話區

- 訊息泡泡（User 右/AI 左）
- 輸入框 + 發送
- 串流回覆顯示
- 技能啟用指示（当前使用的 Skills）

### Session 狀態

```
🟢 運行中（streaming 回覆）
🟡 等待中（等待 API 回應）
⚫ 閒置（沒有在對話）
```

---

## 📝 技術棧

| 項目 | 選擇 |
|------|------|
| 前端框架 | React 19 + TypeScript |
| 建構工具 | Vite |
| UI 庫 | 自訂元件 + CSS Variables |
| 狀態管理 | React Query + Context |
| API 溝通 | fetch + SSE |
| 樣式 | CSS Modules |

---

## 🚀 啟動方式

```bash
cd hermes-webui
npm install
npm run dev    # http://localhost:5173
```

---

*最後更新：2026-05-07*
