import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import {
  SlidersHorizontal, Plus, Activity, Users, LineChart, Bell, Zap, Database,
} from 'lucide-react'
import { useApp } from '../state'
import { listRuns } from '../api'

const NAV = [
  { to: '/setup', label: 'Setup', icon: SlidersHorizontal },
  { to: '/new', label: 'New Run', icon: Plus },
  { to: '/live', label: 'Live Run', icon: Activity, dot: true },
  { to: '/prospects', label: 'Prospects', icon: Users },
  { to: '/dashboard', label: 'Dashboard', icon: LineChart },
]

const TITLES = {
  '/setup': 'Setup', '/new': 'New Run', '/live': 'Live Run',
  '/prospects': 'Prospects', '/dashboard': 'Dashboard',
}

export default function Shell() {
  const { spend, setSpend, company } = useApp()
  const loc = useLocation()
  const title = Object.entries(TITLES).find(([p]) => loc.pathname.startsWith(p))?.[1] || ''

  useEffect(() => {
    listRuns().then((runs) => {
      setSpend(runs.reduce((a, r) => a + (r.cost_total || 0), 0))
    }).catch(() => {})
  }, [loc.pathname, setSpend])

  return (
    <div className="flex h-full">
      {/* sidebar */}
      <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-[#0d1014] px-3 py-5">
        <div className="flex items-center gap-2 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/20 text-accent">
            <Zap size={18} />
          </div>
          <span className="text-[15px] font-semibold">OutreachIQ</span>
        </div>

        <div className="mt-7 px-2 text-[10px] font-medium uppercase tracking-wider text-muted">
          Workspace
        </div>
        <nav className="mt-2 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, dot }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  isActive ? 'bg-white text-black' : 'text-gray-300 hover:bg-white/5'
                }`
              }
            >
              <Icon size={17} />
              <span>{label}</span>
              {dot && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-warn animate-pulse-dot" />}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-3">
          <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
            <div className="flex items-center gap-2 text-xs text-success">
              <Database size={13} /> Knowledge ready
            </div>
            <div className="mt-1 text-[11px] text-muted">4 docs · 128 chunks</div>
          </div>
          <div className="flex items-center gap-2 px-1">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-accent/20 text-xs font-semibold text-accent">JL</div>
            <div className="leading-tight">
              <div className="text-sm">Jamie Lee</div>
              <div className="text-[11px] text-muted">Workspace owner</div>
            </div>
          </div>
        </div>
      </aside>

      {/* main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border px-6 py-3.5">
          <div className="flex items-center gap-2 text-sm">
            <span className="grid h-6 w-6 place-items-center rounded bg-accent/20 text-[11px] font-semibold text-accent">
              {company[0]}
            </span>
            <span className="font-medium">{company}</span>
            <span className="text-muted">/</span>
            <span className="text-muted">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm">
              <span className="text-muted">Spend</span>
              <span className="font-semibold">${spend.toFixed(2)}</span>
            </div>
            <button className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface text-muted hover:text-white">
              <Bell size={16} />
            </button>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto px-8 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
