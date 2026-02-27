import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard.tsx'
import { AppLayout } from './components/Layout/AppLayout.tsx'

const LoginPage = lazy(() => import('./pages/LoginPage.tsx').then(m => ({ default: m.LoginPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage.tsx').then(m => ({ default: m.DashboardPage })))
const PoisPage = lazy(() => import('./pages/PoisPage.tsx').then(m => ({ default: m.PoisPage })))
const CategoriesPage = lazy(() => import('./pages/CategoriesPage.tsx').then(m => ({ default: m.CategoriesPage })))
const IconsPage = lazy(() => import('./pages/IconsPage.tsx').then(m => ({ default: m.IconsPage })))
const BusinessesPage = lazy(() => import('./pages/BusinessesPage.tsx').then(m => ({ default: m.BusinessesPage })))
const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage.tsx').then(m => ({ default: m.AnalyticsPage })))
const SubcategoriesPage = lazy(() => import('./pages/SubcategoriesPage.tsx').then(m => ({ default: m.SubcategoriesPage })))
const UsersPage = lazy(() => import('./pages/UsersPage.tsx').then(m => ({ default: m.UsersPage })))
const TravelAgentsPage = lazy(() => import('./pages/TravelAgentsPage.tsx').then(m => ({ default: m.TravelAgentsPage })))

const Loading = () => <div className="text-center py-10 text-gray-400">טוען...</div>

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AuthGuard />}>
            <Route element={<AppLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/pois" element={<PoisPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/icons" element={<IconsPage />} />
              <Route path="/businesses" element={<BusinessesPage />} />
              <Route path="/subcategories" element={<SubcategoriesPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/travel-agents" element={<TravelAgentsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
