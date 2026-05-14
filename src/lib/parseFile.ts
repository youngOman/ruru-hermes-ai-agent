/**
 * 檔案解析。兩條 path：
 *   - 純文字（.txt / .md / .csv / .json / 程式碼…）：瀏覽器 file.text() 直接讀
 *   - PDF / docx / doc：上傳到 mac mini 的 upload-server（:9120），
 *     用 pymupdf / python-docx 抽文字後拿回 extracted_text。同時檔案會落地到
 *     /Users/young/Desktop/ruru_論文專區/uploads/。
 *
 * 上傳路徑走 Vite proxy 的 /upload-api（自動注入 Authorization token）。
 * 看 vite.config.ts + upload-server/main.py。
 */

const TEXT_MIME_PREFIXES = ['text/'] as const

const ALLOWED_TEXT_MIMES = new Set([
  'application/json',
  'application/xml',
  'application/x-yaml',
  'application/yaml',
  'application/javascript',
  'application/x-javascript',
  'application/typescript',
  'application/x-sh',
])

/**
 * 程式碼 / 設定檔常常 MIME 是空字串或 application/octet-stream，
 * 只能靠副檔名判斷。
 */
const ALLOWED_TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'log',
  'json', 'jsonc', 'yaml', 'yml', 'toml', 'xml', 'html', 'htm',
  'js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift',
  'c', 'cc', 'cpp', 'h', 'hpp', 'cs',
  'sh', 'bash', 'zsh', 'fish',
  'sql', 'graphql', 'gql',
  'css', 'scss', 'sass', 'less',
  'env', 'gitignore', 'dockerignore', 'editorconfig',
  'ini', 'conf', 'cfg', 'properties',
])

const BINARY_DOC_EXTENSIONS = new Set(['pdf', 'docx', 'doc'])

function fileExt(file: File): string {
  return file.name.includes('.')
    ? file.name.split('.').pop()!.toLowerCase()
    : ''
}

export function isSupportedTextFile(file: File): boolean {
  const mime = file.type.toLowerCase()
  if (TEXT_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) return true
  if (ALLOWED_TEXT_MIMES.has(mime)) return true

  const ext = fileExt(file)
  return ALLOWED_TEXT_EXTENSIONS.has(ext)
}

export function isSupportedBinaryDoc(file: File): boolean {
  return BINARY_DOC_EXTENSIONS.has(fileExt(file))
}

export function isSupportedFile(file: File): boolean {
  return isSupportedTextFile(file) || isSupportedBinaryDoc(file)
}

export interface ExtractedFile {
  text: string
  /** 後端 server 落地的絕對路徑（純文字檔不存在後端、為 undefined） */
  savedPath?: string
}

/**
 * 上傳 PDF / docx 到 mac mini 的 upload-server，拿回抽出來的文字。
 * Vite proxy 會自動帶 Authorization token，前端不接觸 token。
 *
 * upload-server 跑在 mac mini :9120，要先 `pnpm upload-server:deploy`
 * 然後 `pnpm upload-server:start`（並開著 tunnel）才能用。
 */
async function uploadAndExtract(file: File): Promise<ExtractedFile> {
  const form = new FormData()
  form.append('file', file, file.name)
  form.append('category', 'uploads')

  let resp: Response
  try {
    resp = await fetch('/upload-api/upload', { method: 'POST', body: form })
  } catch (err) {
    throw new Error(
      `連不上 upload-server（mac mini :9120）：${
        err instanceof Error ? err.message : '未知錯誤'
      }。請確認 pnpm tunnel + upload-server:start 都跑起來了`,
    )
  }

  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`
    try {
      const body = await resp.json()
      if (body?.detail) detail = String(body.detail)
    } catch {
      // ignore — 用預設 HTTP code 訊息
    }
    throw new Error(`upload-server 拒絕：${detail}`)
  }

  const body = (await resp.json()) as {
    saved_path: string
    extracted_text: string
  }
  return { text: body.extracted_text, savedPath: body.saved_path }
}

export async function extractFile(file: File): Promise<ExtractedFile> {
  if (isSupportedBinaryDoc(file)) {
    return await uploadAndExtract(file)
  }
  if (isSupportedTextFile(file)) {
    return { text: await file.text() }
  }
  throw new Error(`不支援的檔案類型：${file.name}`)
}

/**
 * @deprecated 用 extractFile() 改取得結構化結果。保留舊 API 是因為
 * ChatPage 還沒重寫前的相容性 — 之後 callers 都改完可以刪。
 */
export async function extractText(file: File): Promise<string> {
  const r = await extractFile(file)
  return r.text
}
