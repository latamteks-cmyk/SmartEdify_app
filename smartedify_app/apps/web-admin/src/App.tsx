import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { Tenants } from './pages/Tenants'
import { Reservations } from './pages/Reservations'
import { Finance } from './pages/Finance'
import { Compliance } from './pages/Compliance'
import { ServiceStatus } from './pages/ServiceStatus'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tenants" element={<Tenants />} />
        <Route path="/reservations" element={<Reservations />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/status" element={<ServiceStatus />} />
      </Routes>
    </Layout>
  )
}

export default App