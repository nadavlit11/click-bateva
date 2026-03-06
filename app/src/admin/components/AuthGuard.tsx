import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.ts'

export function AuthGuard() {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        טוען...
      </div>
    )
  }
  if (!user) return <Navigate to="/" replace />
  if (role !== 'admin' && role !== 'content_manager') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 text-sm">אין לך הרשאה לגשת ללוח הניהול.</p>
      </div>
    )
  }
  return <Outlet />
}
