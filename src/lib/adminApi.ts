/**
 * Hermes Dashboard admin API client.
 *
 * The admin server (`hermes dashboard`) protects sensitive endpoints with an
 * ephemeral session token that's injected into its SPA HTML as
 * `window.__HERMES_SESSION_TOKEN__`. We fetch the HTML once at startup,
 * regex out the token, cache it for the rest of the page lifetime, and send
 * it as `X-Hermes-Session-Token` on every /api/* request.
 *
 * Token rotates whenever the admin server restarts; on 401 we clear the cache
 * and re-fetch automatically.
 */

const DASHBOARD_HTML = '/__hermes_dashboard__/'
const TOKEN_HEADER = 'X-Hermes-Session-Token'
const TOKEN_RE = /window\.__HERMES_SESSION_TOKEN__="([^"]+)"/

let tokenPromise: Promise<string> | null = null

async function fetchToken(): Promise<string> {
  const res = await fetch(DASHBOARD_HTML, { cache: 'no-store' })
  if (!res.ok) {
    throw new Error(`Failed to load dashboard HTML: HTTP ${res.status}`)
  }
  const html = await res.text()
  const match = html.match(TOKEN_RE)
  if (!match) {
    throw new Error('Could not extract session token from dashboard HTML')
  }
  return match[1]
}

function getToken(): Promise<string> {
  if (!tokenPromise) {
    tokenPromise = fetchToken().catch((err) => {
      tokenPromise = null // allow retry on next call
      throw err
    })
  }
  return tokenPromise
}

function invalidateToken() {
  tokenPromise = null
}

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getToken()
  const headers = new Headers(init.headers)
  headers.set(TOKEN_HEADER, token)
  let res = await fetch(path, { ...init, headers })

  // If token expired (admin server restarted), clear cache and retry once.
  if (res.status === 401) {
    invalidateToken()
    const newToken = await getToken()
    headers.set(TOKEN_HEADER, newToken)
    res = await fetch(path, { ...init, headers })
  }
  return res
}

async function adminJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await adminFetch(path, init)
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Admin API ${path} → HTTP ${res.status}: ${body.slice(0, 200)}`)
  }
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Domain types & calls
// ---------------------------------------------------------------------------

export interface Skill {
  name: string
  description: string
  category: string
  enabled: boolean
}

export async function getSkills(): Promise<Skill[]> {
  return adminJson<Skill[]>('/api/skills')
}

export async function toggleSkill(name: string, enabled: boolean): Promise<void> {
  await adminJson<unknown>('/api/skills/toggle', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, enabled }),
  })
}

export interface SessionSummary {
  id: string
  source: string
  user_id: string | null
  model: string
  model_config?: string
  system_prompt?: string
  created_at?: number
  message_count?: number
  last_message_at?: number
  [key: string]: unknown
}

export async function getSessions(): Promise<SessionSummary[]> {
  const data = await adminJson<{ sessions: SessionSummary[] }>('/api/sessions')
  return data.sessions ?? []
}

export interface LogsResponse {
  file: string
  lines: string[]
}

export async function getLogs(limit = 100, file?: string): Promise<LogsResponse> {
  const qs = new URLSearchParams({ limit: String(limit) })
  if (file) qs.set('file', file)
  return adminJson<LogsResponse>(`/api/logs?${qs}`)
}
