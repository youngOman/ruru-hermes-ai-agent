# Hermes WebUI Upload Server

PDF / docx 上傳處理用的 mini FastAPI server。

## 為什麼有這個

`ChatPage` 的純文字檔可以瀏覽器自己讀完，但 PDF / docx 要重的解析（pymupdf / python-docx），不適合塞前端，也不應該動 Hermes upstream 程式碼。所以在 webui repo 自己起一個輕量 server，跑在 mac mini 上。

## 部署位置

- **Source 在**：`ruru-hermes-ai-agent/upload-server/`（這個資料夾）
- **執行在**：mac mini `/Users/young/.hermes-upload-server/`
- **Listen**：`127.0.0.1:9120`
- **被誰呼叫**：webui 前端透過 SSH tunnel + Vite proxy（`/upload-api/*`）

## 安裝（第一次）

**需要 Python 3.10+**（main.py 用了新版 union syntax `str | None`）。系統 `python3` 在 macOS 上常常還是 3.9 — 要改用明確的版本：

```bash
# 在 mac mini 上（路徑可能要改成你機器上的 Python 3.11）：
PY=/Users/young/.local/bin/python3.11   # 或 brew 裝的 /opt/homebrew/bin/python3.11
mkdir -p ~/.hermes-upload-server
$PY -m venv ~/.hermes-upload-server/venv
~/.hermes-upload-server/venv/bin/pip install -U pip
~/.hermes-upload-server/venv/bin/pip install \
  fastapi "uvicorn[standard]" python-multipart pymupdf python-docx
```

## 部署

從這個 repo 用 `pnpm upload-server:deploy` rsync 到 mac mini：

```bash
pnpm upload-server:deploy   # rsync upload-server/ → mini:~/.hermes-upload-server/
```

## 跑起來

在 mac mini 上：

```bash
~/.hermes-upload-server/venv/bin/python ~/.hermes-upload-server/main.py
```

或從筆電一鍵跑：

```bash
pnpm upload-server:start    # ssh mini 'python ~/.hermes-upload-server/main.py'
```

啟動時會自動產生（或讀取）`~/.hermes-upload-server.token`，前端 webui 透過 vite proxy 注入這個 token。

## 路由

| 方法 | 路徑 | 用途 | 需要 token |
|------|------|------|------------|
| GET  | `/healthz` | 健康檢查 | ❌ |
| POST | `/upload` | 上傳 PDF/docx，回傳抽出來的文字 | ✅ |
| GET  | `/list` | 列出論文資料夾裡所有檔 | ✅ |
| GET  | `/file/text?path=...` | 重讀已上傳檔案的文字 | ✅ |

## 安全層

- Bearer token 認證（每個 POST / GET 都檢查）
- CORS 只允 `http://localhost:5174`（Vite dev server）
- 檔案大小上限 50MB
- 副檔名白名單：`.pdf` / `.docx` / `.doc`
- 檔名 sanitize（擋 `..` / null bytes / 控制字元，保留 CJK）
- `/file/text` 的 path 必須在 `~/Desktop/ruru_論文專區/` 之下，擋 path traversal
- 只 bind `127.0.0.1`（外網不可達；筆電靠 SSH tunnel 接）

## 檔案落地

上傳的檔案會放到：

```text
/Users/young/Desktop/ruru_論文專區/
└── <category>/         (預設 = uploads/)
    └── <filename>      (重名自動加 (1) (2) ...)
```

`category` 由前端傳 `Form()` 進來；目前前端固定送 `uploads`。之後 UI 加分類選單時改傳真實 category。
