import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase.ts'

type Status = 'loading' | 'authorized' | 'unauthenticated' | 'unauthorized'

export function AuthGuard() {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      if (!user) { setStatus('unauthenticated'); return }
      try {
        const { claims } = await user.getIdTokenResult()
        const role = claims.role as string | undefined
        setStatus(role === 'admin' || role === 'content_manager' ? 'authorized' : 'unauthorized')
      } catch {
        setStatus('unauthenticated')
      }
    })
  }, [])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        טוען...
      </div>
    )
  }
  if (status === 'unauthenticated') return <Navigate to="/login" replace />
  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 text-sm">אין לך הרשאה לגשת ללוח הניהול.</p>
      </div>
    )
  }
  return <Outlet />
}
