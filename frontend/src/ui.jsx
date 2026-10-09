import { Check, Loader2 } from 'lucide-react'

export function Card({ className = '', children, ...p }) {
  return (
    <div className={`glass rounded-xl ${className}`} {...p}>
      {children}
    </div>
  )
}

export function Button({ variant = 'primary', className = '', children, ...p }) {
  const styles = {
    primary: 'btn-grad font-semibold',
    ghost: 'bg-white/5 border border-white/10 text-gray-200 hover:bg-white/10',
    subtle: 'bg-transparent border border-white/10 text-gray-300 hover:bg-white/5',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${styles[variant]} ${className}`}
      {...p}
    >
      {children}
    </button>
  )
}

const STATUS = {
  pending: { dot: 'bg-muted', text: 'text-muted', bg: 'bg-white/5', label: 'Pending' },
  running: { dot: 'bg-warn animate-pulse-dot', text: 'text-warn', bg: 'bg-warn/10', label: 'Running' },
  done: { dot: 'bg-success', text: 'text-success', bg: 'bg-success/10', label: 'Done' },
  error: { dot: 'bg-danger', text: 'text-danger', bg: 'bg-danger/10', label: 'Error' },
}

export function StatusChip({ status = 'pending', label }) {
  const s = STATUS[status] || STATUS.pending
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${s.bg} ${s.text}`}>
      {status === 'done' ? <Check size={12} /> : <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />}
      {label || s.label}
    </span>
  )
}

export function ScoreBadge({ value, label = 'FIT / 100' }) {
  const color = value >= 85 ? 'text-success' : value >= 65 ? 'text-warn' : 'text-muted'
  return (
    <div className="text-right leading-none">
      <div className={`text-3xl font-semibold ${color}`}>{value ?? '—'}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  )
}

export function StatTile({ icon: Icon, label, value, sub }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <span className="text-xs text-muted">{label}</span>
        {Icon && <Icon size={16} className="text-muted" />}
      </div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      {sub && <div className="mt-2 text-xs text-muted">{sub}</div>}
    </Card>
  )
}

export function SourceBadge({ source }) {
  const map = {
    live: { t: 'Live web', c: 'bg-success/10 text-success' },
    pool: { t: 'Seed pool', c: 'bg-white/5 text-muted' },
    'live→pool': { t: 'Live → pool fallback', c: 'bg-warn/10 text-warn' },
  }
  const s = map[source] || map.pool
  return <span className={`rounded-full px-2 py-0.5 text-xs ${s.c}`}>{s.t}</span>
}

export function RegionChip({ region, country }) {
  if (!region && !country) return null
  const local = region === 'local'
  const label = country || (local ? 'Local' : 'International')
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] ${local ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'}`}>
      {label}{region ? ` · ${local ? 'Local' : 'Intl'}` : ''}
    </span>
  )
}

export function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="animate-spin text-accent" />
}

export function RunningBar() {
  return <div className="running-bar relative mt-3 h-0.5 w-full overflow-hidden rounded bg-white/5" />
}
