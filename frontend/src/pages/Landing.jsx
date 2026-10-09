import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Paperclip, ArrowUp, Globe, Search, Mail } from 'lucide-react'

const VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_124724_bc041163-d651-425f-aea3-2acc1efc2c96.mp4'

function BrandMark({ size = 30 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden>
      <circle cx="17" cy="17" r="17" fill="#9C86CE" />
      <circle cx="17" cy="17" r="8.6" fill="#FFFFFF" />
      <circle cx="17" cy="17" r="3.7" fill="#151519" />
    </svg>
  )
}

const CHIPS = [
  { icon: Globe, label: 'Analyze site' },
  { icon: Search, label: 'Find prospects' },
  { icon: Mail, label: 'Draft emails' },
]

export default function Landing() {
  const nav = useNavigate()
  const [url, setUrl] = useState('')

  const go = () => {
    const u = url.trim()
    nav(u ? `/setup?url=${encodeURIComponent(u)}` : '/setup')
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0d12]">
      <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline src={VIDEO} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/25 to-black/55" />

      <div className="relative z-10 flex h-full flex-col px-8 py-6">
        {/* nav */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-lg font-medium tracking-tight drop-shadow">OutreachIQ</span>
          </div>
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 text-[15px] text-white/90 md:flex">
            <a href="#" className="transition hover:opacity-70">Features</a>
            <a href="#" className="transition hover:opacity-70">How it works</a>
            <a href="#" className="transition hover:opacity-70">Pricing</a>
            <a href="#" className="transition hover:opacity-70">Docs</a>
          </nav>
          <button onClick={() => nav('/dashboard')}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-white"
            style={{ background: 'linear-gradient(180deg,#3d3d3f,#1d1d20)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.1), 0 2px 14px rgba(0,0,0,.28)' }}>
            Open app
          </button>
        </header>

        {/* hero */}
        <main className="flex flex-1 flex-col items-center justify-center gap-8">
          <h1 className="text-center text-4xl font-medium tracking-tight text-white drop-shadow-lg sm:text-5xl">
            Paste your site. Meet your customers.
          </h1>

          {/* glass composer */}
          <form onSubmit={(e) => { e.preventDefault(); go() }}
            className="w-[min(708px,92vw)] rounded-[26px] p-5"
            style={{ background: 'rgba(41,41,43,.955)', backdropFilter: 'blur(26px) saturate(112%)', boxShadow: 'inset 0 0 0 1px rgba(214,228,255,.14), 0 22px 60px rgba(0,0,0,.30)' }}>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste your company website — stripe.com, notion.so, razorpay.com…"
              className="w-full bg-transparent px-1 py-2 text-[15px] text-white placeholder:text-[#8B8C8E] outline-none"
            />
            <div className="mt-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {CHIPS.map(({ icon: Icon, label }) => (
                  <span key={label} className="inline-flex items-center gap-1.5 rounded-[9px] border border-white/5 px-3 py-1.5 text-xs font-medium text-[#909093]"
                    style={{ background: 'linear-gradient(180deg,rgba(255,255,255,.088),rgba(255,255,255,.038))' }}>
                    <Icon size={13} /> {label}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <span className="hidden text-xs text-[#98999C] sm:inline">Azure + Groq</span>
                <Paperclip size={18} className="text-[#A9AAAD]" />
                <button type="submit" aria-label="Analyze"
                  className="grid h-9 w-9 place-items-center rounded-full transition active:scale-95"
                  style={{ background: 'linear-gradient(163deg,#FBBC94,#F49D70 46%,#E88654)', boxShadow: '0 3px 12px rgba(210,110,60,.34)' }}>
                  <ArrowUp size={17} className="text-white" />
                </button>
              </div>
            </div>
          </form>
        </main>

        {/* proof */}
        <footer className="flex flex-col items-center gap-4 pb-2">
          <div className="text-sm font-medium text-white/90 drop-shadow">Built on</div>
          <div className="flex items-center gap-10 text-white/95">
            <span className="text-lg font-semibold tracking-tight">Azure AI Foundry</span>
            <span className="text-lg font-semibold tracking-tight">Groq</span>
            <span className="text-lg font-semibold tracking-tight">Apify</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
