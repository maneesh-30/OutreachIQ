import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, ScanLine, DollarSign, Activity, Calendar } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { Card, StatTile, StatusChip, SourceBadge } from '../ui'
import { listRuns, getRun } from '../api'

export default function Dashboard({ onOpenRun }) {
  const nav = useNavigate()
  const openRun = (id) => (onOpenRun ? onOpenRun(id) : nav(id != null ? `/prospects/${id}` : '/prospects'))
  const [runs, setRuns] = useState([])
  const [details, setDetails] = useState([])

  useEffect(() => {
    listRuns().then(async (rs) => {
      setRuns(rs)
      const ds = await Promise.all(rs.map((r) => getRun(r.id).catch(() => null)))
      setDetails(ds.filter(Boolean))
    }).catch(() => {})
  }, [])

  const prospects = details.flatMap((d) => d.prospects)
  const fits = prospects.map((p) => p.fit_score).filter((v) => v != null)
  const avgFit = fits.length ? Math.round(fits.reduce((a, b) => a + b, 0) / fits.length) : 0
  const azure = details.reduce((a, d) => a + (d.cost?.azure || 0), 0)
  const groq = details.reduce((a, d) => a + (d.cost?.groq || 0), 0)
  const totalSpend = azure + groq
  const doneProspects = prospects.filter((p) => p.status === 'done').length
  const avgPer = doneProspects ? totalSpend / doneProspects : 0

  const pie = [
    { name: 'Azure', value: azure, color: '#5b8cff' },
    { name: 'Groq', value: Math.max(groq, 0.0001), color: '#3dd68c' },
  ]
  const pctAzure = totalSpend ? (azure / totalSpend) * 100 : 0

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Workspace overview</h1>
          <p className="mt-1 text-muted">A clear view of prospect quality, agent activity and every dollar spent.</p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted"><Calendar size={15} /> All time</button>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4">
        <StatTile icon={Users} label="Total prospects" value={prospects.length} sub={`${doneProspects} with drafts`} />
        <StatTile icon={ScanLine} label="Avg fit" value={`${avgFit} / 100`} sub={`Across ${fits.length} scored`} />
        <StatTile icon={DollarSign} label="Avg $/prospect" value={`$${avgPer.toFixed(3)}`} sub="Completed drafts" />
        <StatTile icon={Activity} label="Total runs" value={runs.length} sub={`${runs.filter((r) => r.status === 'done').length} done`} />
      </div>

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)_380px] gap-6">
        <Card className="p-6">
          <h3 className="text-base font-medium">Cost split</h3>
          <div className="mt-4 flex items-center gap-8">
            <div className="relative h-44 w-44">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={pie} dataKey="value" innerRadius={62} outerRadius={82} startAngle={90} endAngle={-270} stroke="none">
                    {pie.map((e) => <Cell key={e.name} fill={e.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="text-2xl font-semibold">${totalSpend.toFixed(2)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-muted">Total spend</div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <Legend color="#5b8cff" label="Azure" value={`$${azure.toFixed(3)}`} pct={pctAzure} />
              <Legend color="#3dd68c" label="Groq" value={`$${groq.toFixed(3)}`} pct={100 - pctAzure} />
              <p className="text-xs text-muted">Azure carries research and generation; Groq handles bulk extraction (near-free).</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-base font-medium">Ready for your next conversation</h3>
          <div className="mt-3 text-4xl font-semibold">{doneProspects}</div>
          <div className="mt-1 text-sm text-muted">Emails ready to review</div>
          <button onClick={() => openRun()} className="mt-4 text-sm text-accent hover:underline">Review prospects →</button>
        </Card>
      </div>

      <Card className="mt-6 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4">
          <h3 className="text-base font-medium">Runs</h3>
          <span className="text-xs text-muted">{runs.length} runs · ${totalSpend.toFixed(2)} total</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-border text-left text-xs text-muted">
              <th className="px-6 py-3 font-medium">Run#</th>
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">#prospects</th>
              <th className="px-6 py-3 font-medium">Source</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Cost</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id} onClick={() => openRun(r.id)}
                className="cursor-pointer border-b border-border/60 hover:bg-white/5">
                <td className="px-6 py-3.5 text-accent">#{String(r.id).padStart(3, '0')}</td>
                <td className="px-6 py-3.5 text-muted">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-6 py-3.5">{r.top_n}</td>
                <td className="px-6 py-3.5"><SourceBadge source={r.source} /></td>
                <td className="px-6 py-3.5"><StatusChip status={r.status === 'done' ? 'done' : r.status === 'error' ? 'error' : 'running'} /></td>
                <td className="px-6 py-3.5">${(r.cost_total || 0).toFixed(3)}</td>
              </tr>
            ))}
            {runs.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-muted">No runs yet.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

function Legend({ color, label, value, pct }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-sm"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />{label}</span>
      <span className="text-sm"><span className="font-semibold">{value}</span> <span className="text-muted">{pct.toFixed(1)}%</span></span>
    </div>
  )
}
