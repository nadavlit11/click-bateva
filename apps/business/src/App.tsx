import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard.tsx'
import { AppLayout } from './components/Layout/AppLayout.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { ErrorPage } from './pages/ErrorPage.tsx'
import { PoisListPage } from './pages/PoisListPage.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/error" element={<ErrorPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route index element={<PoisListPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
