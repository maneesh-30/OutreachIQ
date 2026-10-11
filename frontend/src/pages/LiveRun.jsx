import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Search, ScanLine, Target, Lightbulb, Mail, Pause, CheckCircle2 } from 'lucide-react'
import { Button, SourceBadge, RegionChip } from '../ui'
import { getRun, streamRun } from '../api'
import { useApp } from '../state'

const AGENTS = [
  { key: 'researcher', name: 'Researcher', icon: Search },
  { key: 'fit_scorer', name: 'Fit Scorer', icon: ScanLine },
  { key: 'pain_mapper', name: 'Pain Mapper', icon: Target },
  { key: 'hook_finder', name: 'Hook Finder', icon: Lightbulb },
  { key: 'email_drafter', name: 'Email Drafter', icon: Mail },
]
const WAIT = {
  researcher: 'Waiting for research.', fit_scorer: 'Waiting for fit score.',
  pain_mapper: 'Waiting for pain map.', hook_finder: 'Waiting for outreach hook.',
  email_drafter: 'Waiting for outreach hook.',
}

function preview(agent, out) {
  if (!out) return ''
  try {
    if (agent === 'researcher') return [out.industry, out.size_estimate].filter(Boolean).join(' · ')
    if (agent === 'fit_scorer') return `${out.score}/100. ${(out.reason || '').slice(0, 60)}`
    if (agent === 'pain_mapper') return (out.pains?.[0] || '').slice(0, 70)
    if (agent === 'hook_finder') return typeof out === 'string' ? out.slice(0, 70) : ''
    if (agent === 'email_drafter') return out.subject ? `Subject: ${out.subject}` : ''
  } catch { /* noop */ }
  return ''
}

// derive agent statuses from a persisted prospect (for finished/partial runs)
function deriveStatuses(p) {
  const s = {}
  s.researcher = { status: p.facts ? 'done' : 'pending', out: p.facts }
  s.fit_scorer = { status: p.fit_score != null ? 'done' : 'pending', out: p.fit_score != null ? { score: p.fit_score, reason: p.fit_reason } : null }
  s.pain_mapper = { status: p.pains ? 'done' : 'pending', out: p.pains }
  s.hook_finder = { status: p.hook ? 'done' : 'pending', out: p.hook }
  s.email_drafter = { status: p.email ? 'done' : 'pending', out: p.email }
  return s
}

export default function LiveRun() {
  const { runId } = useParams()
  const { lastRunId } = useApp()
  const nav = useNavigate()
  const id = runId ? Number(runId) : lastRunId

  const [prospects, setProspects] = useState([]) // [{name, score, reason, domain}]
  const [steps, setSteps] = useState({})         // {name: {agent: {status, out}}}
  const [cost, setCost] = useState({ azure: 0, groq: 0, total: 0 })
  const [activity, setActivity] = useState([])
  const [status, setStatus] = useState('loading')
  const [source, setSource] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const startRef = useRef(Date.now())

  useEffect(() => {
    if (!id) return
    let es
    getRun(id).then((run) => {
      setStatus(run.status)
      setSource(run.source)
      setCost(run.cost)
      const ps = run.prospects.map((p) => ({ name: p.name, domain: p.domain, country: p.country, region: p.region, score: p.discovery_score, reason: p.fit_reason }))
      setProspects(ps)
      const st = {}
      run.prospects.forEach((p) => { st[p.name] = deriveStatuses(p) })
      setSteps(st)
      if (run.status === 'running') es = openStream()
    }).catch(() => setStatus('notfound'))

    function openStream() {
      return streamRun(id, (ev) => {
        if (ev.type === 'discovered') {
          if (ev.source_used) setSource(ev.source_used)
          setProspects(ev.prospects.map((p) => ({ name: p.name, domain: p.domain, country: p.country, region: p.region, score: p.score, reason: p.reason })))
          setSteps((prev) => {
            const next = { ...prev }
            ev.prospects.forEach((p) => {
              if (!next[p.name]) next[p.name] = Object.fromEntries(AGENTS.map((a) => [a.key, { status: 'pending' }]))
            })
            return next
          })
        } else if (ev.type === 'step') {
          setSteps((prev) => ({
            ...prev,
            [ev.prospect]: { ...(prev[ev.prospect] || {}), [ev.agent]: { status: ev.status, out: ev.output } },
          }))
          if (ev.status === 'done' && ev.ledger) {
            setCost((c) => {
              const prov = ev.ledger.provider === 'azure' ? 'azure' : 'groq'
              const n = { ...c, [prov]: c[prov] + (ev.ledger.cost || 0) }
              n.total = n.azure + n.groq
              return n
            })
            setActivity((a) => [{ t: new Date().toLocaleTimeString(), p: ev.prospect, msg: `${ev.agent} completed.` }, ...a].slice(0, 8))
          } else if (ev.status === 'running') {
            setActivity((a) => [{ t: new Date().toLocaleTimeString(), p: ev.prospect, msg: `${ev.agent} started.` }, ...a].slice(0, 8))
          }
        } else if (ev.type === 'run_done') {
          setCost({ azure: ev.cost.azure || 0, groq: ev.cost.groq || 0, total: ev.total_cost })
          setStatus('done')
        }
      }, () => setStatus((s) => (s === 'running' ? 'done' : s)))
    }

    return () => { if (es) es.close() }
  }, [id])

  useEffect(() => {
    if (status !== 'running') return
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 1000)
    return () => clearInterval(t)
  }, [status])

  if (!id || status === 'notfound') {
    return (
      <div className="grid min-h-[300px] place-items-center text-center">
        <div>
          <p className="text-muted">No active run.</p>
          <Link to="/new" className="mt-3 inline-block rounded-lg bg-white px-4 py-2 text-sm font-medium text-black">Start a run</Link>
        </div>
      </div>
    )
  }

  const scoreColor = (v) => (v >= 85 ? 'text-success' : v >= 65 ? 'text-warn' : 'text-muted')

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your agents are on it</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">Run #{id} · {prospects.length} prospects {source && <SourceBadge source={source} />}</p>
        </div>
        <div className="flex items-center gap-2">
          {status === 'running'
            ? <span className="flex items-center gap-1.5 rounded-full bg-warn/10 px-3 py-1.5 text-sm text-warn"><span className="h-1.5 w-1.5 rounded-full bg-warn animate-pulse-dot" />Running</span>
            : <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1.5 text-sm text-success"><CheckCircle2 size={14} />Done</span>}
          <button className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-muted"><Pause size={14} /> Pause run</button>
        </div>
      </div>

      {/* matched companies + per-company progress */}
      <div className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-muted">
          {prospects.length ? `${prospects.length} companies matched` : 'Discovering prospects…'}
        </h2>

        <div className="divide-y divide-white/10 border-y border-white/10">
          {prospects.map((p) => {
            const m = steps[p.name] || {}
            const doneCount = AGENTS.filter((a) => m[a.key]?.status === 'done').length
            const runningAgent = AGENTS.find((a) => m[a.key]?.status === 'running')
            const allDone = doneCount === AGENTS.length
            return (
              <div key={p.name} className="flex items-center gap-4 py-4">
                <div className="w-48 shrink-0">
                  <div className="truncate font-medium">{p.name}</div>
                  <div className="flex items-center gap-2 truncate text-xs text-muted">
                    {p.domain || '—'}<RegionChip region={p.region} country={p.country} />
                  </div>
                </div>

                <div className={`w-10 shrink-0 text-center text-lg font-semibold ${scoreColor(p.score)}`}>{p.score}</div>

                {/* 5-segment stepper */}
                <div className="flex flex-1 items-center gap-1.5">
                  {AGENTS.map((a) => {
                    const st = m[a.key]?.status || 'pending'
                    return (
                      <span key={a.key} title={a.name}
                        className={`h-2 flex-1 rounded-full ${st === 'done' ? 'bg-success' : st === 'running' ? 'bg-warn animate-pulse-dot' : 'bg-white/10'}`} />
                    )
                  })}
                </div>

                <div className="w-28 shrink-0 text-right text-xs">
                  {allDone ? <span className="text-success">Email ready</span>
                    : runningAgent ? <span className="text-warn">{runningAgent.name}…</span>
                      : <span className="text-muted">Queued</span>}
                </div>

                <Link to={`/prospects/${id}`} className="shrink-0 text-xs text-accent hover:underline">View →</Link>
              </div>
            )
          })}
          {prospects.length === 0 && <div className="py-12 text-center text-sm text-muted">Finding companies on the web…</div>}
        </div>

        {status !== 'running' && prospects.length > 0 && (
          <div className="mt-6 flex justify-end">
            <Link to={`/prospects/${id}`}><Button>Review prospects →</Button></Link>
          </div>
        )}
      </div>
    </div>
  )
}
