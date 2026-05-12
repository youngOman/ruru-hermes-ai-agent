/**
 * 圖片儲存：把使用者上傳的圖片以 Blob 形式存在 IndexedDB 裡。
 *
 * 為什麼不直接塞 localStorage？
 * - localStorage 上限通常 5–10MB，幾張高解析照片就會撐爆，
 *   而且整包 hermes-webui:state:v1 寫不進去時連對話紀錄都會掉。
 * - IndexedDB 容量上限大得多（瀏覽器通常 GB 級），又能存原生 Blob，
 *   不用 base64 把體積放大 1.33x。
 *
 * Message 裡只存 image id；要顯示時呼叫 getImage(id) 拿 Blob，
 * 再轉成 object URL 給 <img src>。送進 API 時才轉 base64。
 */

const DB_NAME = 'hermes-webui-images'
const DB_VERSION = 1
const STORE = 'images'

export interface StoredImage {
  id: string
  blob: Blob
  mime: string
  name: string
  size: number
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

function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export async function putImage(file: File | Blob, name?: string): Promise<StoredImage> {
  const db = await openDb()
  const record: StoredImage = {
    id: generateImageId(),
    blob: file,
    mime: file.type || 'application/octet-stream',
    name: name || (file instanceof File ? file.name : 'image'),
    size: file.size,
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

export async function getImage(id: string): Promise<StoredImage | null> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(id)
    req.onsuccess = () => resolve((req.result as StoredImage) ?? null)
    req.onerror = () => reject(req.error)
  })
}

export async function deleteImage(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

/**
 * 物件 URL 是 per-document 的，掛在記憶體裡直到 revoke 或頁面關閉。
 * 我們用一個 module-level cache 確保同一張圖在 React re-render 之間
 * 不會被反覆建立、洩漏 URL（也讓 <img> 的 src 穩定不閃爍）。
 */
const objectUrlCache = new Map<string, string>()

export async function getImageObjectUrl(id: string): Promise<string | null> {
  const cached = objectUrlCache.get(id)
  if (cached) return cached
  const rec = await getImage(id)
  if (!rec) return null
  const url = URL.createObjectURL(rec.blob)
  objectUrlCache.set(id, url)
  return url
}

export function revokeImageObjectUrl(id: string) {
  const url = objectUrlCache.get(id)
  if (url) {
    URL.revokeObjectURL(url)
    objectUrlCache.delete(id)
  }
}
