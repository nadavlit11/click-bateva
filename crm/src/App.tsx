import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { AuthGuard } from './components/AuthGuard'
import { CrmLayout } from './components/Layout/CrmLayout'

const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const ContactsPage = lazy(() => import('./pages/ContactsPage').then(m => ({ default: m.ContactsPage })))
const ContactDetailPage = lazy(() => import('./pages/ContactDetailPage').then(m => ({ default: m.ContactDetailPage })))
const TasksPage = lazy(() => import('./pages/TasksPage').then(m => ({ default: m.TasksPage })))
const MyTasksPage = lazy(() => import('./pages/MyTasksPage').then(m => ({ default: m.MyTasksPage })))
const CrmUsersPage = lazy(() => import('./pages/CrmUsersPage').then(m => ({ default: m.CrmUsersPage })))

function AdminOnlyRoute() {
  const { role } = useAuth()
  if (role === null) return null
  if (role !== 'admin') return <Navigate to="/" replace />
  return <Outlet />
}

const Loading = () => (
  <div className="text-center py-10 text-gray-400">טוען...</div>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route element={<AuthGuard />}>
              <Route element={<CrmLayout />}>
                <Route index element={<Navigate to="/my-tasks" replace />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="contacts/:id" element={<ContactDetailPage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="my-tasks" element={<MyTasksPage />} />
                <Route element={<AdminOnlyRoute />}>
                  <Route path="users" element={<CrmUsersPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
