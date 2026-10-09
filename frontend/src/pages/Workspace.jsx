import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { useApp } from '../state'
import { listRuns } from '../api'
import Setup from './Setup'
import NewRun from './NewRun'
import LiveRun from './LiveRun'
import Prospects from './Prospects'
import Dashboard from './Dashboard'

const VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_124724_bc041163-d651-425f-aea3-2acc1efc2c96.mp4'

const SECTIONS = [
  { id: 'setup', label: 'Setup' },
  { id: 'run', label: 'New Run' },
  { id: 'live', label: 'Live Run' },
  { id: 'results', label: 'Prospects' },
  { id: 'dashboard', label: 'Dashboard' },
]

function BrandMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden>
      <circle cx="17" cy="17" r="17" fill="#9C86CE" />
      <circle cx="17" cy="17" r="8.6" fill="#FFFFFF" />
      <circle cx="17" cy="17" r="3.7" fill="#151519" />
    </svg>
  )
}

export default function Workspace() {
  const { spend, setSpend, company } = useApp()
  const [activeRunId, setActiveRunId] = useState(null)
  const scroller = useRef(null)

  const refreshSpend = () =>
    listRuns().then((r) => setSpend(r.reduce((a, x) => a + (x.cost_total || 0), 0))).catch(() => {})
  useEffect(() => { refreshSpend() }, [])

  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const onStarted = (id) => { setActiveRunId(id); setTimeout(() => scrollTo('live'), 60) }
  const onOpenRun = (id) => { if (id != null) setActiveRunId(id); setTimeout(() => scrollTo('results'), 60) }

  return (
    <div ref={scroller} className="relative h-full overflow-y-auto">
      {/* fixed video backdrop + scrim */}
      <video className="fixed inset-0 h-full w-full object-cover" autoPlay muted loop playsInline src={VIDEO} />
      <div className="fixed inset-0 bg-gradient-to-b from-black/70 via-black/80 to-black/88" />
      <div className="fixed inset-0 bg-bg/40" />

      {/* sticky top nav */}
      <header className="sticky top-0 z-20 px-4 pt-4">
        <div className="mx-auto flex w-[min(1340px,96vw)] items-center justify-between rounded-2xl glass px-5 py-3">
          <button onClick={() => scrollTo('setup')} className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-[17px] font-medium tracking-tight">OutreachIQ</span>
          </button>
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
            {SECTIONS.map((s) => (
              <button key={s.id} onClick={() => scrollTo(s.id)}
                className="rounded-lg px-3.5 py-2 text-sm text-muted transition hover:bg-white/10 hover:text-white">
                {s.label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm sm:flex">
              <span className="grid h-5 w-5 place-items-center rounded bg-brand/25 text-[10px] font-semibold text-brand">{company[0]}</span>
              <span className="font-medium">{company}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
              <span className="text-muted">Spend</span><span className="font-semibold">${spend.toFixed(2)}</span>
            </div>
            <button className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-muted hover:text-white"><Bell size={16} /></button>
          </div>
        </div>
      </header>

      {/* stacked sections */}
      <div className="relative z-10 mx-auto w-[min(1340px,96vw)] space-y-16 py-12">
        <section id="setup" className="scroll-mt-24"><Setup onProceed={() => scrollTo('run')} /></section>
        <section id="run" className="scroll-mt-24"><NewRun onStarted={onStarted} /></section>
        <section id="live" className="scroll-mt-24"><LiveRun runId={activeRunId} /></section>
        <section id="results" className="scroll-mt-24"><Prospects runId={activeRunId} /></section>
        <section id="dashboard" className="scroll-mt-24"><Dashboard onOpenRun={onOpenRun} /></section>
      </div>
    </div>
  )
}
