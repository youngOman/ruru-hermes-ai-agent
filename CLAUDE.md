# Hermes WebUI — Claude Code 工作守則

這是給 Claude Code 看的專案規則。在這個 repo 裡工作時請遵守。

---

## 自動 commit + push 規則

完成 `TodoWrite` 清單裡的**每一個 todo 項目**後，立刻：

1. `git add` 該段落實際相關的檔案（不要用 `git add -A`，避免帶入無關變更）
2. `git commit` — commit 訊息規則見下
3. `git push` 到 `origin main`

**判定「完成」的標準**：todo 從 `in_progress` → `completed` 那一刻。如果該 todo 沒有產生任何檔案變動（例如純研究 / 確認 build 通過），就跳過 commit。

### Commit 訊息規則

- 用繁體中文，主旨 50 字內，描述「做了什麼 + 為什麼」
- 用 conventional prefix：`feat:` / `fix:` / `refactor:` / `style:` / `docs:` / `chore:`
- 若該段落有實際的「為什麼」（修哪個 bug、做哪個 feature），寫進 body
- 結尾固定加 `Co-Authored-By` 註腳

範例：

```text
feat: 對話訊息支援 Markdown 渲染

整合 react-markdown + remark-gfm，AI 回覆裡的 code block、
表格、清單可以正確顯示。同時加上 inline code 樣式對應星空主題。

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

### Push 失敗時的處置

- 若 `git push` 因為 remote 比較新（non-fast-forward）失敗：先 `git pull --rebase`，再 push 一次。**不要** `--force`。
- 若 pre-commit hook 失敗：照 hook 訊息修，再開新 commit（不要 `--amend`）。
- 任何其他 push 失敗：停下來告訴使用者，不要嘗試破壞性操作。

### 例外狀況（不要自動 commit 的時候）

- 使用者明確說「先別 commit」/「等我 review」
- 改動還在半完成狀態（不該 commit 半成品）
- 該 todo 是「驗證 / 研究 / 探索」性質，沒檔案變動
- `CHANGELOG.md` 還沒同步更新時，使用者會希望兩件事一起進一個 commit — 看上下文判斷

### 同步 CHANGELOG.md 的義務

完成有使用者可見變更的 todo 時（feature / bugfix / 行為改變），記得**同時更新**：

- repo 根目錄的 `CHANGELOG.md`（`[Unreleased]` 區塊新增條目）
- `src/data/changelog.ts`（如果是準備發版才動，不是每次都動）

兩個檔案一起進同一個 commit。

---

## 技術棧速查

- React 19 + TypeScript + Vite
- 樣式：每個元件內嵌 `<style>` 區塊（CSS-in-component），全域 token 在 `src/index.css`
- 對話 API：`/v1/chat/completions`（SSE），proxy 到 `127.0.0.1:8642`（Hermes API server）
- 資料：sessions 持久化在 `localStorage`，key = `hermes-webui:state:v1`
- 開發紀錄：人類版在 `CHANGELOG.md`、UI 版在 `src/data/changelog.ts`

## 本地開發 / 測試流程

Hermes API server 跑在 mac mini（`mini` Tailscale host）的 `:8642`。
筆電開發時透過 SSH tunnel 把筆電的 `127.0.0.1:8642` 接到 mac mini：

```bash
# Terminal 1：開 tunnel（持續跑著，Ctrl-C 結束）
npm run tunnel

# Terminal 2：跑 Vite
npm run dev    # → http://localhost:5174
```

工具 script：

- `npm run tunnel` — 開 tunnel（預設連 `mini`，可用 `HERMES_SSH_HOST=xxx npm run tunnel` 換目標）
- `npm run tunnel:status` — 看 tunnel 是否在 listen
- `npm run tunnel:kill` — 殺掉背景 tunnel process

要求：

- 筆電 `~/.ssh/config` 有 `Host mini` block（含 `ServerAliveInterval` keep-alive）
- mac mini 開 Remote Login + 筆電 public key 已推上去（`ssh-copy-id young@mini`）
- 兩台都連著 Tailscale

## 風格約定

- 字體最小 12px（CJK 友善）
- 主題：深太空藍紫 + 紫色 accent + 青色 secondary
- 玻璃面板效果：`backdrop-filter: blur(...)` + 半透明背景
- 動效要尊重 `prefers-reduced-motion`
