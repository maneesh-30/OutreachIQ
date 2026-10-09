import { createContext, useContext, useEffect, useState } from 'react'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [lastRunId, setLastRunId] = useState(() => {
    const v = localStorage.getItem('lastRunId')
    return v ? Number(v) : null
  })
  const [spend, setSpend] = useState(0)

  useEffect(() => {
    if (lastRunId != null) localStorage.setItem('lastRunId', String(lastRunId))
  }, [lastRunId])

  const value = { lastRunId, setLastRunId, spend, setSpend, company: 'RelayOps' }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
