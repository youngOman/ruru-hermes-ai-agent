/**
 * 純文字檔案解析。涵蓋 .txt / .md / .csv / 程式碼檔（.py .ts .json
 * .yaml ...）。瀏覽器原生 file.text() 一行解決，不需要任何套件。
 *
 * PDF / docx 不在這層處理 — 走 Hermes 後端 ocr-and-documents skill
 * 解析（品質遠勝 pdfjs，且能 OCR）。等後端 upload endpoint 上線再做。
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

export function isSupportedTextFile(file: File): boolean {
  const mime = file.type.toLowerCase()
  if (TEXT_MIME_PREFIXES.some((prefix) => mime.startsWith(prefix))) return true
  if (ALLOWED_TEXT_MIMES.has(mime)) return true

  const ext = file.name.includes('.')
    ? file.name.split('.').pop()!.toLowerCase()
    : ''
  return ALLOWED_TEXT_EXTENSIONS.has(ext)
}

/**
 * 目前所有支援的文件類型都走「讀整檔成 string」這條路。
 * 之後 PDF / docx 接後端 skill 時，這層只需要回傳「解析中、等後端」這種佔位字串。
 */
export async function extractText(file: File): Promise<string> {
  if (!isSupportedTextFile(file)) {
    throw new Error(`不支援的檔案類型：${file.name}（目前 PDF / Word 還沒接後端 skill）`)
  }
  return await file.text()
}
