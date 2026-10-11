import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Minus, Plus, Search, ScanLine, Target, Lightbulb, Mail } from 'lucide-react'
import { Button } from '../ui'
import { startRun } from '../api'
import { useApp } from '../state'

const SCOPES = [
  ['both', 'Nearby + Global', 'Companies in your country first, then worldwide.'],
  ['local', 'Nearby', "Only companies in your company's country."],
  ['international', 'Worldwide', 'Companies anywhere, no country bias.'],
]

const FLOW = [
  { name: 'Research', desc: 'Gather company facts & buying signals', icon: Search },
  { name: 'Fit score', desc: 'Match the company against your ICP', icon: ScanLine },
  { name: 'Pain map', desc: 'Pin the problems you solve', icon: Target },
  { name: 'Hook', desc: 'Find a timely reason to reach out', icon: Lightbulb },
  { name: 'Email', desc: 'Write a grounded, personalized draft', icon: Mail },
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
    <div className="mt-6">
      <h1 className="text-2xl font-semibold">Start a run</h1>
      <p className="mt-1 text-muted">Find real companies that match your profile and draft a grounded email for each.</p>

      <div className="mt-7 grid grid-cols-[minmax(0,1fr)_320px] items-start gap-10">
        {/* left: launch panel */}
        <div className="rounded-2xl border border-white/10 bg-surface p-6 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
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

        {/* right: vertical animated flow */}
        <div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted">What runs for each company</div>
          <div className="relative mt-5 pl-1">
            {/* track + animated dot */}
            <div className="absolute left-[14px] top-3 bottom-3 w-px bg-white/10" />
            <div className="flow-dot absolute left-[10px] h-2 w-2 rounded-full bg-white" />
            {FLOW.map(({ name, desc, icon: Icon }) => (
              <div key={name} className="relative flex items-start gap-3 py-3">
                <div className="z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/15 bg-surface text-gray-200"><Icon size={14} /></div>
                <div className="pt-0.5">
                  <div className="text-sm font-medium">{name}</div>
                  <div className="text-xs leading-snug text-muted">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
