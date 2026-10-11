import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Minus, Plus, Search, ScanLine, Target, Lightbulb, Mail, ChevronRight } from 'lucide-react'
import { Button } from '../ui'
import { startRun } from '../api'
import { useApp } from '../state'

const SCOPES = [
  ['both', 'Nearby + Global', 'Companies in your country first, then worldwide.'],
  ['local', 'Nearby', "Only companies in your company's country."],
  ['international', 'Worldwide', 'Companies anywhere, no country bias.'],
]

const FLOW = [
  { name: 'Research', icon: Search },
  { name: 'Fit score', icon: ScanLine },
  { name: 'Pain map', icon: Target },
  { name: 'Hook', icon: Lightbulb },
  { name: 'Email', icon: Mail },
]

export default function NewRun({ onStarted }) {
  const nav = useNavigate()
  const { setLastRunId, company } = useApp()
  const [topN, setTopN] = useState(3)
  const [scope, setScope] = useState('both')
  const [busy, setBusy] = useState(false)

  const clamp = (n) => Math.max(1, Math.min(20, n))

  const start = async () => {
    setBusy(true)
    try {
      const { run_id } = await startRun(topN, 'live', scope)
      setLastRunId(run_id)
      if (onStarted) onStarted(run_id)
      else nav(`/live/${run_id}`)
    } catch (e) {
      setBusy(false)
      alert('Failed to start run: ' + e.message)
    }
  }

  return (
    <div className="mx-auto mt-6 max-w-xl">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Start a run</h1>
        <p className="mt-1 text-muted">Find real companies that match your profile and draft a grounded email for each.</p>
      </div>

      {/* launch panel */}
      <div className="mt-7 rounded-2xl border border-white/10 bg-surface p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 text-sm">
          <span className="text-muted">Selling as</span>
          <span className="font-medium">{company || '—'}</span>
        </div>

        <div className="mt-5">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted">How many prospects</div>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center rounded-full border border-white/10 bg-white/5">
              <button onClick={() => setTopN((n) => clamp(n - 1))} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-white"><Minus size={15} /></button>
              <span className="w-10 text-center text-lg font-semibold tabular-nums">{topN}</span>
              <button onClick={() => setTopN((n) => clamp(n + 1))} className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-white"><Plus size={15} /></button>
            </div>
            <span className="text-xs text-muted">1–20 · start small to review quality</span>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Where to look</div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {SCOPES.map(([v, label]) => (
              <button key={v} onClick={() => setScope(v)}
                className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                  scope === v ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-muted hover:border-white/25'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="mt-2 text-xs text-muted">{SCOPES.find((s) => s[0] === scope)[2]}</div>
        </div>

        <Button onClick={start} disabled={busy} className="mt-6 w-full py-3 text-base">
          <Play size={16} /> {busy ? 'Starting…' : `Start run · ${topN} prospects`}
        </Button>
        <div className="mt-2 text-center text-xs text-muted">Drafts only — never auto-sent.</div>
      </div>

      {/* agent flow */}
      <div className="mt-10">
        <div className="text-center text-[11px] font-medium uppercase tracking-wider text-muted">What runs for each company</div>
        <div className="mt-5 flex items-center justify-center gap-1.5">
          {FLOW.map(({ name, icon: Icon }, i) => (
            <div key={name} className="flex items-center gap-1.5">
              <div className="flex flex-col items-center gap-2">
                <div className="grid h-11 w-11 place-items-center rounded-full border border-white/10 bg-white/5 text-gray-200"><Icon size={17} /></div>
                <span className="text-[11px] text-muted">{name}</span>
              </div>
              {i < FLOW.length - 1 && <ChevronRight size={16} className="mb-5 text-white/20" />}
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-xs text-muted">Five agents research the company and write a personalized email with citations.</p>
      </div>
    </div>
  )
}
