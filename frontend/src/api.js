const J = (r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

export const getPool = () => fetch('/api/pool').then(J)
export const listRuns = () => fetch('/api/runs').then(J)
export const getRun = (id) => fetch(`/api/runs/${id}`).then(J)
export const startRun = (top_n) =>
  fetch('/api/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ top_n }),
  }).then(J)

// SSE live stream. Returns the EventSource so callers can close it.
export const streamRun = (id, onEvent, onEnd) => {
  const es = new EventSource(`/api/runs/${id}/stream`)
  es.onmessage = (e) => {
    try { onEvent(JSON.parse(e.data)) } catch { /* ignore */ }
  }
  es.addEventListener('end', () => { es.close(); onEnd && onEnd() })
  es.onerror = () => { es.close(); onEnd && onEnd() }
  return es
}
