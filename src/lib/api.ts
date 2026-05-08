const API_BASE = '/v1'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
}

export interface UsageStats {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ChatResponse {
  id: string
  choices: Array<{
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage?: UsageStats
}

export async function* streamChat(
  sessionId: string,
  messages: ChatMessage[],
  model: string = 'MiniMax-M2.7-highspeed'
): AsyncGenerator<{ content: string; done: boolean; usage?: UsageStats }> {
  const url = `${API_BASE}/chat/completions`
  console.log('[streamChat] URL:', url)
  console.log('[streamChat] Origin:', window.location.origin)

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
    }),
  })

  console.log('[streamChat] Response status:', response.status)
  console.log('[streamChat] Response headers:', [...response.headers.entries()])

  if (!response.ok) {
    const error = await response.text()
    console.error('Chat API error:', response.status, error)
    throw new Error(`Chat API error: ${response.status} — ${error}`)
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') {
          yield { content: '', done: true }
          return
        }

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content ?? ''
          if (content) {
            yield { content, done: false }
          }
        } catch {
          // skip malformed JSON
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function getSkills(): Promise<string[]> {
  // Skills are listed in the Hermes skills directory
  // For now, return a placeholder - will be replaced with actual API call
  return [
    'travel-expenses',
    'obsidian',
    'telegram',
    'discord',
    'linear',
    'github',
    'web-search',
    'browser',
  ]
}

export async function getUpdates(limit: number = 100): Promise<UpdateEntry[]> {
  // Placeholder for updates/audit log
  // Will be connected to Hermes session history
  return []
}

export interface UpdateEntry {
  id: string
  timestamp: string
  action: string
  details: string
}
