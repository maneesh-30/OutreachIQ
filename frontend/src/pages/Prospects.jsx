import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Copy, Lightbulb, Mail, FileText, Download, ExternalLink, Loader2, Send, Check } from 'lucide-react'
import { Card, Button, RegionChip } from '../ui'
import { getRun, listRuns, sendEmail } from '../api'
import { useApp } from '../state'

const scoreColor = (v) => (v >= 85 ? 'text-success' : v >= 65 ? 'text-warn' : 'text-muted')

export default function Prospects() {
  const { runId } = useParams()
  const { lastRunId } = useApp()
  const [id, setId] = useState(runId ? Number(runId) : lastRunId)
  const [run, setRun] = useState(null)
  const [sel, setSel] = useState(0)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (id == null) {
      listRuns().then((r) => (r[0] ? setId(r[0].id) : setNotFound(true))).catch(() => setNotFound(true))
      return
    }
    getRun(id).then((d) => { setRun(d); setNotFound(false) }).catch(() => {
      // stale id (e.g. deleted run): fall back to the latest run, else empty
      listRuns().then((r) => (r[0] ? setId(r[0].id) : setNotFound(true))).catch(() => setNotFound(true))
    })
  }, [id])

  if (notFound || id == null) return <Empty />
  if (!run) return <div className="grid min-h-[300px] place-items-center text-muted"><Loader2 className="animate-spin" /></div>
  if (run.prospects.length === 0) return <Empty />

  const p = run.prospects[Math.min(sel, run.prospects.length - 1)]
  const facts = p.facts || {}
  const pains = p.pains || {}
  const email = p.email

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Prospects</h1>
          <p className="mt-1 text-muted">Explore the research. Review the fit. Make every first touch count.</p>
        </div>
        <Button variant="ghost"><Download size={16} /> Export CSV</Button>
      </div>

      <div className="mt-6 grid grid-cols-[300px_minmax(0,1fr)] gap-6">
        {/* list */}
        <Card className="h-max p-3">
          <div className="flex items-center justify-between px-2 py-1.5 text-sm">
            <span className="text-muted">Run #{run.id}</span>
            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">{run.prospects.length} prospects</span>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {run.prospects.map((pr, i) => (
              <button key={pr.id} onClick={() => setSel(i)}
                className={`rounded-lg border px-3 py-3 text-left transition ${i === sel ? 'border-accent bg-accent/5' : 'border-border hover:border-gray-600'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium">{pr.name}</span>
                  <span className={`text-lg font-semibold ${scoreColor(pr.fit_score ?? pr.discovery_score)}`}>{pr.fit_score ?? pr.discovery_score}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted">{pr.domain || '—'}</div>
                {(pr.country || pr.region) && <div className="mt-1.5"><RegionChip region={pr.region} country={pr.country} /></div>}
                <div className="mt-1.5 text-xs">
                  {pr.status === 'done'
                    ? <span className="text-success">● Draft ready</span>
                    : <span className="text-warn">● {pr.status}</span>}
                </div>
              </button>
            ))}
          </div>
        </Card>

        {/* detail */}
        <div className="min-w-0 space-y-5">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 text-xl font-semibold">{p.name}
                  {p.domain && <a href={`https://${p.domain}`} target="_blank" rel="noreferrer" className="text-sm font-normal text-accent inline-flex items-center gap-0.5">{p.domain}<ExternalLink size={12} /></a>}
                </div>
                <div className="mt-2 flex items-center gap-3 text-sm">
                  <span className={`font-semibold ${scoreColor(p.fit_score)}`}>Fit {p.fit_score ?? '—'} / 100</span>
                  <span className="text-muted">Signal {p.discovery_score} / 100</span>
                  <RegionChip region={p.region} country={p.country} />
                  <span className="text-muted">Run #{run.id}</span>
                </div>
              </div>
              {p.status === 'done' && <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs text-success">● Draft ready</span>}
            </div>
            {p.fit_reason && <p className="mt-3 text-sm text-gray-300">{p.fit_reason}</p>}
          </Card>

          <div className="grid grid-cols-2 gap-5">
            <Card className="p-6">
              <h3 className="text-base font-medium">Research</h3>
              <Field label="Industry" value={facts.industry} />
              <Field label="Size & stage" value={facts.size_estimate} />
              <Field label="What they do" value={facts.what_they_do} />
              {Array.isArray(facts.growth_signals) && facts.growth_signals.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs text-muted">Buying signals</div>
                  <ul className="mt-1 space-y-1 text-sm">
                    {facts.growth_signals.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-medium">Pain points</h3>
              <ul className="mt-3 space-y-3">
                {(pains.pains || []).map((pain, i) => (
                  <li key={i} className="text-sm text-gray-200">{pain}</li>
                ))}
              </ul>
              {pains.proof_case_study && (
                <div className="mt-4 rounded-lg border border-border bg-surface2 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-success">Proof · Case study</div>
                  <div className="mt-1 text-sm text-gray-300">{pains.proof_case_study}</div>
                </div>
              )}
            </Card>
          </div>

          {p.hook && (
            <Card className="border-accent/40 bg-accent/5 p-5">
              <div className="flex items-center gap-2 text-sm font-medium text-accent"><Lightbulb size={16} /> Hook</div>
              <p className="mt-2 text-sm text-gray-200">{p.hook}</p>
            </Card>
          )}

          {email && <EmailBlock key={email.id} email={email} prospect={p} />}
        </div>
      </div>
    </div>
  )
}

function EmailBlock({ email, prospect }) {
  const guess = prospect.domain ? `contact@${prospect.domain}` : ''
  const [recipient, setRecipient] = useState(email.recipient || guess)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(!!email.sent)
  const [err, setErr] = useState('')

  const send = async () => {
    if (!recipient.trim()) { setErr('Enter a recipient email'); return }
    setSending(true); setErr('')
    try { await sendEmail(email.id, recipient.trim()); setSent(true) }
    catch (e) { setErr(String(e.message || e)) }
    finally { setSending(false) }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Mail size={16} className="text-accent" /> Email
          <span className={`text-xs font-normal ${sent ? 'text-success' : 'text-muted'}`}>{sent ? '· Sent' : '· Draft'}</span>
        </div>
        <Button variant="ghost" onClick={() => navigator.clipboard.writeText(`${email.subject}\n\n${email.body}`)}><Copy size={15} /> Copy</Button>
      </div>
      <div className="mt-4 font-semibold">Subject: {email.subject}</div>
      <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-gray-200">{email.body}</div>

      {email.sources?.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-muted">
          <FileText size={14} /> Citations
          {email.sources.map((s) => (
            <span key={s} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">{s}</span>
          ))}
        </div>
      )}

      {/* send row */}
      <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4">
        <input value={recipient} onChange={(e) => setRecipient(e.target.value)}
          placeholder="recipient@company.com" disabled={sent}
          className="flex-1 rounded-lg border border-white/10 bg-[#0d1014] px-3 py-2 text-sm outline-none focus:border-white/30 disabled:opacity-60" />
        {sent
          ? <span className="flex items-center gap-1.5 text-sm text-success"><Check size={15} /> Sent to {recipient}</span>
          : <Button onClick={send} disabled={sending}><Send size={15} /> {sending ? 'Sending…' : 'Send'}</Button>}
      </div>
      {err && <div className="mt-2 text-xs text-danger">{err}</div>}
    </Card>
  )
}

function Field({ label, value }) {
  if (!value) return null
  return (
    <div className="mt-3">
      <div className="text-xs text-muted">{label}</div>
      <div className="text-sm text-gray-200">{value}</div>
    </div>
  )
}

function Empty() {
  return (
    <div className="grid h-full place-items-center text-center">
      <div>
        <p className="text-muted">No prospects yet.</p>
        <Link to="/new" className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white">Start a run</Link>
      </div>
    </div>
  )
}
