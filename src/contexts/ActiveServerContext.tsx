import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface ActiveServerContextType {
  /** Current active server signing_pubkey, or null when in Home (server list / settings). */
  activeSigningPubkey: string | null
}

const ActiveServerContext = createContext<ActiveServerContextType | null>(null)

export function ActiveServerProvider({ children }: { children: ReactNode }) {
  const [activeSigningPubkey, setActiveSigningPubkey] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ signing_pubkey?: string | null }>).detail
      setActiveSigningPubkey(detail?.signing_pubkey ?? null)
    }
    window.addEventListener('cordia:active-server-changed', handler)
    return () => window.removeEventListener('cordia:active-server-changed', handler)
  }, [])

  const value: ActiveServerContextType = { activeSigningPubkey }

  return (
    <ActiveServerContext.Provider value={value}>
      {children}
    </ActiveServerContext.Provider>
  )
}

export function useActiveServer() {
  const ctx = useContext(ActiveServerContext)
  if (!ctx) throw new Error('useActiveServer must be used within an ActiveServerProvider')
  return ctx
}
