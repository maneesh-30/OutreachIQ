import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useApp } from '../state'
import { listRuns } from '../api'

const NAV = [
  { to: '/setup', label: 'Setup' },
  { to: '/new', label: 'New Run' },
  { to: '/live', label: 'Live Run', dot: true },
  { to: '/prospects', label: 'Prospects' },
  { to: '/dashboard', label: 'Dashboard' },
]

function BrandMark() {
  return (
    <svg width="30" height="30" viewBox="0 0 34 34" aria-hidden>
      <circle cx="17" cy="17" r="17" fill="#9C86CE" />
      <circle cx="17" cy="17" r="8.6" fill="#FFFFFF" />
      <circle cx="17" cy="17" r="3.7" fill="#151519" />
    </svg>
  )
}

export default function Shell() {
  const { spend, setSpend, company } = useApp()
  const loc = useLocation()

  useEffect(() => {
    listRuns().then((runs) => setSpend(runs.reduce((a, r) => a + (r.cost_total || 0), 0))).catch(() => {})
  }, [loc.pathname, setSpend])

  return (
    <div className="relative flex h-full flex-col">
      {/* animated backdrop */}
      <div className="aurora"><div className="blob3" /><div className="veil" /></div>

      {/* top navbar */}
      <header className="relative z-10 mx-auto mt-4 flex w-[min(1340px,94vw)] items-center justify-between rounded-2xl glass px-5 py-3">
        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-[17px] font-medium tracking-tight">OutreachIQ</span>
        </div>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {NAV.map(({ to, label, dot }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `relative rounded-lg px-3.5 py-2 text-sm transition ${isActive ? 'bg-white/10 text-white' : 'text-muted hover:text-white'}`}>
              {label}
              {dot && <span className="absolute right-1 top-1.5 h-1.5 w-1.5 rounded-full bg-warn animate-pulse-dot" />}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm sm:flex">
            <span className="grid h-5 w-5 place-items-center rounded bg-brand/25 text-[10px] font-semibold text-brand">{company[0]}</span>
            <span className="font-medium">{company}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
            <span className="text-muted">Spend</span>
            <span className="font-semibold">${spend.toFixed(2)}</span>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-muted hover:text-white">
            <Bell size={16} />
          </button>
        </div>
      </header>

      {/* content */}
      <main className="relative z-10 mx-auto w-[min(1340px,94vw)] flex-1 overflow-auto py-7">
        <Outlet />
      </main>
    </div>
  )
}
