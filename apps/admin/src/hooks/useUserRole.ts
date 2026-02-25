import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase.ts'

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, async user => {
      if (!user) { setRole(null); return }
      try {
        const { claims } = await user.getIdTokenResult()
        setRole((claims.role as string) ?? null)
      } catch {
        setRole(null)
      }
    })
  }, [])

  return role
}
