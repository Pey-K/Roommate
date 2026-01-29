import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface ActiveHouseContextType {
  /** Current active house signing_pubkey, or null when in neighborhood (house list / settings). */
  activeSigningPubkey: string | null
}

const ActiveHouseContext = createContext<ActiveHouseContextType | null>(null)

export function ActiveHouseProvider({ children }: { children: ReactNode }) {
  const [activeSigningPubkey, setActiveSigningPubkey] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ signing_pubkey?: string | null }>).detail
      setActiveSigningPubkey(detail?.signing_pubkey ?? null)
    }
    window.addEventListener('roommate:active-house-changed', handler)
    return () => window.removeEventListener('roommate:active-house-changed', handler)
  }, [])

  const value: ActiveHouseContextType = { activeSigningPubkey }

  return (
    <ActiveHouseContext.Provider value={value}>
      {children}
    </ActiveHouseContext.Provider>
  )
}

export function useActiveHouse() {
  const ctx = useContext(ActiveHouseContext)
  if (!ctx) throw new Error('useActiveHouse must be used within an ActiveHouseProvider')
  return ctx
}
