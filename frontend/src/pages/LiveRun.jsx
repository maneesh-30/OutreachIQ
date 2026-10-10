import { useEffect, useRef, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { Search, ScanLine, Target, Lightbulb, Mail, Pause, CheckCircle2 } from 'lucide-react'
import { Card, StatusChip, ScoreBadge, RunningBar, SourceBadge, RegionChip } from '../ui'
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
  const [status, setStatus] = useState('running')
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
    }).catch(() => {})

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

  if (!id) {
    return (
      <div className="grid h-full place-items-center text-center">
        <div>
          <p className="text-muted">No active run.</p>
          <Link to="/new" className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">Start a run</Link>
        </div>
      </div>
    )
  }

  const allStatuses = Object.values(steps).flatMap((m) => AGENTS.map((a) => m[a.key]?.status || 'pending'))
  const done = allStatuses.filter((s) => s === 'done').length
  const running = allStatuses.filter((s) => s === 'running').length
  const pending = allStatuses.filter((s) => s === 'pending').length
  const total = prospects.length * AGENTS.length || allStatuses.length
  const mmss = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`

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

      {/* summary strip */}
      <Card className="mt-5 flex items-center justify-between px-5 py-3.5">
        <div className="text-sm font-medium">{done} of {total} agents complete</div>
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-success">{done} done</span>
          <span className="rounded-full bg-warn/10 px-2.5 py-1 text-warn">{running} running</span>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-muted">{pending} pending</span>
          <span className="ml-2 text-muted">Elapsed {mmss}</span>
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_300px] gap-6">
        <div className="min-w-0">
          {/* discovery */}
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">Discovery</h2>
            {prospects.length > 0 && <span className="flex items-center gap-1 text-xs text-success"><CheckCircle2 size={13} /> {prospects.length} companies matched</span>}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {prospects.map((p) => (
              <Card key={p.name} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="truncate text-xs text-muted">{p.domain || '—'}</div>
                    <div className="mt-1"><RegionChip region={p.region} country={p.country} /></div>
                  </div>
                  <ScoreBadge value={p.score} />
                </div>
                <div className="mt-3 line-clamp-2 text-xs text-muted">{p.reason}</div>
              </Card>
            ))}
            {prospects.length === 0 && <div className="col-span-3 py-8 text-center text-sm text-muted">Discovering prospects…</div>}
          </div>

          {/* pipelines */}
          {prospects.map((p) => {
            const m = steps[p.name] || {}
            const pdone = AGENTS.filter((a) => m[a.key]?.status === 'done').length
            return (
              <div key={p.name} className="mt-7">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm"><span className="font-medium">{p.name}</span> <span className="text-muted">· {pdone}/{AGENTS.length} complete</span></h3>
                  <Link to={`/prospects/${id}`} className="text-xs text-accent hover:underline">View prospect →</Link>
                </div>
                <div className="grid grid-cols-5 gap-3">
                  {AGENTS.map(({ key, name, icon: Icon }) => {
                    const st = m[key]?.status || 'pending'
                    const pv = st === 'done' ? preview(key, m[key]?.out) : WAIT[key]
                    return (
                      <Card key={key} className={`p-3.5 ${st === 'running' ? 'border-warn/60' : ''}`}>
                        <div className="flex items-center gap-2 text-sm"><Icon size={15} className="text-muted" /><span className="font-medium">{name}</span></div>
                        <div className="mt-2"><StatusChip status={st} /></div>
                        <div className="mt-2 line-clamp-2 text-xs text-muted">{pv}</div>
                        {st === 'running' && <RunningBar />}
                      </Card>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* right rail */}
        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <div className="text-sm font-medium">Activity</div>
            <div className="mt-3 space-y-3">
              {activity.length === 0 && <div className="text-xs text-muted">Waiting for agent activity…</div>}
              {activity.map((a, i) => (
                <div key={i} className="text-xs">
                  <div className="text-muted">{a.t}</div>
                  <div><span className="font-medium">{a.p}</span> <span className="text-muted">{a.msg}</span></div>
                </div>
              ))}
            </div>
          </Card>

          {status !== 'running' && (
            <Link to={`/prospects/${id}`} className="rounded-lg bg-accent px-4 py-2.5 text-center text-sm font-medium text-white">Review prospects →</Link>
          )}
        </div>
      </div>
    </div>
  )
}
