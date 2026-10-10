import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Minus, Plus } from 'lucide-react'
import { Button } from '../ui'
import { startRun } from '../api'
import { useApp } from '../state'

const PER = 0.3
const SCOPES = [
  ['both', 'Nearby + Global', "Companies in your country first, then worldwide."],
  ['local', 'Nearby', "Only companies in your company's country."],
  ['international', 'Worldwide', 'Companies anywhere, no country bias.'],
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
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold">Start a run</h1>
      <p className="mt-1 text-muted">
        We find real companies on the web that match your profile, research each, and draft a grounded email.
      </p>

      {/* selling as */}
      <div className="mt-8 flex items-center justify-between border-y border-white/10 py-3 text-sm">
        <span className="text-muted">Selling as</span>
        <span className="font-medium">{company}</span>
      </div>

      {/* prospects */}
      <section className="mt-8">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted">How many prospects</div>
        <div className="mt-3 flex items-center gap-4">
          <div className="flex items-center rounded-full border border-white/10 bg-white/5">
            <button onClick={() => setTopN((n) => clamp(n - 1))}
              className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-white"><Minus size={15} /></button>
            <span className="w-10 text-center text-lg font-semibold tabular-nums">{topN}</span>
            <button onClick={() => setTopN((n) => clamp(n + 1))}
              className="grid h-9 w-9 place-items-center rounded-full text-muted hover:text-white"><Plus size={15} /></button>
          </div>
          <span className="text-xs text-muted">1–20 per run · start small to review quality</span>
        </div>
      </section>

      {/* scope */}
      <section className="mt-8">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Where to look</div>
        <div className="mt-3 grid max-w-md grid-cols-3 gap-2">
          {SCOPES.map(([v, label]) => (
            <button key={v} onClick={() => setScope(v)}
              className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                scope === v ? 'border-white/40 bg-white/10 text-white' : 'border-white/10 text-muted hover:border-white/25'}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="mt-2 text-xs text-muted">{SCOPES.find((s) => s[0] === scope)[2]}</div>
      </section>

      {/* action */}
      <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-5">
        <div className="text-sm text-muted">Est. ~${(topN * PER).toFixed(2)} · drafts only, never auto-sent</div>
        <Button onClick={start} disabled={busy}>
          <Play size={16} /> {busy ? 'Starting…' : 'Start run'}
        </Button>
      </div>

      <p className="mt-4 text-xs text-muted">
        Five agents research each company and write a personalized email with citations.
      </p>
    </div>
  )
}
