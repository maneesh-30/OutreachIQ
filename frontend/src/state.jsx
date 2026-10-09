import { createContext, useContext, useEffect, useState } from 'react'
import { getCompany } from './api'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [lastRunId, setLastRunId] = useState(() => {
    const v = localStorage.getItem('lastRunId')
    return v ? Number(v) : null
  })
  const [spend, setSpend] = useState(0)
  const [company, setCompany] = useState('OutreachIQ')

  useEffect(() => {
    if (lastRunId != null) localStorage.setItem('lastRunId', String(lastRunId))
  }, [lastRunId])

  const refreshCompany = () =>
    getCompany().then((c) => { if (c && c.company_name) setCompany(c.company_name) }).catch(() => {})

  useEffect(() => { refreshCompany() }, [])

  const value = { lastRunId, setLastRunId, spend, setSpend, company, setCompany, refreshCompany }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
