import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { Bell, Zap } from 'lucide-react'
import { useApp } from '../state'
import { listRuns } from '../api'

const NAV = [
  { to: '/setup', label: 'Setup' },
  { to: '/new', label: 'New Run' },
  { to: '/live', label: 'Live Run', dot: true },
  { to: '/prospects', label: 'Prospects' },
  { to: '/dashboard', label: 'Dashboard' },
]

export default function Shell() {
  const { spend, setSpend, company } = useApp()
  const loc = useLocation()

  useEffect(() => {
    listRuns().then((runs) => setSpend(runs.reduce((a, r) => a + (r.cost_total || 0), 0))).catch(() => {})
  }, [loc.pathname, setSpend])

  return (
    <div className="relative flex h-full flex-col">
      {/* floating glass pill navbar */}
      <header className="sticky top-0 z-20 flex justify-center px-4 pt-4">
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2 py-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          {/* brand */}
          <div className="flex items-center gap-2 px-3">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-white/10 text-white"><Zap size={14} /></span>
            <span className="text-sm font-semibold tracking-tight">OutreachIQ</span>
          </div>
          <span className="mx-1 h-5 w-px bg-white/10" />

          {/* nav */}
          <nav className="flex items-center gap-0.5">
            {NAV.map(({ to, label, dot }) => (
              <NavLink key={to} to={to}
                className={({ isActive }) =>
                  `relative rounded-full px-3.5 py-1.5 text-sm transition ${isActive ? 'bg-white text-black' : 'text-gray-300 hover:bg-white/10'}`}>
                {label}
                {dot && <span className="absolute right-1.5 top-1 h-1.5 w-1.5 rounded-full bg-warn animate-pulse-dot" />}
              </NavLink>
            ))}
          </nav>
          <span className="mx-1 h-5 w-px bg-white/10" />

          {/* right */}
          <div className="flex items-center gap-1 pr-1">
            {company && (
              <span className="hidden rounded-full px-2.5 py-1 text-xs text-muted sm:inline">{company}</span>
            )}
            <span className="rounded-full bg-white/5 px-3 py-1 text-sm"><span className="text-muted">Spend</span> <span className="font-semibold">${spend.toFixed(2)}</span></span>
            <button className="grid h-7 w-7 place-items-center rounded-full text-muted hover:bg-white/10 hover:text-white"><Bell size={15} /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-[min(1200px,94vw)] flex-1 overflow-auto py-8">
        <Outlet />
      </main>
    </div>
  )
}
