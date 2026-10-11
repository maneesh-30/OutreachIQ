import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Users, ScanLine, Activity, Plus, ArrowRight } from 'lucide-react'
import { StatTile, StatusChip, Button, RegionChip } from '../ui'
import { listRuns, getRun } from '../api'

const scoreColor = (v) => (v >= 85 ? 'text-success' : v >= 65 ? 'text-warn' : 'text-muted')

export default function Dashboard() {
  const nav = useNavigate()
  const [runs, setRuns] = useState([])
  const [details, setDetails] = useState([])

  useEffect(() => {
    listRuns().then(async (rs) => {
      setRuns(rs)
      const ds = await Promise.all(rs.map((r) => getRun(r.id).catch(() => null)))
      setDetails(ds.filter(Boolean))
    }).catch(() => {})
  }, [])

  // flatten prospects with their run id
  const prospects = details.flatMap((d) => d.prospects.map((p) => ({ ...p, runId: d.id })))
  const emailsReady = prospects.filter((p) => p.email).length
  const fits = prospects.map((p) => p.fit_score).filter((v) => v != null)
  const avgFit = fits.length ? Math.round(fits.reduce((a, b) => a + b, 0) / fits.length) : 0
  const countByRun = Object.fromEntries(details.map((d) => [d.id, d.prospects.length]))
  const companyByRun = Object.fromEntries(runs.map((r) => [r.id, r.company]))

  const topProspects = [...prospects]
    .filter((p) => p.fit_score != null)
    .sort((a, b) => b.fit_score - a.fit_score)
    .slice(0, 6)

  const empty = runs.length === 0

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workspace</h1>
          <p className="mt-1 text-muted">Your prospects and ready-to-send emails.</p>
        </div>
        <Button onClick={() => nav('/new')}><Plus size={16} /> Start a run</Button>
      </div>

      {empty ? (
        <div className="mt-16 grid place-items-center text-center">
          <div>
            <p className="text-muted">No runs yet.</p>
            <Button onClick={() => nav('/setup')} className="mt-3">Set up your company <ArrowRight size={16} /></Button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-4 gap-4">
            <StatTile icon={Mail} label="Emails ready to review" value={emailsReady} sub="drafts, never auto-sent" />
            <StatTile icon={Users} label="Prospects found" value={prospects.length} sub={`${fits.length} scored`} />
            <StatTile icon={ScanLine} label="Avg fit" value={`${avgFit} / 100`} sub="across scored prospects" />
            <StatTile icon={Activity} label="Runs" value={runs.length} sub={`${runs.filter((r) => r.status === 'done').length} done`} />
          </div>

          {/* top prospects */}
          <section className="mt-10">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted">Top prospects</div>
            <div className="divide-y divide-white/10 border-y border-white/10">
              {topProspects.map((p) => (
                <button key={`${p.runId}-${p.id}`} onClick={() => nav(`/prospects/${p.runId}`)}
                  className="flex w-full items-center gap-4 py-3.5 text-left hover:bg-white/[0.03]">
                  <div className="w-56 shrink-0">
                    <div className="truncate font-medium">{p.name}</div>
                    <div className="flex items-center gap-2 truncate text-xs text-muted">{p.domain || '—'}<RegionChip region={p.region} country={p.country} /></div>
                  </div>
                  <div className={`w-12 text-center text-lg font-semibold ${scoreColor(p.fit_score)}`}>{p.fit_score}</div>
                  <div className="w-40 shrink-0 truncate text-xs text-muted">
                    {companyByRun[p.runId] ? <>for <span className="text-gray-300">{companyByRun[p.runId]}</span></> : `Run #${p.runId}`}
                  </div>
                  <div className="flex-1 truncate text-sm text-muted">{p.fit_reason}</div>
                  <span className="shrink-0 text-xs text-accent">
                    {p.email ? 'View email' : p.status === 'done' ? 'View' : 'In progress'} →
                  </span>
                </button>
              ))}
              {topProspects.length === 0 && <div className="py-8 text-center text-sm text-muted">No scored prospects yet.</div>}
            </div>
          </section>

          {/* recent runs */}
          <section className="mt-10">
            <div className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted">Recent runs</div>
            <div className="divide-y divide-white/10 border-y border-white/10">
              {runs.map((r) => (
                <button key={r.id} onClick={() => nav(`/prospects/${r.id}`)}
                  className="flex w-full items-center gap-4 py-3 text-left text-sm hover:bg-white/[0.03]">
                  <span className="w-16 shrink-0 text-accent">#{String(r.id).padStart(3, '0')}</span>
                  <span className="w-48 shrink-0 text-muted">{new Date(r.created_at).toLocaleString()}</span>
                  <span className="flex-1 text-muted">{countByRun[r.id] ?? r.top_n} companies</span>
                  <StatusChip status={r.status === 'done' ? 'done' : r.status === 'error' ? 'error' : 'running'} />
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
