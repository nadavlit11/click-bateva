import { Outlet } from 'react-router-dom'

// Phase 2.2 will add: if (!user) return <Navigate to="/login" />
export function AuthGuard() {
  return <Outlet />
}
