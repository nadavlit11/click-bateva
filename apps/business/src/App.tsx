import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard.tsx'
import { AppLayout } from './components/Layout/AppLayout.tsx'

const LoginPage = lazy(() => import('./pages/LoginPage.tsx').then(m => ({ default: m.LoginPage })))
const ErrorPage = lazy(() => import('./pages/ErrorPage.tsx').then(m => ({ default: m.ErrorPage })))
const PoisListPage = lazy(() => import('./pages/PoisListPage.tsx').then(m => ({ default: m.PoisListPage })))
const PoiEditPage = lazy(() => import('./pages/PoiEditPage.tsx').then(m => ({ default: m.PoiEditPage })))

const Loading = () => <div className="text-center py-10 text-gray-400">טוען...</div>

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/error" element={<ErrorPage />} />
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route index element={<PoisListPage />} />
              <Route path="/pois/:poiId" element={<PoiEditPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
