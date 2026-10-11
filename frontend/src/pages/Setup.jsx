import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Globe, Check, Database, ArrowRight, FileText, Upload, Mail } from 'lucide-react'
import { Button } from '../ui'
import { analyzeSite, getCompany, saveCompany, uploadDocs, getGmailStatus, connectGmail, disconnectGmail } from '../api'
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
  const [docs, setDocs] = useState([])
  const [uploading, setUploading] = useState(false)
  const [gmail, setGmail] = useState({ connected: false, configured: false })
  const [searchParams, setSearchParams] = useSearchParams()

  const refreshGmail = () => getGmailStatus().then(setGmail).catch(() => {})
  useEffect(() => { refreshGmail() }, [])
  useEffect(() => {
    if (searchParams.get('gmail')) {
      refreshGmail()
      searchParams.delete('gmail'); setSearchParams(searchParams, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connectG = async () => {
    try { const { url } = await connectGmail(); window.location.href = url }
    catch (e) { alert('Gmail connect unavailable: ' + e.message) }
  }
  const disconnectG = async () => { await disconnectGmail(); refreshGmail() }

  // show the active company's brief (persists across navigation); leave the bar empty
  useEffect(() => {
    getCompany().then((c) => {
      if (c && c.company_name) { setProfile(c); setIcp(c.icp || {}); setDocs(c.docs || []) }
    }).catch(() => {})
  }, [])

  const onDocs = async (e) => {
    const files = e.target.files
    if (!files?.length) return
    setUploading(true)
    try {
      const res = await uploadDocs(files)
      setDocs(res.docs || [])
    } catch (err) {
      alert('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const analyze = async () => {
    if (!url.trim()) return
    setAnalyzing(true); setError(''); setSaved(false)
    try {
      const p = await analyzeSite(url.trim())
      setProfile(p); setIcp(p.icp || {}); setDocs([])
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
        <div className="fade-up mx-auto mt-12 max-w-3xl text-left">
          {/* company header */}
          <div className="flex items-end justify-between border-b border-white/10 pb-4">
            <div>
              <div className="text-2xl font-semibold">{profile.company_name}</div>
              <div className="mt-1 text-sm text-muted">
                {profile.source_url}{profile.country ? ` · ${profile.country}` : ''}
              </div>
            </div>
            <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-muted">AI-extracted</span>
          </div>

          {/* what you sell */}
          <section className="mt-9">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">What you sell</div>
            <p className="mt-2 text-lg leading-relaxed text-gray-200">{profile.what_you_sell}</p>
          </section>

          {/* value props */}
          <section className="mt-10">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Value props</div>
            <div className="mt-4 grid grid-cols-3 gap-x-8 gap-y-6">
              {(profile.value_props || []).map((v, i) => (
                <div key={i} className="border-t border-white/10 pt-3">
                  <div className="text-sm font-medium">{v.title}</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{v.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ICP */}
          <section className="mt-10">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Ideal customer profile</div>
              <span className="text-xs text-muted">Editable · used by all 5 agents</span>
            </div>
            <div className="mt-4 divide-y divide-white/10 border-y border-white/10">
              {ICP_FIELDS.map(([k, label]) => (
                <div key={k} className="flex items-center gap-4 py-2.5">
                  <div className="w-40 shrink-0 text-sm text-muted">{label}</div>
                  <input value={icp[k] || ''} onChange={(e) => setIcp({ ...icp, [k]: e.target.value })}
                    className="flex-1 bg-transparent text-sm text-gray-200 outline-none placeholder:text-muted" />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" onClick={save}>Save profile</Button>
            </div>
          </section>

          {/* your documents */}
          <section className="mt-10">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Your documents</div>
              <label className={`flex cursor-pointer items-center gap-1.5 text-xs text-accent hover:underline ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
                <Upload size={13} /> {uploading ? 'Uploading…' : 'Upload docs'}
                <input type="file" multiple accept=".pdf,.txt,.md,.docx" className="hidden" onChange={onDocs} />
              </label>
            </div>
            <p className="mt-2 text-xs text-muted">Add case studies, decks or product docs to ground emails in proof your website doesn't show. PDF, TXT, MD, DOCX.</p>
            {docs.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {docs.map((d, i) => (
                  <span key={i} className="flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-200">
                    <FileText size={12} className="text-muted" /> {d}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* sending */}
          <section className="mt-10">
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted">Sending</div>
            <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-muted" />
                <div>
                  {gmail.connected
                    ? <><div className="text-sm font-medium">Gmail connected</div><div className="text-xs text-muted">Emails send from {gmail.email || 'your account'}</div></>
                    : <><div className="text-sm font-medium">Connect Gmail to send</div><div className="text-xs text-muted">Emails send from your own Google account. Drafts until you send.</div></>}
                </div>
              </div>
              {gmail.connected
                ? <Button variant="ghost" onClick={disconnectG}>Disconnect</Button>
                : <Button onClick={connectG} disabled={!gmail.configured} title={gmail.configured ? '' : 'Set GOOGLE_CLIENT_ID/SECRET'}>Connect Gmail</Button>}
            </div>
            {!gmail.configured && !gmail.connected && (
              <div className="mt-2 text-xs text-muted">Gmail OAuth not configured yet (needs GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).</div>
            )}
          </section>

          {/* footer: KB + run */}
          <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-5">
            <div className="flex items-center gap-2 text-sm text-muted">
              <Database size={16} /> Knowledge base ready · grounds every email
            </div>
            <Link to="/new"><Button>Create a new run <ArrowRight size={16} /></Button></Link>
          </div>
        </div>
      )}
    </div>
  )
}
