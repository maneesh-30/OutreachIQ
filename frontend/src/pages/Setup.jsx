import { Link } from 'react-router-dom'
import { Globe, Sparkles, Check, Database, RefreshCw, Pencil, ArrowRight, FileText } from 'lucide-react'
import { Card, Button } from '../ui'

const VALUE_PROPS = [
  ['Reduce busywork', 'Automate CRM updates and revenue handoffs across sales, finance and success.'],
  ['Unify customer data', 'Keep CRM, billing and product usage aligned in one reliable customer view.'],
  ['Find expansion signals', 'Turn usage and account changes into timely opportunities for your sales team.'],
]

export default function Setup() {
  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Teach your agents what you sell</h1>
          <p className="mt-1 text-muted">Your company profile and knowledge base power every prospect match and email.</p>
        </div>
        <span className="rounded-full bg-success/10 px-3 py-1 text-xs text-success">● Profile saved</span>
      </div>

      <Card className="mt-6 p-6">
        <div className="text-sm font-medium">Company website</div>
        <div className="mt-3 flex gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-[#0d1014] px-3">
            <Globe size={16} className="text-muted" />
            <input defaultValue="https://relayops.io" className="w-full bg-transparent py-3 text-sm outline-none" />
          </div>
          <Button><Sparkles size={16} /> Analyze</Button>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          <Check size={13} className="text-success" /> Analyzed Oct 9, 2026 · 12 pages reviewed · Edit the profile below before your next run.
        </div>
      </Card>

      <div className="mt-6 grid grid-cols-3 gap-5">
        <div className="space-y-5">
          <Card className="p-6">
            <h3 className="text-base font-medium">What you sell</h3>
            <span className="mt-2 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">AI-extracted</span>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              RelayOps automates revenue operations for growing B2B SaaS teams. It connects CRM,
              billing and product data to eliminate manual handoffs, keep customer records accurate
              and surface expansion opportunities.
            </p>
            <button className="mt-3 flex items-center gap-1.5 text-sm text-accent"><Pencil size={13} /> Edit description</button>
          </Card>
          <Card className="p-6">
            <h3 className="text-base font-medium">Source of truth</h3>
            <p className="mt-2 text-sm text-muted">Website + your uploaded knowledge. Agents cite these sources in their recommendations.</p>
            <button className="mt-3 flex items-center gap-1.5 text-sm text-accent"><FileText size={13} /> View knowledge files →</button>
          </Card>
        </div>

        <Card className="p-6">
          <h3 className="text-base font-medium">Value props</h3>
          <div className="mt-3 space-y-4">
            {VALUE_PROPS.map(([t, d]) => (
              <div key={t}>
                <div className="flex items-center gap-2 text-sm font-medium"><Check size={14} className="text-success" /> {t}</div>
                <p className="mt-1 text-sm text-muted">{d}</p>
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
            <Select label="Industry" value="B2B SaaS" />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Company size" value="50–200 employees" />
              <Select label="Stage" value="Series A–B" />
            </div>
            <Select label="Geography" value="United States & Canada" />
            <Select label="Buying signals" value="RevOps hiring · CRM migration · Funding" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted">Used by all 5 agents</span>
            <Button>Save</Button>
          </div>
        </Card>
      </div>

      <Card className="mt-6 flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <Database size={20} className="text-accent" />
          <div>
            <div className="font-medium">Knowledge base</div>
            <div className="text-xs text-muted">4 docs · 128 chunks · Last indexed 09:42</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-success/10 px-2.5 py-1 text-xs text-success">● Ready</span>
          <Button variant="ghost"><RefreshCw size={15} /> Rebuild</Button>
        </div>
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-sm text-muted">Everything looks good. Your agents are ready to find matching companies.</span>
        <Link to="/new"><Button>Create a new run <ArrowRight size={16} /></Button></Link>
      </div>
    </div>
  )
}

function Select({ label, value }) {
  return (
    <div>
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 flex items-center justify-between rounded-lg border border-border bg-[#0d1014] px-3 py-2.5 text-sm">
        {value}<span className="text-muted">▾</span>
      </div>
    </div>
  )
}
