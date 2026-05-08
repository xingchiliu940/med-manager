import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/ui/ToastProvider'
import { AppShell } from './components/layout/AppShell'
import { DisclaimerModal } from './components/business/DisclaimerModal'
import { HomePage } from './pages/Home/HomePage'
import { ConsultPage } from './pages/Consult/ConsultPage'
import { PlanPage } from './pages/Plan/PlanPage'
import { PrescriptionPage } from './pages/Prescription/PrescriptionPage'
import { ProfilePage } from './pages/Profile/ProfilePage'
import { useBootstrap } from './hooks/useBootstrap'

function AppRoutes() {
  useBootstrap()
  return (
    <>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="consult" element={<ConsultPage />} />
          <Route path="plan" element={<PlanPage />} />
          <Route path="rx" element={<PrescriptionPage />} />
          <Route path="me" element={<ProfilePage />} />
        </Route>
      </Routes>
      <DisclaimerModal />
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  )
}
