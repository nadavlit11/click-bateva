import { useState, useEffect } from 'react'
import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase.ts'
import { reportError } from '../lib/errorReporting.ts'
import { BusinessProvider } from '../context/BusinessContext.tsx'
import type { BusinessContextValue, Business } from '../types/index.ts'

type Status = 'loading' | 'authorized' | 'unauthenticated' | 'unauthorized' | 'no_business'

export function AuthGuard() {
  const [status, setStatus] = useState<Status>('loading')
  const [contextValue, setContextValue] = useState<BusinessContextValue | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      if (!user) {
        setStatus('unauthenticated')
        return
      }
      try {
        const { claims } = await user.getIdTokenResult(true)
        const role = claims.role as string | undefined

        if (role !== 'business_user') {
          setStatus('unauthorized')
          return
        }

        const businessRef = claims.businessRef as string | undefined
        if (!businessRef) {
          setStatus('no_business')
          navigate('/error', { replace: true })
          return
        }

        const businessId = businessRef.split('/').pop()
        if (!businessId) {
          setStatus('no_business')
          navigate('/error', { replace: true })
          return
        }

        const bizSnap = await getDoc(doc(db, 'businesses', businessId))
        if (!bizSnap.exists()) {
          setStatus('no_business')
          navigate('/error', { replace: true })
          return
        }

        const bizData = bizSnap.data() as Business
        setContextValue({ businessId, businessName: bizData.name })
        setStatus('authorized')
      } catch (err) {
        reportError(err, { source: 'AuthGuard.auth' })
        setStatus('unauthenticated')
      }
    })
  }, [navigate])

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
        <p className="text-red-600 text-sm">אין לך הרשאה לגשת לפורטל העסקים.</p>
      </div>
    )
  }
  if (status === 'no_business' || !contextValue) return null

  return (
    <BusinessProvider value={contextValue}>
      <Outlet />
    </BusinessProvider>
  )
}
