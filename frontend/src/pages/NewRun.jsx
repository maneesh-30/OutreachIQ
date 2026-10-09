import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Play, Database, Search, Shield, Building2, ShieldCheck } from 'lucide-react'
import { Card, Button } from '../ui'
import { getPool, startRun } from '../api'
import { useApp } from '../state'

const AGENTS = [
  ['Researcher', 'Collect company facts and buying signals.'],
  ['Fit Scorer', 'Evaluate each company against your ICP.'],
  ['Pain Mapper', 'Connect their challenges to your value.'],
  ['Hook Finder', 'Find a timely, relevant reason to reach out.'],
  ['Email Drafter', 'Write a concise email with source citations.'],
]
const PER = 0.3

export default function NewRun() {
  const nav = useNavigate()
  const { setLastRunId, company } = useApp()
  const [topN, setTopN] = useState(3)
  const [poolSize, setPoolSize] = useState(24)
  const [source, setSource] = useState('pool')
  const [scope, setScope] = useState('both')
  const [busy, setBusy] = useState(false)

  useEffect(() => { getPool().then((p) => setPoolSize(p.length)).catch(() => {}) }, [])

  const start = async () => {
    setBusy(true)
    try {
      const { run_id } = await startRun(topN, source, scope)
      setLastRunId(run_id)
      nav(`/live/${run_id}`)
    } catch (e) {
      setBusy(false)
      alert('Failed to start run: ' + e.message)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Start with the right prospects</h1>
      <p className="mt-1 text-muted">Choose your source and batch size. Your agents handle research and outreach.</p>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_340px] gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-medium">Configure your run</h2>

          <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-surface2 px-4 py-3">
            <div className="flex items-center gap-3">
              <Building2 size={18} className="text-muted" />
              <div>
                <div className="font-medium">{company}</div>
                <div className="text-xs text-muted">B2B SaaS · 50–200 employees · Series A–B</div>
              </div>
            </div>
            <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs text-success">Profile ready</span>
          </div>

          <div className="mt-6 text-sm text-muted">How many prospects</div>
          <input
            type="number" min={1} max={poolSize} value={topN}
            onChange={(e) => setTopN(Math.max(1, Math.min(poolSize, Number(e.target.value) || 1)))}
            className="mt-2 w-full rounded-lg border border-border bg-[#0d1014] px-4 py-3 text-2xl font-semibold outline-none focus:border-accent"
          />
          <div className="mt-2 text-xs text-muted">Choose 1–{poolSize} prospects per run. Start small to review quality.</div>

          <div className="mt-6 text-sm text-muted">Prospect source</div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button onClick={() => setSource('pool')}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition ${source === 'pool' ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted hover:border-gray-500'}`}>
              <Database size={16} /> Seed pool
            </button>
            <button onClick={() => setSource('live')}
              className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition ${source === 'live' ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted hover:border-gray-500'}`}>
              <Search size={16} /> Live search
            </button>
          </div>
          <div className="mt-2 text-xs text-muted">
            {source === 'pool'
              ? 'Seed pool: 24 curated companies scored against your ICP.'
              : 'Live search: finds real companies on the web via Apify (slower, ~1 min).'}
          </div>

          {source === 'live' && (
            <>
              <div className="mt-6 text-sm text-muted">Geographic scope</div>
              <div className="mt-2 grid grid-cols-3 gap-3">
                {[['both', 'Local + Global'], ['local', 'Local only'], ['international', 'International']].map(([v, label]) => (
                  <button key={v} onClick={() => setScope(v)}
                    className={`rounded-lg border px-3 py-2.5 text-sm font-medium transition ${scope === v ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted hover:border-gray-500'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-xs text-muted">
                {scope === 'both' ? 'Finds companies in your country first, then expands internationally.'
                  : scope === 'local' ? 'Only companies in your company\'s country.'
                  : 'Companies worldwide, no country bias.'}
              </div>
            </>
          )}

          <div className="mt-5 flex items-center justify-between text-sm">
            <span className="text-muted">Available pool <span className="font-semibold text-white">{poolSize} companies</span></span>
            <span className="text-muted">Estimated cost <span className="font-semibold text-white">${(topN * PER).toFixed(2)}</span></span>
          </div>

          <Button onClick={start} disabled={busy} className="mt-4 w-full py-3.5 text-base">
            <Play size={18} /> {busy ? 'Starting…' : `Start Run · ${topN} prospects`}
          </Button>
          <div className="mt-3 text-center text-xs text-muted">
            Estimates based on ~${PER.toFixed(2)}/prospect. Actual spend is metered live.
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="p-6">
            <h3 className="text-base font-medium">From company to conversation</h3>
            <p className="mt-1 text-xs text-muted">Five specialized agents. One grounded, personalized email per prospect.</p>
            <div className="mt-4 flex flex-col gap-4">
              {AGENTS.map(([name, desc]) => (
                <div key={name}>
                  <div className="text-sm font-medium">{name}</div>
                  <div className="text-xs text-muted">{desc}</div>
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-2 text-base font-medium"><ShieldCheck size={18} className="text-success" /> You stay in control</div>
            <p className="mt-2 text-xs text-muted">Emails are drafts, never automatically sent. Review and copy them from Prospects.</p>
          </Card>
        </div>
      </div>
    </div>
  )
}
