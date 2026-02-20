import { createContext, useContext } from 'react'
import type { BusinessContextValue } from '../types/index.ts'

export type { BusinessContextValue }

const BusinessContext = createContext<BusinessContextValue | null>(null)

export function BusinessProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: BusinessContextValue
}) {
  return (
    <BusinessContext.Provider value={value}>
      {children}
    </BusinessContext.Provider>
  )
}

export function useBusinessContext(): BusinessContextValue {
  const ctx = useContext(BusinessContext)
  if (!ctx) throw new Error('useBusinessContext must be used inside BusinessProvider')
  return ctx
}
