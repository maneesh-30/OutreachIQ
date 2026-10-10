import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { SlidersHorizontal, Plus, Activity, Users, LineChart, Zap } from 'lucide-react'
import { useApp } from '../state'
import { listRuns } from '../api'
import FloatingDock from './FloatingDock'

const NAV = [
  { to: '/setup', title: 'Setup', icon: SlidersHorizontal },
  { to: '/new', title: 'New Run', icon: Plus },
  { to: '/live', title: 'Live Run', icon: Activity, dot: true },
  { to: '/prospects', title: 'Prospects', icon: Users },
  { to: '/dashboard', title: 'Dashboard', icon: LineChart },
]

export default function Shell() {
  const { spend, setSpend, company } = useApp()
  const loc = useLocation()
  const nav = useNavigate()

  useEffect(() => {
    listRuns().then((runs) => setSpend(runs.reduce((a, r) => a + (r.cost_total || 0), 0))).catch(() => {})
  }, [loc.pathname, setSpend])

  const items = NAV.map((n) => ({
    title: n.title, icon: n.icon, dot: n.dot,
    active: loc.pathname.startsWith(n.to),
    onClick: () => nav(n.to),
  }))

  return (
    <div className="relative flex h-full flex-col">
      {/* minimal top bar */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-white/10 text-white"><Zap size={15} /></span>
          <span className="text-[15px] font-semibold tracking-tight">OutreachIQ</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {company && <span className="text-muted">{company}</span>}
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="text-muted">Spend</span> <span className="font-semibold">${spend.toFixed(2)}</span>
          </span>
        </div>
      </header>

      {/* content */}
      <main className="mx-auto w-[min(1100px,94vw)] flex-1 overflow-auto pb-28">
        <Outlet />
      </main>

      {/* floating dock */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center">
        <div className="pointer-events-auto">
          <FloatingDock items={items} />
        </div>
      </div>
    </div>
  )
}
