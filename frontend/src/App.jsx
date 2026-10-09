import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider } from './state'
import Shell from './components/Shell'
import Landing from './pages/Landing'
import Setup from './pages/Setup'
import NewRun from './pages/NewRun'
import LiveRun from './pages/LiveRun'
import Prospects from './pages/Prospects'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route element={<Shell />}>
            <Route path="/setup" element={<Setup />} />
            <Route path="/new" element={<NewRun />} />
            <Route path="/live" element={<LiveRun />} />
            <Route path="/live/:runId" element={<LiveRun />} />
            <Route path="/prospects" element={<Prospects />} />
            <Route path="/prospects/:runId" element={<Prospects />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}
