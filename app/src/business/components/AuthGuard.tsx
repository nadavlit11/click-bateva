import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase.ts'
import { reportError } from '../../lib/errorReporting.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import { BusinessProvider } from '../context/BusinessContext.tsx'
import type { BusinessContextValue, Business } from '../types/index.ts'

type Status = 'loading' | 'authorized' | 'unauthenticated' | 'unauthorized' | 'no_business'

export function AuthGuard() {
  const { user, loading } = useAuth()
  const [status, setStatus] = useState<Status>('loading')
  const [contextValue, setContextValue] = useState<BusinessContextValue | null>(null)

  useEffect(() => {
    if (loading) return

    let cancelled = false

    const check = async () => {
      if (!user) { if (!cancelled) setStatus('unauthenticated'); return }

      const { claims } = await user.getIdTokenResult(true)
      if (cancelled) return

      const role = claims.role as string | undefined
      if (role !== 'business_user') { setStatus('unauthorized'); return }

      const businessRef = claims.businessRef as string | undefined
      if (!businessRef) { setStatus('no_business'); return }

      const businessId = businessRef.split('/').pop()
      if (!businessId) { setStatus('no_business'); return }

      const bizSnap = await getDoc(doc(db, 'businesses', businessId))
      if (cancelled) return
      if (!bizSnap.exists()) { setStatus('no_business'); return }

      const bizData = bizSnap.data() as Business
      setContextValue({ businessId, businessName: bizData.name })
      setStatus('authorized')
    }

    check().catch(err => {
      if (!cancelled) {
        reportError(err, { source: 'AuthGuard.auth' })
        setStatus('unauthenticated')
      }
    })

    return () => { cancelled = true }
  }, [user, loading])

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        טוען...
      </div>
    )
  }
  if (status === 'unauthenticated') return <Navigate to="/" replace />
  if (status === 'unauthorized') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 text-sm">אין לך הרשאה לגשת לפורטל העסקים.</p>
      </div>
    )
  }
  if (status === 'no_business' || !contextValue) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-600 text-sm">לא נמצא עסק מקושר לחשבון זה. פנה למנהל.</p>
      </div>
    )
  }

  return (
    <BusinessProvider value={contextValue}>
      <Outlet />
    </BusinessProvider>
  )
}
