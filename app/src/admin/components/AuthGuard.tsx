import { useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export function AuthGuard() {
  const { user, role, loading } = useAuth()

  useEffect(() => {
    if (!loading && user && role === 'crm_user') {
      window.location.href = 'https://click-bateva-crm.web.app'
    }
  }, [loading, user, role])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        טוען...
      </div>
    )
  }
  if (!user) return <Navigate to="/" replace />
  if (role === 'crm_user') {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-400 text-sm">
        מעביר ל-CRM...
      </div>
    )
  }
  if (role !== 'admin' && role !== 'content_manager') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 text-sm">אין לך הרשאה לגשת ללוח הניהול.</p>
      </div>
    )
  }
  return <Outlet />
}
