import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard.tsx'
import { AppLayout } from './components/Layout/AppLayout.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { DashboardPage } from './pages/DashboardPage.tsx'
import { PoisPage } from './pages/PoisPage.tsx'
import { CategoriesPage } from './pages/CategoriesPage.tsx'
import { TagsPage } from './pages/TagsPage.tsx'
import { IconsPage } from './pages/IconsPage.tsx'
import { BusinessesPage } from './pages/BusinessesPage.tsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="/pois" element={<PoisPage />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/tags" element={<TagsPage />} />
            <Route path="/icons" element={<IconsPage />} />
            <Route path="/businesses" element={<BusinessesPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
