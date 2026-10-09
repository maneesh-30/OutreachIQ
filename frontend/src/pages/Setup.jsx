import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Globe, Sparkles, Check, Database, ArrowRight, Loader2, FileText } from 'lucide-react'
import { Card, Button } from '../ui'
import { analyzeSite, getCompany, saveCompany } from '../api'
import { useApp } from '../state'

const ICP_FIELDS = [
  ['industry', 'Industry'], ['company_size', 'Company size'], ['stage', 'Stage'],
  ['geography', 'Geography'], ['signals', 'Buying signals'], ['anti_signals', 'Anti-signals'],
]

const STAGES = [
  { label: 'Fetching website', icon: Globe },
  { label: 'Reading key pages', icon: FileText },
  { label: 'Extracting company profile', icon: Sparkles },
  { label: 'Building knowledge base', icon: Database },
]

export default function Setup({ onProceed }) {
  const { refreshCompany } = useApp()
  const [searchParams] = useSearchParams()
  const [url, setUrl] = useState('')
  const autoRan = useRef(false)
  const [profile, setProfile] = useState(null)
  const [icp, setIcp] = useState({})
  const [analyzing, setAnalyzing] = useState(false)
  const [stepIdx, setStepIdx] = useState(-1)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const timers = useRef([])

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }
  useEffect(() => clearTimers, [])

  useEffect(() => {
    if (searchParams.get('url')) return // arriving from landing -> auto-analyze instead
    getCompany().then((c) => {
      if (c && c.company_name) { setProfile(c); setIcp(c.icp || {}); setUrl(c.source_url || '') }
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const analyze = async (urlArg) => {
    const target = (typeof urlArg === 'string' ? urlArg : url).trim()
    if (!target) return
    setUrl(target)
    setAnalyzing(true); setError(''); setSaved(false)
    setStepIdx(0)
    // advance through the real stages on estimated timing; hold on the last until done
    timers.current = [
      setTimeout(() => setStepIdx(1), 3500),
      setTimeout(() => setStepIdx(2), 7000),
      setTimeout(() => setStepIdx(3), 13000),
    ]
    try {
      const p = await analyzeSite(target)
      clearTimers()
      setStepIdx(STAGES.length) // all done
      setProfile(p); setIcp(p.icp || {})
      refreshCompany()
      setTimeout(() => setStepIdx(-1), 600)
    } catch (e) {
      clearTimers()
      setStepIdx(-1)
      setError(String(e.message || e))
    } finally {
      setAnalyzing(false)
    }
  }

  const save = async () => {
    await saveCompany({ ...profile, icp })
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  // auto-analyze when arriving from the landing page with ?url=
  useEffect(() => {
    const u = searchParams.get('url')
    if (u && !autoRan.current) { autoRan.current = true; analyze(u) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Teach your agents what you sell</h1>
          <p className="mt-1 text-muted">Paste your company website. Agents study it to match prospects and write grounded emails.</p>
        </div>
        {saved && <span className="rounded-full bg-success/10 px-3 py-1 text-xs text-success">● Profile saved</span>}
      </div>

      <Card className="mt-6 p-6">
        <div className="text-sm font-medium">Company website</div>
        <div className="mt-3 flex gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-[#0d1014] px-3">
            <Globe size={16} className="text-muted" />
            <input value={url} onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && analyze()}
              placeholder="https://yourcompany.com"
              className="w-full bg-transparent py-3 text-sm outline-none" />
          </div>
          <Button onClick={analyze} disabled={analyzing}>
            {analyzing ? <><Loader2 size={16} className="animate-spin" /> Analyzing…</> : <><Sparkles size={16} /> Analyze</>}
          </Button>
        </div>
        {error && <div className="mt-3 text-xs text-danger">Could not analyze: {error}</div>}
        {profile && !error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted">
            <Check size={13} className="text-success" /> Analyzed {profile.source_url} · {profile._pages_fetched ?? ''} pages reviewed · Edit the ICP below before your next run.
          </div>
        )}
        {!profile && !analyzing && (
          <div className="mt-3 text-xs text-muted">Try any real B2B site, e.g. stripe.com, vercel.com, notion.so.</div>
        )}
      </Card>

      {stepIdx >= 0 && (
        <Card className="mt-6 p-6">
          <div className="text-sm font-medium">Analyzing {url}</div>
          <div className="mt-4 space-y-3">
            {STAGES.map((st, i) => {
              const done = i < stepIdx
              const running = i === stepIdx
              const Icon = st.icon
              return (
                <div key={st.label} className="flex items-center gap-3">
                  <span className={`grid h-7 w-7 place-items-center rounded-lg ${done ? 'bg-success/15 text-success' : running ? 'bg-warn/15 text-warn' : 'bg-white/5 text-muted'}`}>
                    {done ? <Check size={15} /> : running ? <Loader2 size={15} className="animate-spin" /> : <Icon size={15} />}
                  </span>
                  <span className={`text-sm ${done ? 'text-gray-200' : running ? 'text-white' : 'text-muted'}`}>{st.label}</span>
                  {done && <span className="ml-auto text-xs text-success">done</span>}
                  {running && <span className="ml-auto text-xs text-warn">working…</span>}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {profile && (
        <>
          <div className="mt-6 grid grid-cols-3 gap-5">
            <Card className="p-6">
              <h3 className="text-base font-medium">What you sell</h3>
              <span className="mt-2 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">AI-extracted</span>
              <p className="mt-3 text-sm leading-relaxed text-gray-300">{profile.what_you_sell}</p>
            </Card>

            <Card className="p-6">
              <h3 className="text-base font-medium">Value props</h3>
              <div className="mt-3 space-y-4">
                {(profile.value_props || []).map((v, i) => (
                  <div key={i}>
                    <div className="flex items-center gap-2 text-sm font-medium"><Check size={14} className="text-success" /> {v.title}</div>
                    <p className="mt-1 text-sm text-muted">{v.desc}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium">ICP</h3>
                <span className="text-xs text-muted">Editable</span>
              </div>
              <div className="mt-4 space-y-3">
                {ICP_FIELDS.map(([k, label]) => (
                  <div key={k}>
                    <div className="text-xs text-muted">{label}</div>
                    <input value={icp[k] || ''} onChange={(e) => setIcp({ ...icp, [k]: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-border bg-[#0d1014] px-3 py-2.5 text-sm outline-none focus:border-accent" />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs text-muted">Used by all 5 agents</span>
                <Button onClick={save}>Save</Button>
              </div>
            </Card>
          </div>

          <Card className="mt-6 flex items-center justify-between p-5">
            <div className="flex items-center gap-3">
              <Database size={20} className="text-accent" />
              <div>
                <div className="font-medium">Knowledge base</div>
                <div className="text-xs text-muted">Rebuilt from {profile.company_name}'s website · grounds every email</div>
              </div>
            </div>
            <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs text-success">● Ready</span>
          </Card>

          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm text-muted">Profile ready. Your agents can now find matching companies.</span>
            {onProceed
              ? <Button onClick={onProceed}>Create a new run <ArrowRight size={16} /></Button>
              : <Link to="/new"><Button>Create a new run <ArrowRight size={16} /></Button></Link>}
          </div>
        </>
      )}
    </div>
  )
}
