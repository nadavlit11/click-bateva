import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const ALLOWED_ROLES = ['admin', 'crm_user']

export function AuthGuard() {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-400">
        טוען...
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-gray-500 gap-3">
        <p>אין לך הרשאה לגשת למערכת זו</p>
        <button
          onClick={() => window.location.href = 'https://click-bateva.web.app'}
          className="text-sm text-blue-600 hover:underline"
        >
          חזרה למפה
        </button>
      </div>
    )
  }

  return <Outlet />
}
