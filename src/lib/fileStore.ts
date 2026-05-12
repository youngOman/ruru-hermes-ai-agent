/**
 * 文件儲存：使用者上傳的非圖片文件（PDF、Word、txt、md、code 等）。
 *
 * 為什麼跟 imageStore 分開？
 * - 圖片走多模態（送 image_url base64 給 AI），文件走「內容塞進 message 文字」
 *   兩種 lifecycle / 顯示方式完全不同，混在一起的話 message 渲染要一直 if/else 分支
 * - File blob 本身只是備份用（給「下載原檔」），AI 那邊吃的是解析出來的 extractedText
 *   所以這層 store 額外存 extractedText 跟 charCount，省得每次顯示都重新解析
 *
 * DB schema:
 *   hermes-webui-files DB → files objectStore (keyPath: id)
 *   { id, blob, mime, name, size, extractedText, charCount, createdAt }
 */

const DB_NAME = 'hermes-webui-files'
const DB_VERSION = 1
const STORE = 'files'

export interface StoredFile {
  id: string
  blob: Blob
  mime: string
  name: string
  size: number
  extractedText: string
  charCount: number
  createdAt: number
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function generateFileId(): string {
  return `file_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export interface PutFileInput {
  blob: Blob
  name: string
  mime: string
  extractedText: string
}

export async function putFile(input: PutFileInput): Promise<StoredFile> {
  const db = await openDb()
  const record: StoredFile = {
    id: generateFileId(),
    blob: input.blob,
    mime: input.mime || 'application/octet-stream',
    name: input.name,
    size: input.blob.size,
    extractedText: input.extractedText,
    charCount: input.extractedText.length,
    createdAt: Date.now(),
  }
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  return record
}

export async function getFile(id: string): Promise<StoredFile | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve((req.result as StoredFile) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteFile(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}
