// Shared API helpers: JSON calls, multipart calls, and SSE stream reading.

export async function apiJson(path, body, token) {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || 'Request failed')
  return data
}

export async function apiUpload(path, payload, files, token) {
  const form = new FormData()
  form.append('payload', JSON.stringify(payload))
  for (const file of files || []) form.append('files', file, file.name || 'attachment')
  const res = await fetch(path, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.detail || 'Upload failed')
  }
  return res
}

// Reads an SSE stream of `data: {json}` lines. Calls handlers as events arrive.
// Returns an abort function. onEvent receives {type, ...} objects.
export function readStream(response, { onEvent, onError, onClose }) {
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let cancelled = false

  const pump = async () => {
    try {
      for (;;) {
        const { done, value } = await reader.read()
        if (done || cancelled) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data:')) continue
          try {
            onEvent?.(JSON.parse(trimmed.slice(5)))
          } catch {
            // Skip malformed frames.
          }
        }
      }
      if (!cancelled) onClose?.()
    } catch (err) {
      if (!cancelled) onError?.(err)
    }
  }
  pump()

  return () => {
    cancelled = true
    reader.cancel().catch(() => {})
  }
}

// Convenience wrapper: POST JSON to a streaming endpoint, funnel text chunks.
// handlers: { onChunk(text), onStage(event), onDone(event), onError(message) }
export async function streamJson(path, body, handlers, token) {
  let res
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  } catch {
    handlers.onError?.('Could not reach the server. Is the backend running?')
    return () => {}
  }
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    handlers.onError?.(data.detail || `Request failed (${res.status})`)
    return () => {}
  }
  return dispatchStream(res, handlers)
}

export async function streamUpload(path, payload, files, handlers, token) {
  let res
  try {
    res = await apiUpload(path, payload, files, token)
  } catch (err) {
    handlers.onError?.(err.message)
    return () => {}
  }
  return dispatchStream(res, handlers)
}

function dispatchStream(res, handlers) {
  return readStream(res, {
    onEvent: (event) => {
      if (event.type === 'chunk') handlers.onChunk?.(event.text)
      else if (event.type === 'stage') handlers.onStage?.(event)
      else if (event.type === 'done') handlers.onDone?.(event)
      else if (event.type === 'error') handlers.onError?.(event.message)
    },
    onError: () => handlers.onError?.('The connection dropped mid-response.'),
    onClose: () => handlers.onClose?.(),
  })
}
