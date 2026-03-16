import { type DependencyList, useEffect } from 'react'
import { authReady } from '../lib/firebase.ts'

/**
 * Like useEffect, but waits for Firebase auth to resolve before
 * running the effect. Return a cleanup function (e.g. onSnapshot
 * unsubscribe) and it will be called on unmount / dep change.
 */
export function useAuthEffect(
  effect: () => (() => void) | void,
  deps: DependencyList,
) {
  useEffect(() => {
    let cleanup: (() => void) | void
    let cancelled = false
    authReady.then(() => {
      if (cancelled) return
      cleanup = effect()
    })
    return () => { cancelled = true; cleanup?.() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
