import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Globe, Check, Database, ArrowRight } from 'lucide-react'
import { Card, Button } from '../ui'
import { analyzeSite, saveCompany } from '../api'
import { useApp } from '../state'

const ICP_FIELDS = [
  ['industry', 'Industry'], ['company_size', 'Company size'], ['stage', 'Stage'],
  ['geography', 'Geography'], ['signals', 'Buying signals'], ['anti_signals', 'Anti-signals'],
]

export default function Setup() {
  const { refreshCompany } = useApp()
  const [url, setUrl] = useState('')
  const [profile, setProfile] = useState(null)
  const [icp, setIcp] = useState({})
  const [analyzing, setAnalyzing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const analyze = async () => {
    if (!url.trim()) return
    setAnalyzing(true); setError(''); setSaved(false)
    try {
      const p = await analyzeSite(url.trim())
      setProfile(p); setIcp(p.icp || {})
      refreshCompany()
    } catch (e) {
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

  const lifted = analyzing || !!profile

  return (
    <div>
      <div style={{ paddingTop: lifted ? '0px' : '20vh', transition: 'padding-top .7s cubic-bezier(.16,1,.3,1)' }}>
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-medium leading-tight sm:text-5xl">Meet the companies that need what you sell.</h1>
        <p className="mt-3 text-muted">Real prospects. Real research. A first email for each.</p>
        {saved && <span className="mt-3 inline-block rounded-full bg-success/10 px-3 py-1 text-xs text-success">● Profile saved</span>}
      </div>

      <div className="mx-auto mt-6 max-w-xl text-center">
        <label className="search-label">
          <Globe size={17} className="search-left-icon" />
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && analyze()}
            placeholder="Paste your company's url"
            style={{ paddingRight: '128px' }}
          />
          <button type="button" className="kbd-btn" onClick={analyze} disabled={analyzing}
            style={analyzing ? { minWidth: 92, justifyContent: 'center' } : undefined}>
            {analyzing
              ? <span className="loader-matrix" />
              : <>Analyze <span className="opacity-60">↵</span></>}
          </button>
        </label>
        {error && <div className="mt-3 text-xs text-danger">Could not analyze: {error}</div>}
        {profile && !error && (
          <div className="mt-3 flex items-center gap-2 text-xs text-muted">
            <Check size={13} className="text-success" /> Analyzed {profile.source_url} · {profile._pages_fetched ?? ''} pages reviewed · Edit the ICP below before your next run.
          </div>
        )}
        {!profile && !analyzing && (
          <div className="mt-3 text-xs text-muted">Try any real B2B site, e.g. stripe.com, vercel.com, notion.so.</div>
        )}
      </div>
      </div>

      {analyzing && (
        <div className="rocket mx-auto mt-12 max-w-3xl" style={{ height: 220 }}>
          <div className="loader">
            <span><span /><span /><span /><span /></span>
            <div className="base"><span /><div className="face" /></div>
          </div>
          <div className="longfazers"><span /><span /><span /><span /></div>
          <div className="clouds">
            <div className="cloud cloud1" /><div className="cloud cloud2" /><div className="cloud cloud3" />
            <div className="cloud cloud4" /><div className="cloud cloud5" />
          </div>
          <p className="absolute inset-x-0 bottom-2 text-center text-xs text-muted">Analyzing the site…</p>
        </div>
      )}

      {profile && !analyzing && (
        <div className="fade-up">
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
            <Link to="/new"><Button>Create a new run <ArrowRight size={16} /></Button></Link>
          </div>
        </div>
      )}
    </div>
  )
}
