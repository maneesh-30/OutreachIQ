const J = (r) => {
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

export const getPool = () => fetch('/api/pool').then(J)
export const listRuns = () => fetch('/api/runs').then(J)
export const getRun = (id) => fetch(`/api/runs/${id}`).then(J)
export const startRun = (top_n, source = 'pool', scope = 'both') =>
  fetch('/api/runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ top_n, source, scope }),
  }).then(J)

export const analyzeSite = (url) =>
  fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  }).then(async (r) => {
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || `HTTP ${r.status}`)
    return r.json()
  })

export const getCompany = () => fetch('/api/company').then(J)
export const saveCompany = (profile) =>
  fetch('/api/company', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
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
